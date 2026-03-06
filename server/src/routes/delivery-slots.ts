import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function deliverySlotRoutes(app: FastifyInstance) {
  app.get("/zones/:deliveryZoneId/slots", {
    preHandler: [authenticate],
    schema: { tags: ["DeliverySlots"] },
    handler: async (request, reply) => {
      const { deliveryZoneId } = request.params as {
        deliveryZoneId: string;
      };
      const zone = await prisma.deliveryZone.findUnique({
        where: { id: deliveryZoneId },
        include: { shipCalendar: { include: { company: true } } },
      });
      if (!zone)
        return reply.status(404).send({ error: "Zone not found" });
      if (zone.shipCalendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const slots = await prisma.deliverySlot.findMany({
        where: { deliveryZoneId },
        orderBy: { dayOfWeek: "asc" },
      });
      return reply.send(slots);
    },
  });

  app.post("/zones/:deliveryZoneId/slots", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["DeliverySlots"],
      body: {
        type: "object",
        required: ["dayOfWeek"],
        properties: {
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
          cutoffHours: { type: "integer", minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const { deliveryZoneId } = request.params as {
        deliveryZoneId: string;
      };
      const { dayOfWeek, cutoffHours } = request.body as {
        dayOfWeek: number;
        cutoffHours?: number;
      };
      const zone = await prisma.deliveryZone.findUnique({
        where: { id: deliveryZoneId },
        include: { shipCalendar: { include: { company: true } } },
      });
      if (!zone)
        return reply.status(404).send({ error: "Zone not found" });
      if (zone.shipCalendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const slot = await prisma.deliverySlot.create({
        data: {
          dayOfWeek,
          cutoffHours: cutoffHours ?? 24,
          deliveryZoneId,
        },
      });
      return reply.status(201).send(slot);
    },
  });

  app.put("/slots/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["DeliverySlots"],
      body: {
        type: "object",
        properties: {
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
          cutoffHours: { type: "integer", minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { dayOfWeek, cutoffHours } = request.body as {
        dayOfWeek?: number;
        cutoffHours?: number;
      };
      const slot = await prisma.deliverySlot.findUnique({
        where: { id },
        include: {
          deliveryZone: {
            include: { shipCalendar: { include: { company: true } } },
          },
        },
      });
      if (!slot)
        return reply.status(404).send({ error: "Slot not found" });
      if (
        slot.deliveryZone.shipCalendar.company.userId !==
        request.user!.userId
      ) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.deliverySlot.update({
        where: { id },
        data: { dayOfWeek, cutoffHours },
      });
      return reply.send(updated);
    },
  });

  app.delete("/slots/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["DeliverySlots"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const slot = await prisma.deliverySlot.findUnique({
        where: { id },
        include: {
          deliveryZone: {
            include: { shipCalendar: { include: { company: true } } },
          },
        },
      });
      if (!slot)
        return reply.status(404).send({ error: "Slot not found" });
      if (
        slot.deliveryZone.shipCalendar.company.userId !==
        request.user!.userId
      ) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.deliverySlot.delete({ where: { id } });
      return reply.send({ message: "Slot deleted" });
    },
  });
}
