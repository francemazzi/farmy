import type { FastifyInstance } from "fastify";
import { requireVenditore } from "../middlewares/auth.js";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = resolve(__dirname, "../../uploads/products");

export async function uploadRoutes(app: FastifyInstance) {
  // Ensure uploads directory exists
  await mkdir(uploadsDir, { recursive: true });

  app.post("/uploads/product-image", {
    preHandler: [requireVenditore],
    schema: { tags: ["Uploads"] },
    handler: async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        return reply.status(400).send({ error: "Invalid file type. Use JPEG, PNG, WebP or GIF" });
      }

      const ext = extname(file.filename) || ".jpg";
      const fileName = `${randomUUID()}${ext}`;
      const filePath = resolve(uploadsDir, fileName);

      const buffer = await file.toBuffer();
      await writeFile(filePath, buffer);

      const imageUrl = `/uploads/products/${fileName}`;
      return reply.send({ imageUrl });
    },
  });
}
