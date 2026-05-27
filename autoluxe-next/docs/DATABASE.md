# Database (Neon PostgreSQL)

The app uses **Drizzle ORM** with your Neon `DATABASE_URL` in `.env`.

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Admin + customer accounts |
| `cars` | Fleet / vendor vehicles (Indore) |
| `car_images` | Multiple ordered photo URLs per vehicle (slider + admin gallery) |
| `bookings` | Rental bookings & inquiries |
| `payments` | Stripe payment records (optional) |

Enums: `user_role`, `transmission`, `fuel_type`, `booking_status`, `payment_status`, `listing_approval_status`.

## Setup (first time or reset fleet)

```bash
npm run db:setup
```

This runs:

1. `drizzle-kit push` — creates/updates all tables on Neon
2. `tsx lib/db/seed.ts` — seeds 7 Indore cars + ensures admin user

## Commands

| Script | Action |
|--------|--------|
| `npm run db:push` | Apply schema only |
| `npm run db:seed` | Reload fleet data (clears cars/bookings/payments) |
| `npm run db:setup` | Push + seed |

## Default admin (after seed)

- **Email:** `admin@ubscarrental.in`
- **Password:** `admin123456`

Change the password after first login in production.

## Fleet data

Defined in `lib/db/india-fleet-data.ts` (7 vehicles, all `location: Indore`).
