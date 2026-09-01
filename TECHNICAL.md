# 🏺 Artisan Marketplace — Technical Documentation

> A full-stack AI-powered marketplace connecting Indian artisans directly with buyers,
> eliminating middlemen and empowering craft communities across India.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Framework & Language](#framework--language)
- [Database & ORM](#database--orm)
- [Authentication](#authentication)
- [AI & Machine Learning](#ai--machine-learning)
- [Speech-to-Text (STT)](#speech-to-text-stt)
- [Image Processing](#image-processing)
- [Pricing Engine](#pricing-engine)
- [Multilingual Support](#multilingual-support)
- [Order Management](#order-management)
- [QR Code](#qr-code)
- [Validation & Security](#validation--security)
- [Dev Tools](#dev-tools)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Data Flow Diagrams](#data-flow-diagrams)

---

## Architecture Overview

```
User (Mobile / Web Browser)
        ↓
 Vercel Edge Network (CDN)
        ↓
 Next.js 15 App Router (Serverless)
        ├── /app/*         → React 19 Pages (Client Components)
        └── /api/*         → API Routes (Serverless Functions)
              ├── /auth    → OTP Auth + JWT Sessions
              ├── /stt     → Speech-to-Text transcription
              ├── /ai      → LLM extraction & generation
              ├── /images  → Upload, remove-bg, enhance
              ├── /products → CRUD for artisan products
              ├── /orders  → Transactional order creation
              └── /marketplace → Public product listing
                        ↓
          Supabase PostgreSQL (Session Pooler, port 5432)
          Supabase Storage (Product Images)
```

---

## Framework & Language

| Layer | Technology | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | 15.5.25 |
| Language | **TypeScript** | 5.8 |
| UI Runtime | **React** | 19.0 |
| Styling | **Vanilla CSS** (CSS Variables, no Tailwind) | — |
| Deployment | **Vercel** (Serverless) | — |
| Package Manager | **npm** | — |

### Key Next.js Features Used
- **App Router** — file-based routing under `/src/app`
- **Server Components** — for data-fetching pages
- **Client Components** — `'use client'` for interactive UI
- **Route Handlers** — `/api/*` as serverless API endpoints
- **Dynamic Routes** — `[id]` segments for product/artisan pages
- **`React.use(params)`** — async params unwrapping (Next.js 15 pattern)

---

## Database & ORM

| Layer | Technology | Detail |
|---|---|---|
| Database | **PostgreSQL** | Hosted on Supabase |
| ORM | **Prisma** | v5.22, schema-first |
| Cloud Host | **Supabase** | `aws-0-ap-southeast-2` region |
| Connection Mode | Session Pooler | Port `5432` (supports prepared statements) |
| Schema Location | `prisma/schema.prisma` | Single-file schema |

### Key Database Models

| Model | Purpose |
|---|---|
| `User` | All users (Artisan / Customer / Admin) with phone auth |
| `Session` | JWT token storage with expiry |
| `ArtisanProfile` | Artisan details, craft type, language, onboarding status |
| `Product` | Product catalog with multilingual descriptions |
| `ProductImage` | Original + processed image URLs |
| `ProductCost` | Material, labour, other costs (in paisa) |
| `Inventory` | Stock levels, MOQ, reserved stock |
| `Order` | Order header (RETAIL / B2B) with atomic stock |
| `OrderItem` | Line items per order |
| `BuyerProfile` | Retail buyer delivery details |
| `B2BProfile` | Business buyer GST + business details |
| `DeliveryEstimate` | Calculated delivery window per order |
| `AudioTranscript` | Stored STT transcripts for audit |
| `AIExtraction` | Stored AI extraction results |
| `Notification` | In-app + SMS notifications |

### Prisma Config

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // Session pooler URL
}
```

> **Note:** All monetary values are stored in **paisa** (1 ₹ = 100 paisa) as integers to avoid floating-point errors.

---

## Authentication

| Step | Technology | Detail |
|---|---|---|
| OTP Delivery | **Twilio SMS** | Production mode |
| OTP Dev Mode | Hardcoded `123456` | Stateless, serverless-safe |
| Token Format | **JWT (Jose)** | HS256, signed with `JWT_SECRET` |
| Token Storage | HTTP-only cookie | `session` cookie, 7-day expiry |
| Session DB | Prisma `Session` table | Indexed by token |
| Auth Guard | `requireAuth()` | Throws `UNAUTHORIZED` if no valid session |

### Auth Flow

```
1. User enters phone number
2. POST /api/auth/send-otp  → Twilio sends SMS OTP
3. User enters OTP + selects role (Artisan / Customer)
4. POST /api/auth/verify-otp → Validates OTP
5. User found/created in DB
6. JWT created → stored in HTTP-only cookie
7. Redirect based on role:
   - New Artisan   → /language → /artisan/onboarding
   - Done Artisan  → /artisan/home
   - New Customer  → /customer/setup
   - Done Customer → /marketplace
```

---

## AI & Machine Learning

### Providers

| Priority | Provider | Model | Use Case |
|---|---|---|---|
| 1st | **Groq** | `llama-3.3-70b-versatile` | Ultra-fast LPU inference |
| 1st fallback | **Groq** | `llama-3.1-8b-instant` | Faster/lighter fallback |
| 2nd | **Google Gemini** | `gemini-2.0-flash` | Cloud LLM fallback |
| 2nd fallback | **Google Gemini** | `gemini-1.5-flash` | Older Gemini fallback |

> Groq is tried first. If it fails or times out (15s), Gemini is used automatically.

### AI Tasks

#### 1. Artisan Profile Extraction
- **Input:** Voice transcript (any Indian language)
- **Output:** Structured JSON — name, location, district, state, craft type, experience, story
- **Prompt rule:** Translate all values to English

#### 2. Product Detail Extraction
- **Input:** Voice transcript + optional typed notes
- **Output:** Structured JSON — product name, category, material, quantity, dimensions, color, weight, craft technique
- **Prompt rule:** Translate all values to English (e.g., `"रेशमी साड़ी"` → `"Silk Saree"`)

#### 3. Multilingual Description Generation
- **Input:** Artisan name, craft, location + extracted product data + original transcript
- **Output:** Separate JSON fields per language:

```json
{
  "title": "English product title",
  "shortDescription": "English summary",
  "longDescription": "2-3 paragraphs in ENGLISH ONLY",
  "descriptionHindi": "2-3 paragraphs in HINDI ONLY (हिंदी)",
  "descriptionRegional": "2-3 paragraphs in TAMIL/TELUGU/etc. ONLY",
  "highlights": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}
```

> **Critical rule enforced in prompt:** Each language goes in its OWN field. Languages must NEVER be mixed within a single field.

---

## Speech-to-Text (STT)

### Provider Priority

| Priority | Provider | Model | Languages |
|---|---|---|---|
| 1st | **Sarvam AI** | `saaras:v3` | 22 Indian languages + English |
| 2nd | **Groq Whisper** | `whisper-large-v3` | 100+ languages incl. Indian |
| 3rd | **OpenAI Whisper** | `whisper-1` | 100+ languages |

> For Indian languages (non-English), Sarvam AI is tried first as it is purpose-built for Indian speech.
> Groq Whisper (`GROQ_API_KEY`) is used as fast fallback — no extra key needed.

### Language Code Mapping

| Language | Code | Sarvam Code | Whisper Code |
|---|---|---|---|
| Tamil | `ta` | `ta-IN` | `ta` |
| Hindi | `hi` | `hi-IN` | `hi` |
| Telugu | `te` | `te-IN` | `te` |
| Kannada | `kn` | `kn-IN` | `kn` |
| Malayalam | `ml` | `ml-IN` | `ml` |
| English | `en` | `en-IN` | `en` |

### STT Flow

```
1. User speaks into browser mic
2. MediaRecorder captures audio as WebM blob
3. POST /api/stt/transcribe with audio + language hint
4. Try Sarvam AI saaras:v3
   └── On failure → Try Groq whisper-large-v3
         └── On failure → Try OpenAI whisper-1
5. Return transcript to frontend
6. Store transcript in AudioTranscript table
7. AI extracts structured data from transcript
```

---

## Image Processing

| Step | Technology | Detail |
|---|---|---|
| Upload | Next.js FormData API | Multipart form upload |
| Storage | **Supabase Storage** | Public bucket, permanent URLs |
| Background Removal | **Remove.bg API** | Removes background for clean product shots |
| Optimization | **Sharp** (npm) | Resize, compress, convert to WebP |
| Image Record | Prisma `ProductImage` | Stores original + processed URLs |

### Image Pipeline

```
1. Artisan captures photo (camera or gallery)
2. POST /api/products/upload-image
   → Upload to Supabase Storage (original)
   → Return originalUrl
3. POST /api/products/process-image
   → Download original
   → Remove.bg API removes background
   → Sharp resizes/optimizes
   → Upload processed image to Supabase Storage
   → Return processedUrl
4. Product page displays processedUrl (falls back to originalUrl)
```

---

## Pricing Engine

All pricing logic is **deterministic and backend-only**. Client-side prices are never trusted.

| Step | Logic | Detail |
|---|---|---|
| Cost Input | Material + Labour + Other costs | Entered by artisan in ₹ |
| Storage Unit | **Paisa** (Int) | Converted: `₹ × 100` |
| Min Price | `totalCost / (1 - minMargin)` | Default 20% margin |
| Max Price | `totalCost / (1 - maxMargin)` | Default 35% margin |
| Market Benchmark | Rule-based platform data | Amazon, Flipkart, Etsy ranges |
| Order Total | `unitPrice × quantity` | Calculated on backend at order time |

### Labour Cost Modes
- **Direct** — artisan enters total labour cost directly
- **Hourly** — hours × rate per hour
- **Daily** — days × daily rate

---

## Multilingual Support

| Layer | Technology | Languages Supported |
|---|---|---|
| UI Translations | `next-intl` + custom `translations.ts` | Tamil, Hindi, Telugu, Kannada, Malayalam, English |
| STT Language | Language code passed to STT provider | All 6 languages |
| AI Prompts | Language-aware prompts | All 6 languages |
| Product Descriptions | 3 separate DB fields | English, Hindi, Regional |
| Active Language | Stored in `localStorage` | Persists across sessions |

### Translation Coverage
- Onboarding page (voice recording, example prompts)
- Product creation wizard (all step labels, buttons)
- Error messages and loading states

---

## Order Management

| Step | Technology | Detail |
|---|---|---|
| Order Creation | Prisma `$transaction` | Serializable isolation level |
| Stock Decrement | Atomic DB operation | `currentStock - quantity` in same transaction |
| Price Calculation | Backend-only | Never trust client-submitted price |
| Order ID Format | `ORD-YYYYMMDD-XXXXX` | nanoid 5-char suffix |
| Order Types | `RETAIL` / `B2B` | Different validation rules |
| B2B Validation | GST format regex | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` |
| Delivery Estimate | `delivery-service.ts` | Deterministic calculation |
| Artisan Notification | **Twilio SMS** | Sent after order creation (non-blocking) |

### Order Flow

```
1. Customer selects product → Choose RETAIL or B2B
2. POST /api/orders/check-stock → Validate stock + MOQ
3. Customer fills delivery form
4. POST /api/orders (Serializable transaction):
   a. Lock inventory row
   b. Check stock again (double-validation)
   c. Validate artisan ≠ buyer
   d. Calculate total on backend
   e. Create Order + OrderItem records
   f. Create BuyerProfile / B2BProfile
   g. Decrement inventory stock atomically
   h. Auto-mark OUT_OF_STOCK if stock hits 0
   i. Calculate & store DeliveryEstimate
5. Send SMS notification to artisan (async, non-blocking)
6. Return order confirmation to customer
```

---

## QR Code

| Technology | Package | Detail |
|---|---|---|
| QR Generation | **qrcode** npm | Generates PNG QR code |
| QR Content | Artisan public profile URL | `https://domain.com/artisan/{artisanId}` |
| Artisan ID Format | `ART-{STATE}-{RANDOM5}` | e.g., `ART-TN-8F42K` |
| Use Case | Artisan can share QR at market stalls | Customers scan → view profile + products |

---

## Validation & Security

| Layer | Technology | Detail |
|---|---|---|
| Schema Validation | **Zod** | Shared between frontend and backend |
| ID Generation | **nanoid** | Order IDs, custom alphabet (no ambiguous chars) |
| UUID | **uuid** | Internal image record IDs |
| Auth Guard | `requireAuth()` | All protected API routes |
| Price Trust | Backend-calculated only | `sellingPrice` from DB, never from request body |
| Stock Race Condition | Serializable transactions | Prevents overselling under concurrent orders |
| Artisan Self-Order | Blocked in transaction | Artisan cannot order their own products |

---

## Dev Tools

| Tool | Version | Purpose |
|---|---|---|
| **Vitest** | 4.1 | Unit testing |
| **ESLint** | 9.22 | Code linting |
| **tsx** | 4.19 | Run TypeScript scripts (seed, migrations) |
| **Prisma CLI** | 5.22 | `db push`, `generate`, `seed` |
| **TypeScript** | 5.8 | Type checking |

---

## Environment Variables

```env
# ── Database ──────────────────────────────────────────
DATABASE_URL="postgresql://postgres.xxx:password@pooler.supabase.com:5432/postgres"

# ── Auth ──────────────────────────────────────────────
JWT_SECRET="your-secret-min-32-chars"
AUTH_PROVIDER="development"   # or "twilio"

# ── Twilio (OTP SMS) ──────────────────────────────────
TWILIO_ACCOUNT_SID="ACxxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_PHONE_NUMBER="+1234567890"

# ── Supabase Storage ──────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# ── AI Providers ──────────────────────────────────────
GROQ_API_KEY="gsk_xxxx"          # LLaMA 3.3 + Groq Whisper
GEMINI_API_KEY="AIzaSy..."       # Google Gemini fallback

# ── Speech-to-Text ────────────────────────────────────
SARVAM_API_KEY="xxxx"            # Sarvam AI (Indian languages)
OPENAI_API_KEY="sk-xxxx"         # OpenAI Whisper fallback

# ── Image Processing ──────────────────────────────────
REMOVEBG_API_KEY="xxxx"          # Remove.bg background removal
```

---

## Project Structure

```
artisan-marketplace/
├── prisma/
│   ├── schema.prisma          # Database schema (all models)
│   └── seed.ts                # Database seeding script
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes (serverless)
│   │   │   ├── auth/          # send-otp, verify-otp, session
│   │   │   ├── artisan/       # profile, onboarding, extract-profile
│   │   │   ├── products/      # CRUD, upload-image, process-image,
│   │   │   │                  # extract-details, generate-description
│   │   │   ├── marketplace/   # public product listing & detail
│   │   │   ├── orders/        # create order, check-stock
│   │   │   ├── pricing/       # price calculation
│   │   │   ├── stt/           # speech-to-text transcription
│   │   │   └── health/        # health check endpoint
│   │   │
│   │   ├── login/             # Phone OTP login page
│   │   ├── language/          # Language selection page
│   │   ├── artisan/
│   │   │   ├── onboarding/    # Voice-based profile creation
│   │   │   ├── home/          # Artisan dashboard
│   │   │   ├── products/new/  # 6-step product creation wizard
│   │   │   ├── orders/        # Received orders view
│   │   │   └── [id]/          # Public artisan profile + QR
│   │   ├── marketplace/
│   │   │   ├── page.tsx       # Product listing with filters
│   │   │   └── product/[id]/  # Product detail + order flow
│   │   └── customer/
│   │       └── setup/         # Customer profile setup
│   │
│   └── lib/                   # Shared utilities & services
│       ├── ai/                # AI service (Groq + Gemini)
│       ├── auth/              # Auth provider + session + JWT
│       ├── delivery/          # Delivery estimate calculator
│       ├── i18n/              # Translations (6 languages)
│       ├── inventory/         # Stock check service
│       ├── pricing/           # Pricing engine (paisa math)
│       ├── services/          # Notification service
│       ├── stt/               # STT provider (Sarvam + Groq + OpenAI)
│       ├── db.ts              # Prisma client singleton
│       └── validations.ts     # Zod schemas (shared)
│
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── TECHNICAL.md               # This file
└── next.config.ts
```

---

## Data Flow Diagrams

### Artisan Product Creation Flow

```
Artisan
  │
  ├─ 1. Take Product Photo
  │      → Upload → Supabase Storage (original)
  │      → Remove.bg → Sharp → Supabase Storage (processed)
  │
  ├─ 2. Speak About Product (Tamil/Hindi/etc.)
  │      → MediaRecorder → WebM blob
  │      → Sarvam AI saaras:v3 → Transcript
  │      → (fallback) Groq whisper-large-v3
  │
  ├─ 3. AI Extracts Product Details
  │      → Groq LLaMA 3.3-70B
  │      → JSON: {productName, material, category, ...}
  │
  ├─ 4. Artisan Reviews & Edits Extracted Details
  │
  ├─ 5. AI Generates Multilingual Descriptions
  │      → English longDescription
  │      → Hindi descriptionHindi
  │      → Tamil/Telugu/etc. descriptionRegional
  │
  ├─ 6. Artisan Enters Costs
  │      → Material + Labour + Other
  │      → Backend calculates min/max selling price
  │
  └─ 7. Artisan Sets Selling Price → Publish
         → Product saved to DB (status: PUBLISHED)
         → Inventory record created
```

### Customer Order Flow

```
Customer
  │
  ├─ 1. Browse Marketplace → Filter by category/price
  │
  ├─ 2. Click Product → View multilingual description
  │
  ├─ 3. Choose Order Type: RETAIL or B2B
  │      RETAIL → Fill name, phone, address
  │      B2B    → Fill business name, GST, phone, address
  │
  ├─ 4. POST /api/orders (Serializable Transaction)
  │      → Validate stock
  │      → Calculate total on backend
  │      → Create Order + OrderItem
  │      → Decrement inventory atomically
  │      → Store DeliveryEstimate
  │
  └─ 5. Artisan receives SMS notification via Twilio
         Customer sees Order Confirmation screen
```

---

*Built with ❤️ to empower Indian artisans — Kaivinyam Marketplace*
