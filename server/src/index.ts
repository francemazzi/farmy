import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { companyRoutes } from "./routes/companies.js";
import { warehouseRoutes } from "./routes/warehouses.js";
import { productRoutes } from "./routes/products.js";
import { stockRoutes } from "./routes/stock.js";
import { importRoutes } from "./routes/import.js";
import { storefrontRoutes } from "./routes/storefront.js";
import { shipCalendarRoutes } from "./routes/ship-calendars.js";
import { deliveryZoneRoutes } from "./routes/delivery-zones.js";
import { deliverySlotRoutes } from "./routes/delivery-slots.js";
import { orderRoutes } from "./routes/orders.js";
import { uploadRoutes } from "./routes/uploads.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: !config.isTest });

  await app.register(cors, { origin: true, credentials: true });
  await registerAuth(app);
  await registerSwagger(app);
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  await app.register(fastifyStatic, {
    root: resolve(__dirname, "../uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(companyRoutes, { prefix: "/api/companies" });
  await app.register(warehouseRoutes, { prefix: "/api" });
  await app.register(productRoutes, { prefix: "/api" });
  await app.register(stockRoutes, { prefix: "/api" });
  await app.register(importRoutes, { prefix: "/api/import" });
  await app.register(storefrontRoutes, { prefix: "/api/storefront" });
  await app.register(shipCalendarRoutes, { prefix: "/api" });
  await app.register(deliveryZoneRoutes, { prefix: "/api" });
  await app.register(deliverySlotRoutes, { prefix: "/api" });
  await app.register(orderRoutes, { prefix: "/api" });
  await app.register(uploadRoutes, { prefix: "/api" });

  return app;
}

if (!config.isTest) {
  const app = await buildApp();
  app.listen({ port: config.port, host: config.host }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`Server running at ${address}`);
    app.log.info(`API docs at ${address}/docs`);
  });
}
