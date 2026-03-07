import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/index.js";
import type { FastifyInstance } from "fastify";
import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Env vars set in vitest.config.ts: DATABASE_URL, NODE_ENV, JWT_SECRET

let app: FastifyInstance;
let venditoreCookie: string;
let clienteCookie: string;
let companyId: string;
let warehouseId: string;
let productId: string;
let stockId: string;
let shipCalendarId: string;
let deliveryZoneId: string;
let deliverySlotId: string;

beforeAll(async () => {
  // Clean up old test db to ensure clean state
  const serverDir = resolve(__dirname, "..");
  const testDbPath = resolve(serverDir, "prisma/test.db");
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = testDbPath + suffix;
    if (existsSync(p)) unlinkSync(p);
  }

  // Push schema to fresh test DB
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });

  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  const testDbPath = resolve(__dirname, "../prisma/test.db");
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      const p = testDbPath + suffix;
      if (existsSync(p)) unlinkSync(p);
    } catch {}
  }
});

// ============================================================
// AUTH TESTS
// ============================================================
describe("Auth", () => {
  it("should register a venditore", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "venditore@test.com",
        password: "password123",
        name: "Lorenzo Cavalli",
        role: "VENDITORE",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().email).toBe("venditore@test.com");
    expect(res.json().role).toBe("VENDITORE");
  });

  it("should register a cliente", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "cliente@test.com",
        password: "password123",
        name: "Marco Rossi",
        role: "CLIENTE",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe("CLIENTE");
  });

  it("should reject duplicate email registration", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "venditore@test.com",
        password: "password123",
        name: "Another",
        role: "VENDITORE",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("should login venditore and receive cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "venditore@test.com", password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    venditoreCookie = (
      Array.isArray(setCookie) ? setCookie[0] : setCookie!
    ).split(";")[0];
    expect(venditoreCookie).toContain("farmy_token=");
  });

  it("should login cliente and receive cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "cliente@test.com", password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    clienteCookie = (
      Array.isArray(setCookie) ? setCookie[0] : setCookie!
    ).split(";")[0];
  });

  it("should reject login with wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "venditore@test.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("should return current user via /me", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe("venditore@test.com");
    expect(res.json().role).toBe("VENDITORE");
  });

  it("should reject /me without auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });
    expect(res.statusCode).toBe(401);
  });

  it("cookie should have 24h expiry (maxAge)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "venditore@test.com", password: "password123" },
    });
    const setCookie = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"][0]
      : res.headers["set-cookie"]!;
    expect(setCookie).toContain("Max-Age=86400");
  });
});

// ============================================================
// COMPANY TESTS
// ============================================================
describe("Companies CRUD", () => {
  it("should create a company (venditore)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/companies",
      headers: { cookie: venditoreCookie },
      payload: {
        name: "Ortofrutta Bio Lorenzo",
        description: "Organic produce from Emilia-Romagna",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Ortofrutta Bio Lorenzo");
    companyId = res.json().id;
  });

  it("should deny company creation for cliente", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/companies",
      headers: { cookie: clienteCookie },
      payload: { name: "Should Fail" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("should list companies for venditore", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/companies",
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].name).toBe("Ortofrutta Bio Lorenzo");
  });

  it("should get a company by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(companyId);
  });

  it("should update a company", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/companies/${companyId}`,
      headers: { cookie: venditoreCookie },
      payload: { description: "Updated description" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe("Updated description");
  });
});

// ============================================================
// WAREHOUSE TESTS
// ============================================================
describe("Warehouses CRUD", () => {
  it("should create a warehouse", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/warehouses`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Magazzino Principale", address: "Via Roma 1, Modena" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Magazzino Principale");
    warehouseId = res.json().id;
  });

  it("should list warehouses for company", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/warehouses`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("should get warehouse by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/warehouses/${warehouseId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Magazzino Principale");
  });

  it("should update warehouse", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/warehouses/${warehouseId}`,
      headers: { cookie: venditoreCookie },
      payload: { address: "Via Emilia 42, Bologna" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().address).toBe("Via Emilia 42, Bologna");
  });
});

