import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function productRoutes(app: FastifyInstance) {
  app.get("/companies/:companyId/products", {
    preHandler: [authenticate],
    schema: { tags: ["Products"] },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const products = await prisma.product.findMany({
        where: { companyId },
        include: { stocks: true },
      });
      return reply.send(products);
    },
  });

  app.post("/companies/:companyId/products", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Products"],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          unitOfMeasure: { type: "string" },
          isOrganic: { type: "boolean" },
          producer: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const body = request.body as {
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
        isOrganic?: boolean;
        producer?: string;
      };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      const product = await prisma.product.create({
        data: { ...body, companyId },
      });
      return reply.status(201).send(product);
    },
  });

  app.get("/products/:id", {
    preHandler: [authenticate],
    schema: { tags: ["Products"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const product = await prisma.product.findUnique({
        where: { id },
        include: { company: true, stocks: { include: { warehouse: true } } },
      });
      if (!product)
        return reply.status(404).send({ error: "Product not found" });
      if (product.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      return reply.send(product);
    },
  });

  app.put("/products/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Products"],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          unitOfMeasure: { type: "string" },
          isOrganic: { type: "boolean" },
          producer: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
        isOrganic?: boolean;
        producer?: string;
      };
      const product = await prisma.product.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!product)
        return reply.status(404).send({ error: "Product not found" });
      if (product.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      const updated = await prisma.product.update({
        where: { id },
        data: body,
      });
      return reply.send(updated);
    },
  });

  app.delete("/products/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["Products"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const product = await prisma.product.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!product)
        return reply.status(404).send({ error: "Product not found" });
      if (product.company.userId !== request.user!.userId) {
        return reply.status(403).send({ error: "Access denied" });
      }
      await prisma.product.delete({ where: { id } });
      return reply.send({ message: "Product deleted" });
    },
  });

  app.delete("/companies/:companyId/products/bulk", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Products"],
      body: {
        type: "object",
        required: ["ids"],
        properties: {
          ids: { type: "array", items: { type: "string" } },
        },
      },
    },
    handler: async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { ids } = request.body as { ids: string[] };

      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });

      const result = await prisma.product.deleteMany({
        where: { id: { in: ids }, companyId },
      });

      return reply.send({
        message: `${result.count} prodotti eliminati`,
        deleted: result.count,
      });
    },
  });
}
