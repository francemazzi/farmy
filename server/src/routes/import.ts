import type { FastifyInstance } from "fastify";
import { requireVenditore } from "../middlewares/auth.js";
import { processImport } from "../services/import.service.js";
import prisma from "../lib/prisma.js";

export async function importRoutes(app: FastifyInstance) {
  app.post("/upload", {
    preHandler: [requireVenditore],
    schema: {
      tags: ["Import"],
      querystring: {
        type: "object",
        required: ["companyId", "warehouseId"],
        properties: {
          companyId: { type: "string" },
          warehouseId: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: "No file uploaded" });

      const buffer = await data.toBuffer();
      const fileName = data.filename;
      const ext = fileName.split(".").pop()?.toLowerCase() || "";

      if (!["csv", "xlsx", "pdf"].includes(ext)) {
        return reply
          .status(400)
          .send({ error: "Unsupported file type. Use CSV, XLSX, or PDF." });
      }

      const { companyId, warehouseId } = request.query as {
        companyId: string;
        warehouseId: string;
      };

      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: request.user!.userId },
      });
      if (!company)
        return reply.status(404).send({ error: "Company not found" });

      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
      });
      if (!warehouse)
        return reply.status(404).send({ error: "Warehouse not found" });

      try {
        const result = await processImport(
          buffer,
          fileName,
          ext,
          companyId,
          warehouseId,
          request.user!.userId
        );
        return reply.status(201).send(result);
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    },
  });
}
