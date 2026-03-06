import type { FastifyInstance } from "fastify";
import { registerUser, loginUser } from "../services/auth.service.js";
import { authenticate } from "../middlewares/auth.js";
import { config } from "../config.js";
import prisma from "../lib/prisma.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", {
    schema: {
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["email", "password", "name", "role"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          name: { type: "string" },
          role: { type: "string", enum: ["VENDITORE", "CLIENTE"] },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        email: string;
        password: string;
        name: string;
        role: "VENDITORE" | "CLIENTE";
      };
      try {
        const user = await registerUser(body);
        return reply.status(201).send(user);
      } catch (e: any) {
        return reply.status(400).send({ error: e.message });
      }
    },
  });

  app.post("/login", {
    schema: {
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };
      try {
        const { token, user } = await loginUser(email, password);
        reply.setCookie(config.cookieName, token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24, // 24h
        });
        return reply.send(user);
      } catch (e: any) {
        return reply.status(401).send({ error: e.message });
      }
    },
  });

  app.post("/logout", {
    schema: { tags: ["Auth"] },
    handler: async (_request, reply) => {
      reply.clearCookie(config.cookieName, { path: "/" });
      return reply.send({ message: "Logged out" });
    },
  });

  app.get("/me", {
    preHandler: [authenticate],
    schema: { tags: ["Auth"] },
    handler: async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    },
  });
}
