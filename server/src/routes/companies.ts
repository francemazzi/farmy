import type { FastifyInstance } from "fastify";
import { authenticate, requireVenditore } from "../middlewares/auth.js";
import prisma from "../lib/prisma.js";

export async function companyRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [authenticate],
    schema: { tags: ["Companies"] },
    handler: async (request, reply) => {
      const companies = await prisma.company.findMany({
        where: { userId: request.user!.userId },
        include: { _count: { select: { warehouses: true, products: true } } },
      });
      return reply.send(companies);
    },
  });

  app.post("/", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Companies"],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { name, description } = request.body as {
        name: string;
        description?: string;
      };
      const company = await prisma.company.create({
        data: { name, description, userId: request.user!.userId },
      });
      return reply.status(201).send(company);
    },
  });

  app.get("/:id", {
    preHandler: [authenticate],
    schema: { tags: ["Companies"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const company = await prisma.company.findFirst({
        where: { id, userId: request.user!.userId },
        include: { warehouses: true, products: true },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });
      return reply.send(company);
    },
  });

  app.put("/:id", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Companies"],
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, description } = request.body as {
        name?: string;
        description?: string;
      };
      const existing = await prisma.company.findFirst({
        where: { id, userId: request.user!.userId },
      });
      if (!existing)
        return reply.status(404).send({ error: "Company not found" });
      const company = await prisma.company.update({
        where: { id },
        data: { name, description },
      });
      return reply.send(company);
    },
  });

  app.delete("/:id", {
    preHandler: [requireVenditore],
    schema: { tags: ["Companies"] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.company.findFirst({
        where: { id, userId: request.user!.userId },
      });
      if (!existing)
        return reply.status(404).send({ error: "Company not found" });
      await prisma.company.delete({ where: { id } });
      return reply.send({ message: "Company deleted" });
    },
  });
}
