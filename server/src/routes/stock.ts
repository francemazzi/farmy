import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function stockRoutes(app: FastifyInstance) {
  app.get("/warehouses/:warehouseId/stock", {
    preHandler: [authenticate],
    schema: { tags: ["Stock"] },
    handler: async (request, reply) => {
      const { warehouseId } = request.params as { warehouseId: string };
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        include: { company: true },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });
      if (warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const stocks = await prisma.stock.findMany({
        where: { warehouseId },
        include: { product: true },
      });
      return reply.send(stocks);
    },
  });

  app.post("/warehouses/:warehouseId/stock", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Stock"],
      body: {
        type: "object",
        required: ["productId", "price"],
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" },
          price: { type: "number" },
          isNew: { type: "boolean" },
          isPromotional: { type: "boolean" },
          lowStock: { type: "boolean" },
        },
      },
    },
    handler: async (request, reply) => {
      const { warehouseId } = request.params as { warehouseId: string };
      const body = request.body as {
        productId: string;
        quantity?: number;
        price: number;
        isNew?: boolean;
        isPromotional?: boolean;
        lowStock?: boolean;
      };
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        include: { company: true },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });
      if (warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const stock = await prisma.stock.create({
        data: {
          productId: body.productId,
          warehouseId,
          quantity: body.quantity ?? 0,
          price: body.price,
          isNew: body.isNew ?? false,
          isPromotional: body.isPromotional ?? false,
          lowStock: body.lowStock ?? false,
        },
      });
      return reply.status(201).send(stock);
    },
  });

  app.get("/stock/:id", {
    preHandler: [authenticate],
    schema: { tags: ["Stock"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const stock = await prisma.stock.findUnique({
        where: { id },
        include: {
          product: true,
          warehouse: { include: { company: true } },
        },
      });
      if (!stock) return reply.status(404).send({ error: "Stock not found" });
      if (stock.warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      return reply.send(stock);
    },
  });

  app.put("/stock/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Stock"],
      body: {
        type: "object",
        properties: {
          quantity: { type: "number" },
          price: { type: "number" },
          isNew: { type: "boolean" },
          isPromotional: { type: "boolean" },
          lowStock: { type: "boolean" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        quantity?: number;
        price?: number;
        isNew?: boolean;
        isPromotional?: boolean;
        lowStock?: boolean;
      };
      const stock = await prisma.stock.findUnique({
        where: { id },
        include: { warehouse: { include: { company: true } } },
      });
      if (!stock) return reply.status(404).send({ error: "Stock not found" });
      if (stock.warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.stock.update({
        where: { id },
        data: body,
      });
      return reply.send(updated);
    },
  });

  app.delete("/stock/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["Stock"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const stock = await prisma.stock.findUnique({
        where: { id },
        include: { warehouse: { include: { company: true } } },
      });
      if (!stock) return reply.status(404).send({ error: "Stock not found" });
      if (stock.warehouse.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.stock.delete({ where: { id } });
      return reply.send({ message: "Stock deleted" });
    },
  });
}
