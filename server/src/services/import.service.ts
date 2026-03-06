import * as XLSX from "xlsx";
import OpenAI from "openai";
import prisma from "../lib/prisma.js";
import { config } from "../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

interface ExtractedProduct {
  name: string;
  category?: string;
  unitOfMeasure?: string;
  price: number;
  isOrganic: boolean;
  isNew: boolean;
  isPromotional: boolean;
  lowStock: boolean;
  producer?: string;
}

export async function processImport(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  companyId: string,
  warehouseId: string,
  userId: string
): Promise<{ importLogId: string; productsCreated: number }> {
  const importLog = await prisma.importLog.create({
    data: {
      fileName,
      fileType,
      status: "processing",
      companyId,
      userId,
    },
  });

  try {
    let products: ExtractedProduct[];

    if (fileType === "pdf") {
      products = await extractFromPdf(fileBuffer, fileName);
    } else {
      products = extractFromSpreadsheet(fileBuffer);
    }

    let created = 0;
    await prisma.$transaction(async (tx) => {
      for (const p of products) {
        const product = await tx.product.create({
          data: {
            name: p.name,
            category: p.category,
            unitOfMeasure: p.unitOfMeasure,
            isOrganic: p.isOrganic,
            producer: p.producer,
            companyId,
          },
        });

        await tx.stock.create({
          data: {
            productId: product.id,
            warehouseId,
            quantity: 0,
            price: p.price,
            isNew: p.isNew,
            isPromotional: p.isPromotional,
            lowStock: p.lowStock,
          },
        });

        created++;
      }
    });

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: { status: "completed" },
    });

    return { importLogId: importLog.id, productsCreated: created };
  } catch (error: any) {
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: { status: "failed", error: error.message },
    });
    throw error;
  }
}

function extractFromSpreadsheet(buffer: Buffer): ExtractedProduct[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Try parsing with default headers first
  let rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  // Check if the first row has the actual column names (e.g., "PRODOTTO")
  // If not, the header row might be offset - scan for it
  const hasProductCol = rows.some(
    (r) => r["PRODOTTO"] || r["prodotto"] || r["Nome"] || r["name"]
  );

  if (!hasProductCol) {
    // Try reading raw rows to find the header row
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i];
      if (
        Array.isArray(row) &&
        row.some(
          (cell) =>
            typeof cell === "string" &&
            cell.trim().toUpperCase() === "PRODOTTO"
        )
      ) {
        headerRowIdx = i;
        break;
      }
    }
    // Re-parse with the correct header row
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      range: headerRowIdx,
    });
  }

  const products: ExtractedProduct[] = [];

  // Helper to find a value by fuzzy key matching (handles trailing spaces, slashes)
  function getVal(row: Record<string, any>, ...keys: string[]): any {
    // First try exact keys
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k];
    }
    // Then try trimmed key matching
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const normalized = k.trim().toUpperCase().replace(/\s+/g, " ");
      const found = rowKeys.find(
        (rk) => rk.trim().toUpperCase().replace(/\s+/g, " ") === normalized
      );
      if (found && row[found] !== undefined && row[found] !== null)
        return row[found];
    }
    return undefined;
  }

  for (const row of rows) {
    const name = getVal(row, "PRODOTTO", "prodotto", "Nome", "name");
    if (!name || typeof name !== "string" || name.trim() === "") continue;

    const priceRaw = getVal(row, "€", "PREZZO", "prezzo", "price") ?? 0;
    const price =
      typeof priceRaw === "number"
        ? priceRaw
        : parseFloat(String(priceRaw).replace(",", ".")) || 0;

    if (price === 0) continue;

    const um = getVal(row, "UM", "um", "Unita") ?? "";
    const bio = getVal(row, "BIO", "bio") ?? "";
    const novita = getVal(row, "NOVITA'", "NOVITA", "novita") ?? "";
    const promo = getVal(row, "PROMO", "promo") ?? "";
    const pocaDisp = getVal(row, "POCA DISP", "POCA DISP.", "poca disp") ?? "";
    const producer =
      getVal(row, "PRODUTTORE/ORIGINE", "PRODUTTORE/ ORIGINE", "PRODUTTORE", "produttore") ?? "";

    products.push({
      name: String(name).trim(),
      unitOfMeasure: um ? String(um).trim() : undefined,
      price,
      isOrganic: isTruthy(bio),
      isNew: isTruthy(novita),
      isPromotional: isTruthy(promo),
      lowStock: isTruthy(pocaDisp),
      producer: producer ? String(producer).trim() : undefined,
    });
  }

  return products;
}

function isTruthy(val: any): boolean {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return (
    s === "si" ||
    s === "s" ||
    s === "x" ||
    s === "1" ||
    s === "true" ||
    s === "yes" ||
    s === "y" ||
    s === "bio"
  );
}

async function extractFromPdf(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedProduct[]> {
  // Upload file to OpenAI first, then reference it in chat completion
  const file = await openai.files.create({
    file: new File([buffer], fileName, { type: "application/pdf" }),
    purpose: "assistants",
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a product data extraction assistant. Extract all products from the provided price list document.
Return a JSON array where each element has:
- name (string, required): product name
- price (number, required): price in euros
- unitOfMeasure (string, optional): e.g., "KG", "PZ", "conf"
- category (string, optional): product category if discernible
- isOrganic (boolean): true if marked as organic/bio
- isNew (boolean): true if marked as new
- isPromotional (boolean): true if marked as promotional
- lowStock (boolean): true if marked as low availability
- producer (string, optional): producer or origin if listed

Return ONLY the JSON array, no markdown fences, no explanation.`,
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: { file_id: file.id },
            },
            {
              type: "text",
              text: "Extract all products from this price list. Return a JSON array.",
            },
          ] as any,
        },
      ],
      temperature: 0,
      max_tokens: 16000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ExtractedProduct[];

    return parsed
      .filter((p) => p.name && typeof p.price === "number")
      .map((p) => ({
        name: p.name.trim(),
        price: p.price,
        unitOfMeasure: p.unitOfMeasure || undefined,
        category: p.category || undefined,
        isOrganic: p.isOrganic || false,
        isNew: p.isNew || false,
        isPromotional: p.isPromotional || false,
        lowStock: p.lowStock || false,
        producer: p.producer || undefined,
      }));
  } finally {
    // Clean up uploaded file
    await openai.files.delete(file.id).catch(() => {});
  }
}
