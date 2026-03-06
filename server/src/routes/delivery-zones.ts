import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function deliveryZoneRoutes(app: FastifyInstance) {
  app.get("/ship-calendars/:shipCalendarId/zones", {
    preHandler: [authenticate],
    schema: { tags: ["DeliveryZones"] },
    handler: async (request, reply) => {
      const { shipCalendarId } = request.params as {
        shipCalendarId: string;
      };
      const calendar = await prisma.shipCalendar.findUnique({
        where: { id: shipCalendarId },
        include: { company: true },
      });
      if (!calendar)
        return reply.status(404).send({ error: "Calendar not found" });
      if (calendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const zones = await prisma.deliveryZone.findMany({
        where: { shipCalendarId },
        include: { _count: { select: { deliverySlots: true } } },
      });
      return reply.send(zones);
    },
  });

  app.post("/ship-calendars/:shipCalendarId/zones", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["DeliveryZones"],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          zipCodes: { type: "string" },
          cities: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { shipCalendarId } = request.params as {
        shipCalendarId: string;
      };
      const { name, zipCodes, cities } = request.body as {
        name: string;
        zipCodes?: string;
        cities?: string;
      };
      const calendar = await prisma.shipCalendar.findUnique({
        where: { id: shipCalendarId },
        include: { company: true },
      });
      if (!calendar)
        return reply.status(404).send({ error: "Calendar not found" });
      if (calendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const zone = await prisma.deliveryZone.create({
        data: {
          name,
          zipCodes: zipCodes ?? "",
          cities: cities ?? "",
          shipCalendarId,
        },
      });
      return reply.status(201).send(zone);
    },
  });

  app.get("/zones/:id", {
    preHandler: [authenticate],
    schema: { tags: ["DeliveryZones"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const zone = await prisma.deliveryZone.findUnique({
        where: { id },
        include: {
          shipCalendar: { include: { company: true } },
          deliverySlots: true,
        },
      });
      if (!zone)
        return reply.status(404).send({ error: "Zone not found" });
      if (zone.shipCalendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      return reply.send(zone);
    },
  });

  app.put("/zones/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["DeliveryZones"],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          zipCodes: { type: "string" },
          cities: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, zipCodes, cities } = request.body as {
        name?: string;
        zipCodes?: string;
        cities?: string;
      };
      const zone = await prisma.deliveryZone.findUnique({
        where: { id },
        include: { shipCalendar: { include: { company: true } } },
      });
      if (!zone)
        return reply.status(404).send({ error: "Zone not found" });
      if (zone.shipCalendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.deliveryZone.update({
        where: { id },
        data: { name, zipCodes, cities },
      });
      return reply.send(updated);
    },
  });

  app.delete("/zones/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["DeliveryZones"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const zone = await prisma.deliveryZone.findUnique({
        where: { id },
        include: { shipCalendar: { include: { company: true } } },
      });
      if (!zone)
        return reply.status(404).send({ error: "Zone not found" });
      if (zone.shipCalendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.deliveryZone.delete({ where: { id } });
      return reply.send({ message: "Zone deleted" });
    },
  });
}
