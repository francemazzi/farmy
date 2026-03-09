# Farmy

Piattaforma per la gestione di aziende agricole e la vendita diretta: i **venditori** gestiscono magazzini, prodotti, calendari di spedizione e ordini; i **clienti** possono sfogliare lo storefront e ordinare.

## Stack

| Area      | Tecnologie |
|-----------|------------|
| Frontend  | React 19, Vite 6, React Router 7, TanStack Query, Zustand, Tailwind CSS 4, Lucide React |
| Backend   | Fastify 5, Prisma, SQLite, JWT, bcrypt, OpenAI (opzionale), xlsx |
| Deploy    | Docker, Docker Compose, nginx, Cloudflare Tunnel, backup cron |

## Struttura del progetto

```
farmy/
├── client/          # App React (Vite)
├── server/          # API Fastify + Prisma
├── scripts/         # Setup tunnel, deploy, backup, Raspberry
├── docker-compose.yml
└── .env
```

## Requisiti

- Node.js 18+
- npm (o pnpm/yarn)

## Setup locale

### 1. Variabili d’ambiente

Crea un file `.env` nella root del progetto:

```env
DATABASE_URL="file:./farmy.db"
JWT_SECRET="farmy-jwt-secret-change-in-production"
OPENAI_API_KEY="sk-..."   # opzionale, per funzionalità AI
```

Il server legge `.env` dalla root (due livelli sopra `server/src/`).

### 2. Database

```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

### 3. Avvio

**Terminale 1 – backend** (porta 7771):

```bash
cd server
npm run dev
```

**Terminale 2 – frontend** (porta 5173):

```bash
cd client
npm install
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173). Documentazione API: [http://localhost:7771/docs](http://localhost:7771/docs).

## Ruoli e funzionalità

- **Venditore (VENDITORE)**  
  Dashboard, aziende, magazzini, prodotti, stock, import da file (xlsx), calendari di spedizione, zone e slot di consegna, ordini, condivisione storefront.

- **Cliente (CLIENTE)**  
  Storefront per company (`/store/:companyId`), dettaglio prodotto, checkout, i miei ordini.

## Script principali

| Dove   | Comando        | Descrizione              |
|--------|----------------|---------------------------|
| server | `npm run dev`  | Backend in watch          |
| server | `npm run test` | Test (Vitest)             |
| server | `npm run db:studio` | Prisma Studio        |
| client | `npm run dev`  | Frontend Vite             |
| client | `npm run build`| Build produzione          |

## Deploy (Raspberry Pi)

Il `docker-compose.yml` definisce:

- **backend**: API Fastify (porta 7771), volumi per DB e upload
- **frontend**: build React servita da nginx (porta 8080)
- **cloudflared**: tunnel verso farm.formit.tech
- **backup**: cron giornaliero (script in `scripts/backup-cron.sh`)

Per produzione usa `.env.production` (non committato). Avvio:

```bash
docker compose up -d
```

Script utili in `scripts/`: `deploy.sh`, `backup.sh`, `setup-cloudflare-tunnel.sh`, `raspberry_config.py`.

## Licenza

Vedi [LICENSE](LICENSE).
