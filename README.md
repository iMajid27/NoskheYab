# نسخه یاب (Nuskhe Yab) — Prescription Routing System

A Persian-language pharmacy prescription routing platform. Patients submit prescriptions, pharmacies in their city respond with availability and pricing, and the patient accepts the best offer. Unavailable items cascade to other pharmacies automatically.

## Tech Stack

- **Framework**: Next.js 13.5 (App Router, React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL (standard `pg` driver, connection via `DATABASE_URL`)
- **Authentication**: JWT-based, phone + OTP login (bcrypt password hashing)
- **Icons**: lucide-react

## Prerequisites

- **Node.js** 18.x or 20.x
- **PostgreSQL** 14+ (installed locally, via Docker, or accessible remotely)
- **npm** (comes with Node.js)

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd nuskhe-yab
npm install
```

### 2. Start a local PostgreSQL database

**Option A — Docker (recommended for new developers):**

```bash
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5432` with database `nuskhe_yab`, user `nuskhe_yab`, password `nuskhe_yab_dev`. Data persists in a Docker volume.

**Option B — Existing PostgreSQL:**

Create a database and user manually, then set `DATABASE_URL` accordingly (see step 3).

### 3. Configure environment variables

Copy the example file and adjust values:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://nuskhe_yab:nuskhe_yab_dev@localhost:5432/nuskhe_yab
JWT_SECRET=generate-a-long-random-string-here
APP_URL=http://localhost:3000
```

> **Important**: Replace `JWT_SECRET` with a long random string for any non-development environment.

### 4. Set up the database

Run migrations and seed data:

```bash
npm run db:setup
```

Or run them separately:

```bash
npm run db:migrate   # Create tables
npm run db:seed       # Insert provinces, cities, admin user, default content
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Default admin login

- **Phone**: `09361342824`
- **Password**: `admin123`

> Change the admin password immediately after first login in any non-development environment.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Format: `postgresql://user:password@host:port/dbname` |
| `JWT_SECRET` | Yes | Secret key for signing JWT auth tokens. Use a long random string in production. |
| `APP_URL` | No | Application base URL (defaults to `http://localhost:3000`). Used for redirects and CORS. |
| `KAVENEGAR_API_KEY` | No | Kavenegar SMS API key. When set, OTP codes are sent via SMS instead of console log. |
| `KAVENEGAR_SENDER` | No | Kavenegar sender number for SMS. |

## Database

The database schema is defined in `db/migrations/001_initial_schema.sql` and seed data in `db/seed.sql`.

### Tables

- `users` — All users (patients, pharmacy admins, system admins) with phone, role, and password hash
- `provinces` / `cities` — Geographic data for prescription routing
- `pharmacies` — Pharmacy registrations with approval workflow
- `pharmacy_documents` — License and manager ID document references
- `prescriptions` — Patient prescription requests with tracking codes
- `prescription_items` — Individual medicine items within a prescription
- `pharmacy_responses` — Pharmacy offers responding to prescriptions
- `response_items` — Per-item availability and pricing within a response
- `orders` — Orders created when a patient accepts a pharmacy offer
- `otp_codes` — One-time passwords for phone verification
- `site_content` — Editable content for About Us and Contact Us pages

### User Roles

- `PATIENT` — Default role for new users via OTP login
- `PHARMACY_ADMIN` — Pharmacy owner who can respond to prescriptions
- `PHARMACY_USER` — Pharmacy staff (future)
- `ADMIN` — System administrator
- `SUPER_ADMIN` — Full administrative access

## Authentication

Authentication uses a phone + OTP flow:

1. User enters phone number → server generates a 6-digit code, stores it in `otp_codes` table
2. In development, the code is printed to the server console (no SMS provider configured)
3. When `KAVENEGAR_API_KEY` is set, codes are sent via Kavenegar SMS API
4. User verifies the code → server issues a JWT token stored in localStorage
5. JWT token is sent as `Authorization: Bearer <token>` header on all API requests
6. Server validates the token and checks user role for authorization

## Admin Authorization

Admin operations are enforced server-side via the `requireAdmin` function in `lib/admin-auth.ts`. This function:

1. Extracts the JWT from the request header
2. Verifies the token signature using `JWT_SECRET`
3. Loads the user from the database
4. Checks that the user's role is `ADMIN` or `SUPER_ADMIN`

No service-role keys or privileged database credentials are exposed to the browser. All sensitive operations go through the Next.js API routes which enforce authorization server-side.

## Production Deployment

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

### Deployment options

- **Docker**: Build a container image and run with `DATABASE_URL` and `JWT_SECRET` environment variables pointing to your production PostgreSQL instance.
- **Vercel/Netlify**: Connect the repository, set environment variables in the dashboard, and deploy. The `netlify.toml` file is pre-configured.
- **VPS/Cloud server**: Install Node.js, clone the repo, run `npm install`, `npm run build`, `npm start`. Use a process manager like PM2 and a reverse proxy like Nginx.

### Production checklist

- [ ] Set `JWT_SECRET` to a strong random string (at least 32 characters)
- [ ] Set `DATABASE_URL` to your production PostgreSQL connection string
- [ ] Set `APP_URL` to your production domain
- [ ] Run `npm run db:setup` against your production database
- [ ] Change the default admin password
- [ ] Configure `KAVENEGAR_API_KEY` and `KAVENEGAR_SENDER` for SMS delivery
- [ ] Set up HTTPS (via Nginx, Caddy, or your cloud provider's load balancer)

## Project Structure

```
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API routes (auth, prescriptions, admin, etc.)
│   ├── admin/             # Admin panel pages
│   ├── auth/              # Login page
│   ├── patient/           # Patient dashboard and prescription pages
│   ├── pharmacy/          # Pharmacy dashboard and registration
│   ├── about/             # About Us page (server-rendered, reads from DB)
│   └── contact/           # Contact Us page (server-rendered, reads from DB)
├── components/            # React components (navbar, theme, shadcn/ui)
├── db/
│   ├── migrations/        # SQL schema definition
│   └── seed.sql           # Initial data (provinces, cities, admin user, content)
├── lib/
│   ├── auth.ts            # JWT signing/verification, password hashing
│   ├── auth-context.tsx   # React context for client-side auth state
│   ├── admin-auth.ts      # Server-side admin authorization guard
│   └── db.ts              # PostgreSQL connection pool and query helpers
├── scripts/
│   └── db.js              # Database migration and seed runner
├── docker-compose.yml     # Local PostgreSQL for development
├── .env.example           # Template for environment variables
└── package.json
```

## Bolt (Optional)

This project can be developed inside [Bolt](https://bolt.new) as an optional development environment. Bolt is not required for any part of the application's infrastructure. The project runs identically with or without Bolt.