// ============================================================
// PRODUCT TESTS
// ============================================================
describe("Products CRUD", () => {
  it("should create a product", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/products`,
      headers: { cookie: venditoreCookie },
      payload: {
        name: "Zucchine Bio",
        category: "ORTOFRUTTA",
        unitOfMeasure: "KG",
        isOrganic: true,
        producer: "Az. Agricola Verdi",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Zucchine Bio");
    productId = res.json().id;
  });

  it("should list products for company", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/products`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("should get product by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/products/${productId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Zucchine Bio");
  });

  it("should update product", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/products/${productId}`,
      headers: { cookie: venditoreCookie },
      payload: { description: "Fresh organic zucchini" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe("Fresh organic zucchini");
  });
});

// ============================================================
// STOCK TESTS
// ============================================================
describe("Stock CRUD", () => {
  it("should create stock for product in warehouse", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/warehouses/${warehouseId}/stock`,
      headers: { cookie: venditoreCookie },
      payload: {
        productId,
        quantity: 50,
        price: 3.5,
        isNew: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().price).toBe(3.5);
    expect(res.json().quantity).toBe(50);
    stockId = res.json().id;
  });

  it("should list stock for warehouse", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/warehouses/${warehouseId}/stock`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].product.name).toBe("Zucchine Bio");
  });

  it("should get stock by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/stock/${stockId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(stockId);
  });

  it("should update stock", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/stock/${stockId}`,
      headers: { cookie: venditoreCookie },
      payload: { quantity: 100, isPromotional: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quantity).toBe(100);
    expect(res.json().isPromotional).toBe(true);
  });
});

// ============================================================
// VENDITORE: VIEW ALL PRODUCTS IN WAREHOUSE
// ============================================================
describe("Venditore views all products in warehouse", () => {
  it("should return warehouse with products and stock", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/warehouses/${warehouseId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().stocks).toBeDefined();
    expect(res.json().stocks.length).toBeGreaterThan(0);
    expect(res.json().stocks[0].product.name).toBe("Zucchine Bio");
  });
});

// ============================================================
// CLIENTE: VIEW STOREFRONT
// ============================================================
describe("Cliente views storefront", () => {
  it("should see available products for a company", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().company).toBeDefined();
    expect(res.json().company.name).toBe("Ortofrutta Bio Lorenzo");
    expect(res.json().products).toBeDefined();
    expect(res.json().products.length).toBeGreaterThan(0);
    expect(res.json().products[0].name).toBe("Zucchine Bio");
    expect(res.json().products[0].stocks[0].price).toBe(3.5);
  });

  it("should not show products with zero stock", async () => {
    // Create another product with zero stock
    const prodRes = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/products`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Melanzane Bio", unitOfMeasure: "KG" },
    });
    const emptyProductId = prodRes.json().id;

    await app.inject({
      method: "POST",
      url: `/api/warehouses/${warehouseId}/stock`,
      headers: { cookie: venditoreCookie },
      payload: { productId: emptyProductId, quantity: 0, price: 4.0 },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    const productNames = res.json().products.map((p: any) => p.name);
    expect(productNames).not.toContain("Melanzane Bio");
  });
});

// ============================================================
// FILE IMPORT TESTS
// ============================================================
describe("File import - XLSX", () => {
  it("should import XLSX file and create products", async () => {
    const filePath = resolve(
      __dirname,
      "../../dataset/user/lorenzo_cavalli/LISTINO ORTOFRUTTA BIO 2 marzo.xlsx"
    );

    if (!existsSync(filePath)) {
      console.warn("Skipping XLSX import test - dataset file not found");
      return;
    }

    const fileBuffer = readFileSync(filePath);
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: "LISTINO ORTOFRUTTA BIO 2 marzo.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/import/upload?companyId=${companyId}&warehouseId=${warehouseId}`,
      headers: {
        ...form.getHeaders(),
        cookie: venditoreCookie,
      },
      payload: form,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().productsCreated).toBeGreaterThan(0);
    console.log(`XLSX import: ${res.json().productsCreated} products created`);
  });
});

