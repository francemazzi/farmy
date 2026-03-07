import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function orderRoutes(app: FastifyInstance) {
  // Cliente: crea ordine
  app.post("/orders", {
    preHandler: [authenticate],
    schema: {
      tags: ["Orders"],
      body: {
        type: "object",
        required: ["companyId", "deliveryDate", "items"],
        properties: {
          companyId: { type: "string" },
          deliveryDate: { type: "string" },
          deliveryZoneId: { type: "string" },
          paymentMethod: { type: "string" },
          notes: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["stockId", "quantity"],
              properties: {
                stockId: { type: "string" },
                quantity: { type: "number" },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const user = request.user!;
      const body = request.body as {
        companyId: string;
        deliveryDate: string;
        deliveryZoneId?: string;
        paymentMethod?: string;
        notes?: string;
        items: Array<{ stockId: string; quantity: number }>;
      };

      if (body.items.length === 0) {
        return reply.status(400).send({ error: "Order must have at least one item" });
      }

      // Fetch all stocks and validate
      const stockIds = body.items.map((i) => i.stockId);
      const stocks = await prisma.stock.findMany({
        where: { id: { in: stockIds } },
        include: { product: true },
      });

      if (stocks.length !== stockIds.length) {
        return reply.status(400).send({ error: "Some stock items not found" });
      }

      // Build order items with server-side prices
      let totalAmount = 0;
      const orderItems = body.items.map((item) => {
        const stock = stocks.find((s) => s.id === item.stockId)!;
        const totalPrice = stock.price * item.quantity;
        totalAmount += totalPrice;
        return {
          productId: stock.productId,
          stockId: item.stockId,
          quantity: item.quantity,
          unitPrice: stock.price,
          totalPrice,
        };
      });

      const order = await prisma.order.create({
        data: {
          companyId: body.companyId,
          customerUserId: user.userId,
          deliveryDate: new Date(body.deliveryDate),
          deliveryZoneId: body.deliveryZoneId,
          paymentMethod: body.paymentMethod ?? "CASH",
          notes: body.notes,
          totalAmount,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });

      return reply.status(201).send(order);
    },
  });

  // Cliente: i miei ordini
  app.get("/orders/my", {
    preHandler: [authenticate],
    schema: { tags: ["Orders"] },
    handler: async (request, reply) => {
      const orders = await prisma.order.findMany({
        where: { customerUserId: request.user!.userId },
        include: {
          company: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(orders);
    },
  });

  // Venditore: ordini per azienda
  app.get("/companies/:companyId/orders", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Orders"],
      querystring: {
        type: "object",
        properties: {
          status: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { status } = request.query as { status?: string };

      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      if (company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      const where: Record<string, unknown> = { companyId };
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        include: {
          customerUser: { select: { id: true, name: true, email: true } },
          items: { include: { product: true } },
          deliveryZone: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return reply.send(orders);
    },
  });

  // Dettaglio ordine
  app.get("/orders/:id", {
    preHandler: [authenticate],
    schema: { tags: ["Orders"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true } },
          customerUser: { select: { id: true, name: true, email: true } },
          items: { include: { product: true, stock: true } },
          deliveryZone: { select: { id: true, name: true } },
        },
      });
      if (!order)
        return reply.status(404).send({ error: "Order not found" });

      // Check access: customer or vendor
      const isCustomer = order.customerUserId === request.user!.userId;
      const company = await prisma.company.findUnique({
        where: { id: order.companyId },
      });
      const isVendor = company?.userId === request.user!.userId;

      if (!isCustomer && !isVendor) {
        return reply.status(403).send({ error: "Access denied" });
      }

      return reply.send(order);
    },
  });

  // Aggiorna ordine (cliente: modifica items se ≥2gg prima, venditore: aggiorna status)
  app.put("/orders/:id", {
    preHandler: [authenticate],
    schema: {
      tags: ["Orders"],
      body: {
        type: "object",
        properties: {
          status: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { status?: string; notes?: string };

      const order = await prisma.order.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!order)
        return reply.status(404).send({ error: "Order not found" });

      const isCustomer = order.customerUserId === request.user!.userId;
      const isVendor = order.company.userId === request.user!.userId;

      if (!isCustomer && !isVendor) {
        return reply.status(403).send({ error: "Access denied" });
      }

      // Cliente: può aggiornare note se ≥2gg prima della consegna e status PENDING
      if (isCustomer) {
        if (order.status !== "PENDING") {
          return reply.status(400).send({ error: "Can only modify pending orders" });
        }
        const daysUntilDelivery = Math.ceil(
          (order.deliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDelivery < 2) {
          return reply
            .status(400)
            .send({ error: "Cannot modify order less than 2 days before delivery" });
        }
        const updated = await prisma.order.update({
          where: { id },
          data: { notes: body.notes },
        });
        return reply.send(updated);
      }

      // Venditore: può aggiornare status
      if (isVendor && body.status) {
        const updated = await prisma.order.update({
          where: { id },
          data: { status: body.status },
          include: { items: { include: { product: true } } },
        });
        return reply.send(updated);
      }

      return reply.status(400).send({ error: "No valid update" });
    },
  });

  // Annulla ordine
  app.delete("/orders/:id/cancel", {
    preHandler: [authenticate],
    schema: { tags: ["Orders"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const order = await prisma.order.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!order)
        return reply.status(404).send({ error: "Order not found" });

      const isCustomer = order.customerUserId === request.user!.userId;
      const isVendor = order.company.userId === request.user!.userId;

      if (!isCustomer && !isVendor) {
        return reply.status(403).send({ error: "Access denied" });
      }

      if (order.status === "CANCELLED") {
        return reply.status(400).send({ error: "Order already cancelled" });
      }

      // Cliente: ≥2gg prima e solo PENDING/CONFIRMED
      if (isCustomer) {
        if (!["PENDING", "CONFIRMED"].includes(order.status)) {
          return reply
            .status(400)
            .send({ error: "Cannot cancel order in current status" });
        }
        const daysUntilDelivery = Math.ceil(
          (order.deliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDelivery < 2) {
          return reply
            .status(400)
            .send({ error: "Cannot cancel order less than 2 days before delivery" });
        }
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return reply.send(updated);
    },
  });
}
