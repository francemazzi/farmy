import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";
import { sendGuestOrderNotification } from "../lib/email.js";

export async function storefrontRoutes(app: FastifyInstance) {
  app.get("/:companyId", {
    preHandler: [authenticate],
    schema: { tags: ["Storefront"] },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, description: true },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });

      const products = await prisma.product.findMany({
        where: { companyId },
        include: {
          stocks: {
            where: { quantity: { gt: 0 } },
            select: {
              id: true,
              price: true,
              quantity: true,
              isNew: true,
              isPromotional: true,
              lowStock: true,
              warehouse: { select: { name: true } },
            },
          },
        },
      });

      const availableProducts = products.filter((p) => p.stocks.length > 0);

      return reply.send({ company, products: availableProducts });
    },
  });

  const dayNames = [
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
    "Domenica",
  ];

  app.get("/:companyId/delivery-days", {
    preHandler: [authenticate],
    schema: {
      tags: ["Storefront"],
      querystring: {
        type: "object",
        properties: {
          zipCode: { type: "string" },
          city: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { zipCode, city } = request.query as {
        zipCode?: string;
        city?: string;
      };

      if (!zipCode && !city) {
        return reply
          .status(400)
          .send({ error: "Provide zipCode or city query parameter" });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });

      const calendars = await prisma.shipCalendar.findMany({
        where: { companyId, active: true },
        include: {
          deliveryZones: {
            include: { deliverySlots: { orderBy: { dayOfWeek: "asc" } } },
          },
        },
      });

      const zones: Array<{
        zoneId: string;
        zoneName: string;
        calendarName: string;
        days: Array<{
          dayOfWeek: number;
          dayName: string;
          cutoffHours: number;
        }>;
      }> = [];

      const normalizedZip = zipCode?.trim().toLowerCase() || "";
      const normalizedCity = city?.trim().toLowerCase() || "";

      for (const cal of calendars) {
        for (const zone of cal.deliveryZones) {
          const zoneZips = zone.zipCodes
            .split(",")
            .map((z) => z.trim().toLowerCase())
            .filter(Boolean);
          const zoneCities = zone.cities
            .split(",")
            .map((c) => c.trim().toLowerCase())
            .filter(Boolean);

          const matchesZip = normalizedZip && zoneZips.includes(normalizedZip);
          const matchesCity =
            normalizedCity && zoneCities.includes(normalizedCity);

          if (matchesZip || matchesCity) {
            zones.push({
              zoneId: zone.id,
              zoneName: zone.name,
              calendarName: cal.name,
              days: zone.deliverySlots.map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                dayName: dayNames[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`,
                cutoffHours: slot.cutoffHours,
              })),
            });
          }
        }
      }

      return reply.send({ zones });
    },
  });

  // Public endpoint: receive guest order from PDF SubmitForm (no auth required)
  app.post("/:companyId/guest-order", {
    schema: { tags: ["Storefront"] },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { user: { select: { email: true } } },
      });
      if (!company) {
        return reply.type("text/html").status(404).send(errorPage("Azienda non trovata."));
      }

      const body = request.body as Record<string, string>;

      const guestName = (body.nome ?? "").trim();
      const guestPhone = (body.telefono ?? "").trim();
      const guestEmail = (body.email_cliente ?? "").trim();
      const guestAddress = (body.localita ?? "").trim();
      const notes = (body.note ?? "").trim();
      const deliveryDateStr = (body.delivery_date ?? "").trim();

      if (!guestName) {
        return reply.type("text/html").status(400).send(errorPage("Il campo Nome e Cognome è obbligatorio."));
      }

      // Collect qty_<stockId> fields
      const qtyEntries: Array<{ stockId: string; quantity: number }> = [];
      for (const [key, val] of Object.entries(body)) {
        if (key.startsWith("qty_") && val) {
          const q = parseFloat(val);
          if (q > 0) {
            qtyEntries.push({ stockId: key.slice(4), quantity: q });
          }
        }
      }

      if (qtyEntries.length === 0) {
        return reply.type("text/html").status(400).send(errorPage("Nessun prodotto selezionato."));
      }

      // Load stocks and validate
      const stockIds = qtyEntries.map((e) => e.stockId);
      const stocks = await prisma.stock.findMany({
        where: { id: { in: stockIds } },
        include: { product: true },
      });

      if (stocks.length !== stockIds.length) {
        return reply.type("text/html").status(400).send(errorPage("Alcuni prodotti non sono più disponibili."));
      }

      // Build order items with server-side prices
      let totalAmount = 0;
      const orderItems = qtyEntries.map((entry) => {
        const stock = stocks.find((s) => s.id === entry.stockId)!;
        const totalPrice = stock.price * entry.quantity;
        totalAmount += totalPrice;
        return {
          productId: stock.productId,
          stockId: entry.stockId,
          quantity: entry.quantity,
          unitPrice: stock.price,
          totalPrice,
        };
      });

      // Parse delivery date (Italian format from dropdown, e.g. "Lunedì 10 marzo")
      let deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7); // fallback: 1 week from now
      if (deliveryDateStr) {
        const parsed = parseItalianDate(deliveryDateStr);
        if (parsed) deliveryDate = parsed;
      }

      const order = await prisma.order.create({
        data: {
          companyId,
          status: "PENDING",
          paymentMethod: "CASH",
          deliveryDate,
          totalAmount,
          notes: notes || undefined,
          guestName,
          guestEmail: guestEmail || undefined,
          guestPhone: guestPhone || undefined,
          guestAddress: guestAddress || undefined,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });

      // Send email notification to vendor (fire-and-forget)
      sendGuestOrderNotification({
        vendorEmail: company.user.email,
        vendorName: company.name,
        orderId: order.id,
        guestName,
        guestEmail,
        guestPhone,
        guestAddress,
        deliveryDate: deliveryDate.toLocaleDateString("it-IT"),
        totalAmount,
        items: order.items.map((i) => ({
          productName: i.product?.name ?? i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
        notes,
      }).catch((err) => console.error("[email] Failed to send notification:", err));

      return reply.type("text/html").status(200).send(successPage(order.id, company.name, totalAmount));
    },
  });
}

function errorPage(message: string) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Errore ordine</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fef2f2;}
.card{background:#fff;border-radius:12px;padding:32px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{color:#dc2626;font-size:1.25rem;}p{color:#666;}</style></head>
<body><div class="card"><h1>Errore</h1><p>${message}</p><p style="margin-top:16px;font-size:.85rem;color:#999;">Riprova o contatta il venditore.</p></div></body></html>`;
}

function successPage(orderId: string, companyName: string, total: number) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ordine ricevuto!</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0fdf4;}
.card{background:#fff;border-radius:12px;padding:32px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{color:#16a34a;font-size:1.5rem;}p{color:#444;line-height:1.5;}.id{font-family:monospace;background:#f0fdf4;padding:4px 8px;border-radius:4px;font-size:.85rem;}</style></head>
<body><div class="card"><h1>Ordine ricevuto!</h1>
<p>Grazie per il tuo ordine con <strong>${companyName}</strong>.</p>
<p>Totale: <strong>&euro;${total.toFixed(2)}</strong></p>
<p>Il venditore è stato notificato e ti contatterà presto per confermare la consegna.</p>
<p class="id">Rif: ${orderId.slice(-8)}</p></div></body></html>`;
}

function parseItalianDate(str: string): Date | null {
  const months: Record<string, number> = {
    gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
    luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
  };
  const match = str.match(/(\d{1,2})\s+(\w+)/);
  if (!match) return null;
  const day = parseInt(match[1]!, 10);
  const monthName = match[2]!.toLowerCase();
  const month = months[monthName];
  if (month === undefined) return null;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day);
  if (candidate < now) candidate.setFullYear(year + 1);
  return candidate;
}
