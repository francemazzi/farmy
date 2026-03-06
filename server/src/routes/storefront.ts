import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

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
}
