import type { FastifyInstance } from "fastify";
import { registerUser } from "../services/auth.service.js";
import prisma from "../lib/prisma.js";

export async function setupRoutes(app: FastifyInstance) {
  app.get("/status", {
    schema: { tags: ["Setup"] },
    handler: async (_request, reply) => {
      const userCount = await prisma.user.count();
      return reply.send({ needsSetup: userCount === 0 });
    },
  });

  app.post("/init", {
    schema: {
      tags: ["Setup"],
      body: {
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          name: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return reply
          .status(400)
          .send({ error: "Setup già completato" });
      }

      const body = request.body as {
        email: string;
        password: string;
        name: string;
      };

      try {
        const user = await registerUser({
          ...body,
          role: "VENDITORE",
        });
        return reply.status(201).send(user);
      } catch (e: any) {
        return reply.status(400).send({ error: e.message });
      }
    },
  });
}
