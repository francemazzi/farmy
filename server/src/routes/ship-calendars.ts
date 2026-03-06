import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function shipCalendarRoutes(app: FastifyInstance) {
  app.get("/companies/:companyId/ship-calendars", {
    preHandler: [authenticate],
    schema: { tags: ["ShipCalendars"] },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const calendars = await prisma.shipCalendar.findMany({
        where: { companyId },
        include: { _count: { select: { deliveryZones: true } } },
      });
      return reply.send(calendars);
    },
  });

  app.post("/companies/:companyId/ship-calendars", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["ShipCalendars"],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          active: { type: "boolean" },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { name, active } = request.body as {
        name: string;
        active?: boolean;
      };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const calendar = await prisma.shipCalendar.create({
        data: { name, active: active ?? true, companyId },
      });
      return reply.status(201).send(calendar);
    },
  });

  app.get("/ship-calendars/:id", {
    preHandler: [authenticate],
    schema: { tags: ["ShipCalendars"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const calendar = await prisma.shipCalendar.findUnique({
        where: { id },
        include: {
          company: true,
          deliveryZones: { include: { deliverySlots: true } },
        },
      });
      if (!calendar)
        return reply.status(404).send({ error: "Calendar not found" });
      if (calendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      return reply.send(calendar);
    },
  });

  app.put("/ship-calendars/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["ShipCalendars"],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          active: { type: "boolean" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, active } = request.body as {
        name?: string;
        active?: boolean;
      };
      const calendar = await prisma.shipCalendar.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!calendar)
        return reply.status(404).send({ error: "Calendar not found" });
      if (calendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.shipCalendar.update({
        where: { id },
        data: { name, active },
      });
      return reply.send(updated);
    },
  });

  app.delete("/ship-calendars/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["ShipCalendars"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const calendar = await prisma.shipCalendar.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!calendar)
        return reply.status(404).send({ error: "Calendar not found" });
      if (calendar.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.shipCalendar.delete({ where: { id } });
      return reply.send({ message: "Calendar deleted" });
    },
  });
}
