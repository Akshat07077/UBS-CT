# UBs Car Rentals — CRM + Operations Platform

## 1. Existing repo audit (summary)

**Location:** `autoluxe-next` (Next.js 16 App Router, React 19, TypeScript)

### What already exists (reuse)

| Area | Status | Key paths |
|------|--------|-----------|
| Public site shell | ✅ | `app/(main)/`, `components/navbar.tsx`, `footer.tsx` |
| Car browse + detail | ✅ | `app/(main)/cars/`, `components/car-card.tsx` |
| Admin shell | ✅ | `app/admin/`, client role gate in `layout.tsx` |
| Fleet CRUD + moderation | ✅ | `app/admin/cars/`, `POST /api/cars/[id]/moderate` |
| Booking records | ✅ | `lib/booking-service.ts`, `app/api/bookings/` |
| List-your-car (basic) | ✅ | `app/(main)/list-your-car/`, `POST /api/peer-listings` |
| WhatsApp deep links | ✅ | `lib/whatsapp.ts` |
| Image upload | ✅ | `lib/upload-cloudinary.ts`, `app/api/upload/` |
| ShadCN-style UI | ✅ | `components/ui/*` |
| India pricing engine | ✅ | `lib/rental-listing.ts` |

### Gaps vs UBs CRM spec

| Requirement | Current state |
|-------------|---------------|
| **Inquiry-only booking** | Instant Stripe + WhatsApp both create `pending` bookings; Pay Now is primary UX |
| **CRM booking statuses** | `pending \| confirmed \| cancelled \| completed` — missing `new`, `contacted`, `active` |
| **Leads module** | No `leads` table; contact form is client-only fake submit |
| **Vendor submissions** | Merged into `cars` row; no RC/Insurance/PUC docs; single photo only |
| **Vehicle gallery** | Single `imageUrl` only |
| **Revenue dashboard** | Sums booking totals, not operational revenue records |
| **Notes + activity logs** | Not implemented |
| **No customer dashboard** | `/dashboard` exists for users |
| **Prisma + Neon** | Drizzle + `pg` today |
| **Server Actions** | All mutations via Route Handlers |
| **RHF + Zod forms** | Partial Zod on peer-listings only |
| **About / FAQ pages** | FAQ embedded in contact only |
| **Admin manual booking** | No create-booking UI in admin |
| **Middleware auth** | Client-only admin redirect |

### Tech debt to address in migration

1. SHA-256 passwords → bcrypt/argon2
2. Stripe/payments → **disable for Phase 1 MVP** (keep code behind feature flag)
3. `hostUserId` never set on peer create — vendor flow should use `VendorSubmission` first
4. Admin revenue ≠ collected cash
5. No `middleware.ts` for `/admin` and `/api` hardening

---

## 2. Target architecture

### Product split

```
┌─────────────────────────────────────────────────────────────┐
│                    UBs Car Rentals Platform                  │
├──────────────────────────┬──────────────────────────────────┤
│   PUBLIC WEBSITE         │   ADMIN CRM (main system)         │
│   (marketing + inquiry)  │   (operations + sales)            │
├──────────────────────────┼──────────────────────────────────┤
│ Home, Cars, About, FAQ   │ Dashboard, Leads, Bookings        │
│ Contact, List Your Car   │ Vehicles, Vendor Submissions      │
│ Booking inquiry form     │ Revenue, Settings, Activity       │
│ WhatsApp CTAs            │ Manual booking creation           │
└──────────────────────────┴──────────────────────────────────┘
         NO customer dashboard · NO vendor dashboard (Phase 1)
```

### Folder structure (incremental refactor)

```
autoluxe-next/
├── app/
│   ├── (public)/              # rename from (main) — public marketing site
│   │   ├── page.tsx
│   │   ├── cars/
│   │   ├── about/
│   │   ├── faq/
│   │   ├── contact/
│   │   ├── list-your-car/
│   │   └── booking-inquiry/   # replaces pay-now flow
│   ├── (crm)/admin/           # rename from admin — CRM routes
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── bookings/
│   │   ├── vehicles/
│   │   ├── vendor-submissions/
│   │   └── revenue/
│   └── api/                   # thin REST for client components; migrate hot paths to actions
├── actions/                   # Server Actions (auth, bookings, leads, vehicles)
├── components/
│   ├── public/
│   ├── crm/
│   └── ui/
├── lib/
│   ├── db/                    # Prisma client (replaces drizzle)
│   ├── domain/                # booking, lead, vehicle, vendor services
│   ├── validations/           # Zod schemas shared by actions + forms
│   ├── brand/                 # theme tokens from logo (CSS variables)
│   └── integrations/
│       └── whatsapp/          # links + future API hooks
├── prisma/
│   └── schema.prisma
└── docs/
```

### Data layer strategy

**Phase 0:** Add Prisma schema + Neon `DATABASE_URL`. Run `prisma db push` on fresh DB or migration from Drizzle.

**Phase 0.5:** Dual-read adapter (optional) — read legacy Drizzle tables while writing new Prisma models. **Recommended:** one-time data migration script `scripts/migrate-drizzle-to-prisma.ts` then remove Drizzle.

**Do not maintain Drizzle + Prisma long-term.**

### Auth

