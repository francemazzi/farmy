import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function warehouseRoutes(app: FastifyInstance) {
  app.get("/companies/:companyId/warehouses", {
    preHandler: [authenticate],
    schema: { tags: ["Warehouses"] },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const warehouses = await prisma.warehouse.findMany({
        where: { companyId },
        include: { _count: { select: { stocks: true } } },
      });
      return reply.send(warehouses);
    },
  });

  app.post("/companies/:companyId/warehouses", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Warehouses"],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { name, address } = request.body as {
        name: string;
        address?: string;
      };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const warehouse = await prisma.warehouse.create({
        data: { name, address, companyId },
      });
      return reply.status(201).send(warehouse);
    },
  });

  app.get("/warehouses/:id", {
    preHandler: [authenticate],
    schema: { tags: ["Warehouses"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: { company: true, stocks: { include: { product: true } } },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });
      if (warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      return reply.send(warehouse);
    },
  });

  app.put("/warehouses/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Warehouses"],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, address } = request.body as {
        name?: string;
        address?: string;
      };
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });
      if (warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.warehouse.update({
        where: { id },
        data: { name, address },
      });
      return reply.send(updated);
    },
  });

  app.delete("/warehouses/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["Warehouses"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });
      if (warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.warehouse.delete({ where: { id } });
      return reply.send({ message: "Warehouse deleted" });
    },
  });
}
