import {
  PDFDocument,
  PDFName,
  PDFString,
  PDFArray,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { addDays, format, getDay, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import type { StorefrontProduct, DeliveryDaysResponse } from "@/types";

// ─── Colors ──────────────────────────────────────────────────────────────────
const C_GREEN = rgb(0.176, 0.416, 0.306);
const C_GREEN_LIGHT = rgb(0.91, 0.97, 0.93);
const C_GREEN_TEXT = rgb(0.1, 0.34, 0.22);
const C_WHITE = rgb(1, 1, 1);
const C_DARK = rgb(0.07, 0.07, 0.07);
const C_GRAY = rgb(0.5, 0.5, 0.5);
const C_BORDER = rgb(0.88, 0.89, 0.9);
const C_ROW_EVEN = rgb(0.97, 0.985, 0.97);
const C_DELIVERY = rgb(0.18, 0.5, 0.32);
const C_NO_DELIVERY = rgb(0.94, 0.94, 0.94);
const C_NO_DELIVERY_TEXT = rgb(0.6, 0.6, 0.6);

// ─── Layout ───────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36;
const CW = PAGE_W - 2 * M;


// ─── Delivery calendar helper ─────────────────────────────────────────────────
function computeDeliveryDates(deliveryData: DeliveryDaysResponse | null) {
  const deliveryDows = new Set<number>();
  if (deliveryData?.zones) {
    for (const zone of deliveryData.zones) {
      for (const day of zone.days) deliveryDows.add(day.dayOfWeek);
    }
  }
  const today = startOfDay(new Date());
  return Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i + 1);
    const dow = (getDay(date) + 6) % 7; // 0=Mon
    return {
      date,
      hasDelivery: deliveryDows.has(dow),
      dayShort: format(date, "EEE", { locale: it }).slice(0, 3).toUpperCase(),
      dayNum: format(date, "d"),
      monthShort: format(date, "MMM", { locale: it }),
      full: format(date, "EEEE d MMMM", { locale: it }),
    };
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface OrderFormConfig {
  company: { id: string; name: string; description?: string };
  products: StorefrontProduct[];
  vendorEmail: string;
  deliveryData: DeliveryDaysResponse | null;
  baseUrl: string;
}

export async function buildOrderFormPDF(
  catalogBytes: ArrayBuffer,
  config: OrderFormConfig,
): Promise<Uint8Array> {
  const { company, products, vendorEmail, deliveryData, baseUrl } = config;
  const validProducts = products.filter((p) => p.stocks[0]);

  const pdfDoc = await PDFDocument.load(catalogBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  // Pre-initialize the default font and set form-level /DA.
  // This is required when loading an external PDF (e.g. from react-pdf):
  // without a /DA entry on the AcroForm, pdf-lib throws "No /DA entry found"
  // during any appearance-related operation on form fields.
  const defaultFont = form.getDefaultFont();
  const FIELD_DA = `0 g\n/${defaultFont.name} 0 Tf`;
  // Set /DA on the AcroForm dict directly (PDFAcroForm doesn't inherit setDefaultAppearance)
  form.acroForm.dict.set(PDFName.of("DA"), PDFString.of(FIELD_DA));

  // Helper: create a text field with DA pre-set to avoid MissingDAEntryError
  const makeField = (name: string) => {
    const f = form.createTextField(name);
    f.acroField.setDefaultAppearance(FIELD_DA);
    return f;
  };
  const makeDropdown = (name: string) => {
    const f = form.createDropdown(name);
    f.acroField.setDefaultAppearance(FIELD_DA);
    return f;
  };

  // Column definitions for product table
  const COL = {
    name:  { x: M,              w: CW * 0.40 },
    cat:   { x: M + CW * 0.40, w: CW * 0.16 },
    price: { x: M + CW * 0.56, w: CW * 0.14 },
    qty:   { x: M + CW * 0.70, w: CW * 0.10 },
    total: { x: M + CW * 0.80, w: CW * 0.20 },
  };

  const ROW_H = validProducts.length > 22 ? 14 : validProducts.length > 15 ? 16 : 18;

  // Build JS price map keyed by stockId for auto-calculation
  const priceMap: Record<string, number> = {};
  validProducts.forEach((p) => { priceMap[p.stocks[0]!.id] = p.stocks[0]!.price; });
  const allStockIds = validProducts.map((p) => p.stocks[0]!.id);

  const calcJS = (stockId: string, price: number) =>
    `if(event.willCommit){` +
    `var q=parseFloat(event.value)||0;` +
    `var r=q*${price};` +
    `try{event.target.doc.getField("total_${stockId}").value=q>0?"\\u20AC "+r.toFixed(2):"";}catch(e){}` +
    `var g=0;` +
    allStockIds.map((sid) => `try{g+=(parseFloat(event.target.doc.getField("qty_${sid}").value)||0)*${priceMap[sid]};}catch(e){}`).join("") +
    `try{event.target.doc.getField("grand_total").value=g>0?"\\u20AC "+g.toFixed(2):"";}catch(e){}` +
    `}`;

  // ─── Add order form page ──────────────────────────────────────────────────
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const today = format(new Date(), "d MMMM yyyy", { locale: it });
  let cur = PAGE_H - M;

  // ══ HEADER ════════════════════════════════════════════════════════════════
  const HDR_H = 44;
  page.drawRectangle({ x: M, y: cur - HDR_H, width: CW, height: HDR_H, color: C_GREEN });
  page.drawText("MODULO D\u2019ORDINE", { x: M + 12, y: cur - 18, size: 13, font: bold, color: C_WHITE });
  page.drawText(company.name, { x: M + 12, y: cur - 32, size: 8.5, font, color: rgb(0.78, 0.93, 0.83) });
  const dl = `Generato il ${today}`;
  page.drawText(dl, { x: PAGE_W - M - bold.widthOfTextAtSize(dl, 7.5) - 8, y: cur - 26, size: 7.5, font, color: rgb(0.78, 0.93, 0.83) });
  cur -= HDR_H + 14;

  // ══ PRODUCTS TABLE ════════════════════════════════════════════════════════
  const TBL_HDR_H = 16;
  page.drawRectangle({ x: M, y: cur - TBL_HDR_H, width: CW, height: TBL_HDR_H, color: C_GREEN });
  const hY = cur - TBL_HDR_H + 4;
  page.drawText("PRODOTTO",  { x: COL.name.x + 4,  y: hY, size: 7, font: bold, color: C_WHITE });
  page.drawText("CATEGORIA", { x: COL.cat.x + 3,   y: hY, size: 7, font: bold, color: C_WHITE });
  page.drawText("PREZZO/U",  { x: COL.price.x + 3, y: hY, size: 7, font: bold, color: C_WHITE });
  page.drawText("QUANTIT\u00C0", { x: COL.qty.x + 3, y: hY, size: 7, font: bold, color: C_WHITE });
  page.drawText("TOTALE",    { x: COL.total.x + 3, y: hY, size: 7, font: bold, color: C_WHITE });
  cur -= TBL_HDR_H;

  for (let i = 0; i < validProducts.length; i++) {
    const product = validProducts[i]!;
    const stock = product.stocks[0]!;
    const bg = i % 2 === 0 ? C_ROW_EVEN : C_WHITE;

    page.drawRectangle({ x: M, y: cur - ROW_H, width: CW, height: ROW_H, color: bg });
    page.drawLine({ start: { x: M, y: cur - ROW_H }, end: { x: M + CW, y: cur - ROW_H }, thickness: 0.25, color: C_BORDER });

    const rY = cur - ROW_H + (ROW_H - 7) / 2;

    // Product name (truncate if needed)
    const maxNW = COL.name.w - (product.isOrganic ? 30 : 8);
    let name = product.name;
    while (font.widthOfTextAtSize(name, 7.5) > maxNW && name.length > 1) name = name.slice(0, -1);
    if (name !== product.name) name = name.slice(0, -1) + "\u2026";
    page.drawText(name, { x: COL.name.x + 4, y: rY, size: 7.5, font: bold, color: C_DARK });

    // Inline BIO badge
    if (product.isOrganic) {
      const nx = COL.name.x + 4 + bold.widthOfTextAtSize(name, 7.5) + 4;
      page.drawRectangle({ x: nx, y: rY - 1, width: 16, height: 8, color: C_GREEN_LIGHT });
      page.drawText("BIO", { x: nx + 2, y: rY + 0.5, size: 5.5, font: bold, color: C_GREEN_TEXT });
    }

    // Category (truncated)
    let cat = product.category ?? "\u2014";
    while (font.widthOfTextAtSize(cat, 7) > COL.cat.w - 6 && cat.length > 1) cat = cat.slice(0, -1);
    if (cat !== (product.category ?? "\u2014")) cat = cat.slice(0, -1) + "\u2026";
    page.drawText(cat, { x: COL.cat.x + 3, y: rY, size: 7, font, color: C_GRAY });

    // Price
    const unit = product.unitOfMeasure ? `/${product.unitOfMeasure}` : "";
    page.drawText(`\u20AC ${stock.price.toFixed(2)}${unit}`, { x: COL.price.x + 3, y: rY, size: 7.5, font: bold, color: C_DARK });

    // Qty field keyed by stockId for backend matching
    const qtyField = makeField(`qty_${stock.id}`);
    qtyField.setText("");
    qtyField.setAlignment(TextAlignment.Center);
    qtyField.addToPage(page, {
      x: COL.qty.x + 3, y: cur - ROW_H + 2,
      width: COL.qty.w - 6, height: ROW_H - 4,
      borderWidth: 1, borderColor: C_GREEN, backgroundColor: C_WHITE, textColor: C_DARK,
    });
    qtyField.acroField.dict.set(
      PDFName.of("AA"),
      pdfDoc.context.obj({ K: { Type: "Action", S: "JavaScript", JS: PDFString.of(calcJS(stock.id, stock.price)) } }),
    );

    // Total field (read-only, filled by JS)
    const totalField = makeField(`total_${stock.id}`);
    totalField.setText("");
    totalField.enableReadOnly();
    totalField.setAlignment(TextAlignment.Right);
    totalField.addToPage(page, {
      x: COL.total.x + 3, y: cur - ROW_H + 2,
      width: COL.total.w - 6, height: ROW_H - 4,
      borderWidth: 0, backgroundColor: bg, textColor: C_GREEN_TEXT,
    });

    cur -= ROW_H;
  }

  // Grand total row
  const GT_H = 18;
  page.drawRectangle({ x: M, y: cur - GT_H, width: CW, height: GT_H, color: C_GREEN_LIGHT });
  page.drawLine({ start: { x: M, y: cur }, end: { x: M + CW, y: cur }, thickness: 1, color: C_GREEN });
  page.drawLine({ start: { x: M, y: cur - GT_H }, end: { x: M + CW, y: cur - GT_H }, thickness: 1, color: C_GREEN });
  page.drawText("TOTALE ORDINE", { x: M + 4, y: cur - GT_H + 5, size: 8, font: bold, color: C_GREEN });

  const grandTotalField = makeField("grand_total");
  grandTotalField.setText("");
  grandTotalField.enableReadOnly();
  grandTotalField.setAlignment(TextAlignment.Right);
  grandTotalField.addToPage(page, {
    x: COL.total.x + 3, y: cur - GT_H + 2,
    width: COL.total.w - 6, height: GT_H - 4,
    borderWidth: 0, backgroundColor: C_GREEN_LIGHT, textColor: C_GREEN,
  });
  cur -= GT_H + 14;

  // ══ CUSTOMER INFO ═════════════════════════════════════════════════════════
  page.drawText("DATI CLIENTE", { x: M, y: cur, size: 8.5, font: bold, color: C_GREEN });
  cur -= 12;

  const FIELD_H = 20;
  const HALF = (CW - 10) / 2;

  const customerFields = [
    { name: "nome",     label: "Nome e Cognome *",          x: M,           w: HALF },
    { name: "telefono", label: "Telefono *",                 x: M + HALF + 10, w: HALF },
    { name: "email_cliente", label: "Email",                  x: M,           w: HALF },
    { name: "localita", label: "CAP / Citt\u00E0 / Indirizzo", x: M + HALF + 10, w: HALF },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const f = customerFields[row * 2 + col]!;
      page.drawText(f.label, { x: f.x, y: cur - 7, size: 6.5, font, color: C_GRAY });
      const tf = makeField(f.name);
      tf.addToPage(page, {
        x: f.x, y: cur - FIELD_H - 9,
        width: f.w, height: FIELD_H,
        borderWidth: 1, borderColor: C_BORDER, backgroundColor: C_WHITE, textColor: C_DARK,
      });
    }
    cur -= FIELD_H + 9 + 10;
  }

  // Notes
  page.drawText("Note / Indicazioni per la consegna", { x: M, y: cur - 7, size: 6.5, font, color: C_GRAY });
  const noteField = makeField("note");
  noteField.enableMultiline();
  noteField.addToPage(page, {
    x: M, y: cur - 38, width: CW, height: 30,
    borderWidth: 1, borderColor: C_BORDER, backgroundColor: C_WHITE, textColor: C_DARK,
  });
  cur -= 38 + 12;

  // ══ DELIVERY DATE DROPDOWN ════════════════════════════════════════════════
  const deliveryDates14 = computeDeliveryDates(deliveryData);
  const availableDates = deliveryDates14.filter((d) => d.hasDelivery);

  page.drawText("DATA DI CONSEGNA DESIDERATA", { x: M, y: cur, size: 8.5, font: bold, color: C_GREEN });
  cur -= 12;

  if (availableDates.length > 0) {
    const options = availableDates.map(
      (d) => d.full.charAt(0).toUpperCase() + d.full.slice(1),
    );
    const dropdown = makeDropdown("delivery_date");
    dropdown.addOptions(options);
    dropdown.select(options[0]!);
    dropdown.addToPage(page, {
      x: M, y: cur - 20, width: CW * 0.6, height: 20,
      borderWidth: 1, borderColor: C_GREEN, backgroundColor: C_WHITE, textColor: C_DARK,
    });
    cur -= 20 + 14;
  } else {
    page.drawText("Contattare il venditore per concordare la data di consegna.", {
      x: M, y: cur - 10, size: 8, font, color: C_GRAY,
    });
    cur -= 22;
  }

  // ══ SUBMIT BUTTON (PDF SubmitForm action) ═══════════════════════════════
  const BTN_W = 260;
  const BTN_H = 28;
  const submitUrl = `${baseUrl}/api/storefront/${company.id}/guest-order`;

  page.drawRectangle({ x: M, y: cur - BTN_H, width: BTN_W, height: BTN_H, color: C_GREEN });
  const btnLabel = ">> INVIA ORDINE";
  page.drawText(btnLabel, {
    x: M + (BTN_W - bold.widthOfTextAtSize(btnLabel, 9)) / 2,
    y: cur - BTN_H + (BTN_H - 9) / 2,
    size: 9, font: bold, color: C_WHITE,
  });

  // PDF SubmitForm action: Flags=6 → bit 2 (HTML form) + bit 3 (GET→0, POST→0 is default POST)
  const submitAction = pdfDoc.context.obj({
    Type: "Action",
    S: "SubmitForm",
    F: PDFString.of(submitUrl),
    Flags: 6,
  });

  // Create a link annotation with the SubmitForm action over the button area
  const submitAnnotRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [M, cur - BTN_H, M + BTN_W, cur],
      Border: [0, 0, 0],
      A: submitAction,
    }),
  );
  const annotsKey = PDFName.of("Annots");
  const existingAnnots = page.node.get(annotsKey);
  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(submitAnnotRef);
  } else {
    page.node.set(annotsKey, pdfDoc.context.obj([submitAnnotRef]));
  }

  page.drawText("Invia direttamente l'ordine al venditore (richiede Adobe Acrobat)", {
    x: M, y: cur - BTN_H - 10, size: 6.5, font, color: C_GRAY,
  });
  cur -= BTN_H + 22;

  // ══ DIVIDER ═══════════════════════════════════════════════════════════════
  page.drawLine({ start: { x: M, y: cur }, end: { x: M + CW, y: cur }, thickness: 0.5, color: C_BORDER });
  cur -= 12;

  // ══ DELIVERY CALENDAR ═════════════════════════════════════════════════════
  page.drawText("CALENDARIO CONSEGNE \u2014 prossime 2 settimane", {
    x: M, y: cur, size: 8.5, font: bold, color: C_GREEN,
  });
  cur -= 10;

  const CELL_W = CW / 7;
  // Use remaining space minus footer (M+18)
  const calAvail = cur - (M + 18) - 14;
  const CELL_H = Math.min(42, Math.floor(calAvail / 2) - 4);

  const week1 = deliveryDates14.slice(0, 7);
  const week2 = deliveryDates14.slice(7, 14);

  for (let w = 0; w < 2; w++) {
    const week = w === 0 ? week1 : week2;
    const weekTopY = cur - w * (CELL_H + 5);

    for (let d = 0; d < 7; d++) {
      const day = week[d];
      if (!day) continue;

      const cellX = M + d * CELL_W;
      const cellY = weekTopY - CELL_H;
      const isDelivery = day.hasDelivery;

      page.drawRectangle({
        x: cellX + 1, y: cellY, width: CELL_W - 2, height: CELL_H,
        color: isDelivery ? C_DELIVERY : C_NO_DELIVERY,
      });

      const fg = isDelivery ? C_WHITE : C_NO_DELIVERY_TEXT;
      const fgSub = isDelivery ? rgb(0.78, 0.93, 0.83) : rgb(0.7, 0.7, 0.7);

      // Day name
      const ds = day.dayShort;
      page.drawText(ds, {
        x: cellX + (CELL_W - bold.widthOfTextAtSize(ds, 6.5)) / 2,
        y: weekTopY - 9, size: 6.5, font: bold, color: fgSub,
      });

      // Day number
      const dn = day.dayNum;
      const numSz = CELL_H > 34 ? 14 : 11;
      page.drawText(dn, {
        x: cellX + (CELL_W - bold.widthOfTextAtSize(dn, numSz)) / 2,
        y: cellY + CELL_H * 0.28, size: numSz, font: bold, color: fg,
      });

      // Month
      const ms = day.monthShort;
      page.drawText(ms, {
        x: cellX + (CELL_W - font.widthOfTextAtSize(ms, 6)) / 2,
        y: cellY + 3, size: 6, font, color: fgSub,
      });
    }
  }

  // ══ FOOTER ════════════════════════════════════════════════════════════════
  page.drawLine({ start: { x: M, y: M + 18 }, end: { x: M + CW, y: M + 18 }, thickness: 0.3, color: C_BORDER });
  page.drawText(`${company.name} \u00B7 Modulo d\u2019ordine \u00B7 ${today}`, {
    x: M, y: M + 7, size: 6.5, font, color: C_GRAY,
  });
  const contactLabel = `Contatti: ${vendorEmail}`;
  page.drawText(contactLabel, {
    x: PAGE_W - M - font.widthOfTextAtSize(contactLabel, 6.5),
    y: M + 7, size: 6.5, font, color: C_GRAY,
  });

  return pdfDoc.save();
}
