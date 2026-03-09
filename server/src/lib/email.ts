import nodemailer from "nodemailer";
import { config } from "../config.js";

function createTransport() {
  if (!config.smtp.host) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

const transporter = createTransport();

interface GuestOrderEmail {
  vendorEmail: string;
  vendorName: string;
  orderId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  deliveryDate: string;
  totalAmount: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number }>;
  notes?: string;
}

export async function sendGuestOrderNotification(data: GuestOrderEmail) {
  if (!transporter) {
    console.warn("[email] SMTP not configured — skipping notification");
    return;
  }

  const itemRows = data.items
    .map((i) => `  - ${i.productName}: ${i.quantity} x €${i.unitPrice.toFixed(2)} = €${i.totalPrice.toFixed(2)}`)
    .join("\n");

  const text =
    `Nuovo ordine da PDF!\n\n` +
    `Cliente: ${data.guestName}\n` +
    (data.guestEmail ? `Email: ${data.guestEmail}\n` : "") +
    (data.guestPhone ? `Telefono: ${data.guestPhone}\n` : "") +
    (data.guestAddress ? `Indirizzo: ${data.guestAddress}\n` : "") +
    `\nData consegna: ${data.deliveryDate}\n` +
    (data.notes ? `Note: ${data.notes}\n` : "") +
    `\nProdotti:\n${itemRows}\n` +
    `\nTotale: €${data.totalAmount.toFixed(2)}\n` +
    `\nID ordine: ${data.orderId}`;

  const html =
    `<h2>Nuovo ordine da PDF</h2>` +
    `<table style="border-collapse:collapse;width:100%;max-width:500px;">` +
    `<tr><td style="padding:4px 8px;color:#666;">Cliente</td><td style="padding:4px 8px;font-weight:600;">${esc(data.guestName)}</td></tr>` +
    (data.guestEmail ? `<tr><td style="padding:4px 8px;color:#666;">Email</td><td style="padding:4px 8px;">${esc(data.guestEmail)}</td></tr>` : "") +
    (data.guestPhone ? `<tr><td style="padding:4px 8px;color:#666;">Telefono</td><td style="padding:4px 8px;">${esc(data.guestPhone)}</td></tr>` : "") +
    (data.guestAddress ? `<tr><td style="padding:4px 8px;color:#666;">Indirizzo</td><td style="padding:4px 8px;">${esc(data.guestAddress)}</td></tr>` : "") +
    `<tr><td style="padding:4px 8px;color:#666;">Consegna</td><td style="padding:4px 8px;">${esc(data.deliveryDate)}</td></tr>` +
    (data.notes ? `<tr><td style="padding:4px 8px;color:#666;">Note</td><td style="padding:4px 8px;">${esc(data.notes)}</td></tr>` : "") +
    `</table>` +
    `<h3 style="margin-top:16px;">Prodotti</h3>` +
    `<table style="border-collapse:collapse;width:100%;max-width:500px;">` +
    `<tr style="background:#2d6a4e;color:#fff;"><th style="padding:6px 8px;text-align:left;">Prodotto</th><th style="padding:6px 8px;">Qtà</th><th style="padding:6px 8px;">Prezzo</th><th style="padding:6px 8px;text-align:right;">Totale</th></tr>` +
    data.items.map((i, idx) =>
      `<tr style="background:${idx % 2 === 0 ? "#f0fdf4" : "#fff"};">` +
      `<td style="padding:4px 8px;">${esc(i.productName)}</td>` +
      `<td style="padding:4px 8px;text-align:center;">${i.quantity}</td>` +
      `<td style="padding:4px 8px;text-align:center;">&euro;${i.unitPrice.toFixed(2)}</td>` +
      `<td style="padding:4px 8px;text-align:right;font-weight:600;">&euro;${i.totalPrice.toFixed(2)}</td></tr>`
    ).join("") +
    `<tr style="border-top:2px solid #2d6a4e;"><td colspan="3" style="padding:6px 8px;font-weight:700;">TOTALE</td>` +
    `<td style="padding:6px 8px;text-align:right;font-weight:700;">&euro;${data.totalAmount.toFixed(2)}</td></tr>` +
    `</table>` +
    `<p style="margin-top:12px;color:#666;font-size:12px;">ID ordine: ${data.orderId}</p>`;

  await transporter.sendMail({
    from: config.smtp.from,
    to: data.vendorEmail,
    subject: `[Farmy] Nuovo ordine da ${data.guestName} — ${data.vendorName}`,
    text,
    html,
  });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
