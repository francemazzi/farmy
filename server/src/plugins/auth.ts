import type { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";

export async function registerAuth(app: FastifyInstance) {
  await app.register(cookie);
}