- Keep **iron-session** for admin-only sessions (simple, already works).
- **Admin-only accounts** in Phase 1; remove public register or gate it off.
- Add `middleware.ts` protecting `/admin` and verifying session on server for layouts.
- Upgrade password hashing to **bcrypt**.

### Booking model change

| Old (instant rental) | New (CRM inquiry) |
|----------------------|-------------------|
| Creates booking + Stripe | Creates **BookingInquiry** or `Booking` with status `NEW` |
| Guest token for payment | Inquiry reference ID for admin follow-up |
| Date overlap blocks car | **Soft hold** optional later; Phase 1: admin confirms availability manually |
| Auto pricing required | Estimated total optional; admin can override |

### Vendor submissions

Separate table **`VendorSubmission`** with document URLs (RC, insurance, PUC, images). On **approve**, create `Vehicle` + `VehicleImage[]` and link `approvedVehicleId`.

### WhatsApp (Phase 1)

- `lib/integrations/whatsapp/` — `buildInquiryUrl`, `buildLeadUrl`, config from env.
- No Meta Business API yet; structure `WhatsAppService` interface for future.

### Branding

- `lib/brand/config.ts` — placeholder HSL tokens until logo delivered.
- `app/globals.css` — CSS variables driven by config.
- Rebrand strings: LuxeCars/AutoLuxe → **UBs Car Rentals**.

---

## 3. Prisma data model (target)

See `prisma/schema.prisma` for full schema.

**Core entities:** `AdminUser`, `Vehicle`, `VehicleImage`, `Booking`, `Lead`, `VendorSubmission`, `VendorDocument`, `RevenueEntry`, `Note`, `ActivityLog`.

**Booking statuses:** `NEW`, `CONTACTED`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`.

**Lead statuses:** `NEW`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `LOST`.

---

## 4. Implementation plan

### Phase 0 — Foundation (Week 1)

- [ ] Add Prisma + Neon connection
- [ ] Implement `prisma/schema.prisma` + seed admin
- [ ] Migration script from Drizzle tables (if keeping data)
- [ ] `lib/db/prisma.ts` singleton
- [ ] `lib/brand/config.ts` + theme CSS variables
- [ ] `middleware.ts` admin protection
- [ ] bcrypt passwords
- [ ] Feature flag: `ENABLE_PAYMENTS=false` hide Stripe UI
- [ ] Remove/hide customer `/dashboard` from nav

### Phase 1 — Public MVP (Week 2)

- [ ] Rebrand navbar/footer/metadata
- [ ] `/about`, `/faq` pages
- [ ] Car listings: filters (brand, fuel, transmission, seats, price)
- [ ] Car detail: gallery, specs, inquiry CTA (no Pay Now)
- [ ] **Booking inquiry form** (RHF + Zod) → Server Action → DB + activity log
- [ ] Contact form → `Lead` persistence
- [ ] List your car: full fields + multi-doc upload structure
- [ ] WhatsApp buttons on inquiry success

### Phase 2 — Admin CRM MVP (Week 3–4)

- [ ] CRM layout: sidebar, analytics cards, responsive tables
- [ ] Dashboard: bookings, inquiries, revenue, vehicles, pending approvals
- [ ] **Leads** CRUD + status + notes
- [ ] **Bookings** table + filters + manual create (phone/WhatsApp/offline)
- [ ] **Vehicles** CRUD + featured flag + gallery upload
- [ ] **Vendor submissions** review queue + approve/reject + internal notes
- [ ] **Revenue** entries linked to confirmed/completed bookings
- [ ] Activity log on all admin mutations

### Phase 3 — Polish (Week 5)

- [ ] SEO metadata per page
- [ ] Email notification hooks (interface only)
- [ ] Export CSV for bookings/leads
- [ ] Dark/light theme polish from brand tokens
- [ ] Remove deprecated Drizzle + Stripe code paths

### Explicitly NOT in Phase 1

- Vendor dashboard, customer dashboard, payment gateway, AI, mobile app, live tracking

---

## 5. Module mapping: existing → target

| Existing | Target action |
|----------|---------------|
| `cars` table | `Vehicle` + `VehicleImage` |
| `bookings` | `Booking` with new status enum + inquiry fields (`pickupLocation`, `message`) |
| `peer-listings` API | `VendorSubmission` + documents |
| `payments` | Deprecate; `RevenueEntry` for manual/recorded revenue |
| `app/admin/*` | Expand to full CRM modules |
| `booking-dialog.tsx` | Replace with `InquiryBookingForm` |
| `use-auth` + register | Admin-only login |
| `lib/rental-listing.ts` | Keep pricing helpers; optional on inquiries |

---

## 6. Security checklist

- Server-side admin checks on every action (not client-only layout)
- Rate limit public form submissions (later: Upstash)
- Validate uploads (type, size) server-side
- Never expose admin notes on public APIs
- Environment secrets: `DATABASE_URL`, `SESSION_SECRET`, Cloudinary, WhatsApp number

---

## 7. Next development step

Start **Phase 0** in this order:

1. Install Prisma deps + `prisma generate`
2. Apply schema to Neon
3. Create `lib/db/prisma.ts` + domain services skeleton
4. Brand config + hide payments/dashboard
5. First Server Action: `submitBookingInquiry`