describe("File import - PDF (OpenAI)", () => {
  it("should import PDF file via OpenAI extraction", async () => {
    const filePath = resolve(
      __dirname,
      "../../dataset/user/lorenzo_cavalli/listinoprodotti confezionati mercato febbraio 26.pdf"
    );

    if (!existsSync(filePath)) {
      console.warn("Skipping PDF import test - dataset file not found");
      return;
    }

    const fileBuffer = readFileSync(filePath);
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: "listinoprodotti confezionati mercato febbraio 26.pdf",
      contentType: "application/pdf",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/import/upload?companyId=${companyId}&warehouseId=${warehouseId}`,
      headers: {
        ...form.getHeaders(),
        cookie: venditoreCookie,
      },
      payload: form,
    });

    if (res.statusCode !== 201) {
      console.log("PDF import error:", res.json());
    }
    expect(res.statusCode).toBe(201);
    expect(res.json().productsCreated).toBeGreaterThan(0);
    console.log(`PDF import: ${res.json().productsCreated} products created`);
  });
});

// ============================================================
// SHIP CALENDAR TESTS
// ============================================================
describe("ShipCalendar CRUD", () => {
  it("should create a ship calendar", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/ship-calendars`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Consegne Lombardia" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Consegne Lombardia");
    expect(res.json().active).toBe(true);
    shipCalendarId = res.json().id;
  });

  it("should deny calendar creation for cliente", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/ship-calendars`,
      headers: { cookie: clienteCookie },
      payload: { name: "Should Fail" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("should list calendars for company", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/ship-calendars`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].name).toBe("Consegne Lombardia");
  });

  it("should get calendar by id with zones", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/ship-calendars/${shipCalendarId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Consegne Lombardia");
    expect(res.json().deliveryZones).toBeDefined();
  });

  it("should update calendar", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/ship-calendars/${shipCalendarId}`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Consegne Nord Italia" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Consegne Nord Italia");
  });
});

// ============================================================
// DELIVERY ZONE TESTS
// ============================================================
describe("DeliveryZone CRUD", () => {
  it("should create a delivery zone with zipCodes and cities", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/ship-calendars/${shipCalendarId}/zones`,
      headers: { cookie: venditoreCookie },
      payload: {
        name: "Milano e Provincia",
        zipCodes: "20100,20121,20122,20123",
        cities: "Milano,Sesto San Giovanni,Monza",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe("Milano e Provincia");
    expect(res.json().zipCodes).toBe("20100,20121,20122,20123");
    expect(res.json().cities).toBe("Milano,Sesto San Giovanni,Monza");
    deliveryZoneId = res.json().id;
  });

  it("should list zones for calendar", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/ship-calendars/${shipCalendarId}/zones`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("should get zone by id with slots", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/zones/${deliveryZoneId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Milano e Provincia");
    expect(res.json().deliverySlots).toBeDefined();
  });

  it("should update zone", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/zones/${deliveryZoneId}`,
      headers: { cookie: venditoreCookie },
      payload: { cities: "Milano,Sesto San Giovanni,Monza,Cinisello Balsamo" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().cities).toBe(
      "Milano,Sesto San Giovanni,Monza,Cinisello Balsamo"
    );
  });
});

// ============================================================
// DELIVERY SLOT TESTS
// ============================================================
describe("DeliverySlot CRUD", () => {
  it("should create a delivery slot (Martedì)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/zones/${deliveryZoneId}/slots`,
      headers: { cookie: venditoreCookie },
      payload: { dayOfWeek: 1, cutoffHours: 24 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().dayOfWeek).toBe(1);
    expect(res.json().cutoffHours).toBe(24);
    deliverySlotId = res.json().id;
  });

  it("should create another slot (Venerdì)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/zones/${deliveryZoneId}/slots`,
      headers: { cookie: venditoreCookie },
      payload: { dayOfWeek: 4, cutoffHours: 48 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().dayOfWeek).toBe(4);
  });

  it("should list slots for zone ordered by day", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/zones/${deliveryZoneId}/slots`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
    expect(res.json()[0].dayOfWeek).toBe(1);
    expect(res.json()[1].dayOfWeek).toBe(4);
  });

  it("should update slot cutoffHours", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/slots/${deliverySlotId}`,
      headers: { cookie: venditoreCookie },
      payload: { cutoffHours: 12 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().cutoffHours).toBe(12);
  });
});

// ============================================================
// DELIVERY DAYS MATCHING (STOREFRONT)
// ============================================================
describe("Delivery days matching", () => {
  it("should match by zipCode", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}/delivery-days?zipCode=20100`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().zones).toHaveLength(1);
    expect(res.json().zones[0].zoneName).toBe("Milano e Provincia");
    expect(res.json().zones[0].days).toHaveLength(2);
    expect(res.json().zones[0].days[0].dayName).toBe("Martedì");
    expect(res.json().zones[0].days[1].dayName).toBe("Venerdì");
  });

  it("should match by city (case-insensitive)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}/delivery-days?city=milano`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().zones).toHaveLength(1);
    expect(res.json().zones[0].zoneName).toBe("Milano e Provincia");
  });

  it("should return empty for unknown zipCode", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}/delivery-days?zipCode=99999`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().zones).toHaveLength(0);
  });

  it("should return 400 without zipCode or city", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}/delivery-days`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(400);
  });

  it("should delete slot", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/slots/${deliverySlotId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ============================================================
// ORDER FLOW (end-to-end: cliente creates order with delivery zone)
// ============================================================
let orderId: string;

describe("Order flow - Cliente crea ordine con consegna in zona", () => {
  it("storefront should include stock id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/storefront/${companyId}`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    const product = res.json().products.find((p: any) => p.name === "Zucchine Bio");
    expect(product).toBeDefined();
    expect(product.stocks[0].id).toBeDefined();
  });

  it("cliente should create an order with delivery zone", async () => {
    // Use a delivery date 14 days in the future (well beyond the 2-day limit)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie: clienteCookie },
      payload: {
        companyId,
        deliveryDate: futureDate.toISOString(),
        deliveryZoneId,
        paymentMethod: "CASH",
        notes: "Citofono 3B, piano terra",
        items: [
          { stockId, quantity: 5 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().companyId).toBe(companyId);
    expect(res.json().status).toBe("PENDING");
    expect(res.json().paymentMethod).toBe("CASH");
    expect(res.json().totalAmount).toBe(3.5 * 5); // price * quantity
    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].unitPrice).toBe(3.5);
    expect(res.json().items[0].quantity).toBe(5);
    orderId = res.json().id;
  });

  it("should reject order with empty items", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie: clienteCookie },
      payload: {
        companyId,
        deliveryDate: futureDate.toISOString(),
        items: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("should reject order with invalid stockId", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie: clienteCookie },
      payload: {
        companyId,
        deliveryDate: futureDate.toISOString(),
        items: [{ stockId: "nonexistent", quantity: 1 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("cliente should list their orders", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/orders/my",
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);
    const myOrder = res.json().find((o: any) => o.id === orderId);
    expect(myOrder).toBeDefined();
    expect(myOrder.company.name).toBe("Ortofrutta Bio Lorenzo");
  });

  it("venditore should list company orders", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/orders`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);
    const order = res.json().find((o: any) => o.id === orderId);
    expect(order).toBeDefined();
    expect(order.customerUser.name).toBe("Marco Rossi");
    expect(order.deliveryZone.name).toBe("Milano e Provincia");
  });

  it("venditore should filter orders by status", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/orders?status=PENDING`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);

    const resEmpty = await app.inject({
      method: "GET",
      url: `/api/companies/${companyId}/orders?status=DELIVERED`,
      headers: { cookie: venditoreCookie },
    });
    expect(resEmpty.json()).toHaveLength(0);
  });

  it("should get order detail", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/orders/${orderId}`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(orderId);
    expect(res.json().items).toHaveLength(1);
    expect(res.json().deliveryZone.name).toBe("Milano e Provincia");
  });

  it("venditore should also access order detail", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/orders/${orderId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("cliente should update notes on pending order", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/orders/${orderId}`,
      headers: { cookie: clienteCookie },
      payload: { notes: "Citofono 3B, secondo piano" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().notes).toBe("Citofono 3B, secondo piano");
  });

  it("venditore should update order status to CONFIRMED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/orders/${orderId}`,
      headers: { cookie: venditoreCookie },
      payload: { status: "CONFIRMED" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("CONFIRMED");
  });

  it("cliente should NOT modify notes after status is CONFIRMED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/orders/${orderId}`,
      headers: { cookie: clienteCookie },
      payload: { notes: "Changed again" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("venditore should advance status through the flow", async () => {
    for (const status of ["PREPARING", "SHIPPED", "DELIVERED"]) {
      const res = await app.inject({
        method: "PUT",
        url: `/api/orders/${orderId}`,
        headers: { cookie: venditoreCookie },
        payload: { status },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(status);
    }
  });

  it("cliente should NOT cancel a DELIVERED order", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/orders/${orderId}/cancel`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Order cancellation flow", () => {
  let cancelOrderId: string;

  it("create another order for cancellation test", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie: clienteCookie },
      payload: {
        companyId,
        deliveryDate: futureDate.toISOString(),
        deliveryZoneId,
        items: [{ stockId, quantity: 2 }],
      },
    });
    expect(res.statusCode).toBe(201);
    cancelOrderId = res.json().id;
  });

  it("cliente should cancel PENDING order (≥2 days before delivery)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/orders/${cancelOrderId}/cancel`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("CANCELLED");
  });

  it("should NOT cancel an already cancelled order", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/orders/${cancelOrderId}/cancel`,
      headers: { cookie: clienteCookie },
    });
    expect(res.statusCode).toBe(400);
  });

  it("venditore can cancel any non-cancelled order", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    // Create order
    const createRes = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie: clienteCookie },
      payload: {
        companyId,
        deliveryDate: futureDate.toISOString(),
        items: [{ stockId, quantity: 1 }],
      },
    });
    const vendorCancelId = createRes.json().id;

    // Confirm it
    await app.inject({
      method: "PUT",
      url: `/api/orders/${vendorCancelId}`,
      headers: { cookie: venditoreCookie },
      payload: { status: "CONFIRMED" },
    });

    // Venditore cancels
    const res = await app.inject({
      method: "DELETE",
      url: `/api/orders/${vendorCancelId}/cancel`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("CANCELLED");
  });
});

// ============================================================
// CLEANUP: delete remaining test data
// ============================================================
describe("Cleanup delivery data", () => {
  it("should delete zone", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/zones/${deliveryZoneId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("should delete calendar", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/ship-calendars/${shipCalendarId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ============================================================
// DELETE TESTS (Stock, Product, Warehouse, Company cascade)
// ============================================================
describe("Delete operations", () => {
  it("should delete stock", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/stock/${stockId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);

    const checkRes = await app.inject({
      method: "GET",
      url: `/api/stock/${stockId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(checkRes.statusCode).toBe(404);
  });

  it("should delete product", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/products/${productId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("should delete warehouse", async () => {
    // Create a new warehouse to delete
    const createRes = await app.inject({
      method: "POST",
      url: `/api/companies/${companyId}/warehouses`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Temp Warehouse" },
    });
    const tempId = createRes.json().id;

    const res = await app.inject({
      method: "DELETE",
      url: `/api/warehouses/${tempId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("should delete company with cascade", async () => {
    // Create a company with child data to test cascade
    const compRes = await app.inject({
      method: "POST",
      url: "/api/companies",
      headers: { cookie: venditoreCookie },
      payload: { name: "Cascade Test Co" },
    });
    const cascadeCompanyId = compRes.json().id;

    // Create warehouse under it
    const whRes = await app.inject({
      method: "POST",
      url: `/api/companies/${cascadeCompanyId}/warehouses`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Cascade WH" },
    });
    const cascadeWhId = whRes.json().id;

    // Create product
    const prodRes = await app.inject({
      method: "POST",
      url: `/api/companies/${cascadeCompanyId}/products`,
      headers: { cookie: venditoreCookie },
      payload: { name: "Cascade Product" },
    });
    const cascadeProdId = prodRes.json().id;

    // Create stock
    await app.inject({
      method: "POST",
      url: `/api/warehouses/${cascadeWhId}/stock`,
      headers: { cookie: venditoreCookie },
      payload: { productId: cascadeProdId, price: 5.0, quantity: 10 },
    });

    // Delete the company - should cascade
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/companies/${cascadeCompanyId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(deleteRes.statusCode).toBe(200);

    // Verify warehouse is gone
    const whCheck = await app.inject({
      method: "GET",
      url: `/api/warehouses/${cascadeWhId}`,
      headers: { cookie: venditoreCookie },
    });
    expect(whCheck.statusCode).toBe(404);
  });
});

// ============================================================
// LOGOUT
// ============================================================
describe("Logout", () => {
  it("should logout and clear cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe("Logged out");
  });
});
