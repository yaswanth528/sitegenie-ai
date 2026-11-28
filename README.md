# SiteGenie

**Speak, and your shop is online.** A voice-first website and ordering tool for small shops in India.

- **Owner:** speaks for about 30 seconds (Kannada, Hindi, English or a mix) and gets a finished, designed shop site with products, prices and a WhatsApp order button. Later changes are spoken too.
- **Customer:** taps **Order by voice** on a shop page and says something like *"two kilo rice and one kaju katli 500 grams"*. The app shows what it heard as a list to check, then fills the cart.

Built for **Build for Bharat, Round 2** (theme: Livelihoods and small business) by team **The Insomniac**.

- Live site: https://sitegenie-ai.vercel.app
- Pitch deck, demo video and the submission itself are on the hackathon dashboard.

## Run it (Docker, no keys needed)

```bash
docker compose up --build
```

Open **http://localhost:3000**. The app starts and shows its main screen with no `.env` file and no secret keys. Features that need Gemini answer "GEMINI_API_KEY is not set" instead of crashing.

To turn voice on, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and run the same command again. Shop data is kept in a Docker volume (`sitegenie-data`). A GitHub Actions job (`.github/workflows/docker.yml`) runs `docker compose up` with no `.env` on every push and checks that the page loads.

Without Docker:

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

## What was built during the hackathon window (27-30 Nov 2026)

SiteGenie (the owner side: voice to website, editing, payments) existed before this round. The work for this round is below. Commit messages in the history match these names.

| Work | Where | Lines |
|---|---|---|
| **Order by voice**: matching logic (Gemini plus a plain-code matcher that needs no key), the safety check, English/Hindi/Kannada number words and spellings | `lib/voiceOrder.ts` | 256 |
| Voice-order panel: record or type, list to check, edit quantity and option, add to cart | `components/site/VoiceOrder.tsx` | 291 |
| Voice-order API: rate limit, validation, 12 s Gemini timeout, fallback to local matching | `app/api/voice-order/[slug]/route.ts` | 64 |
| 17 automated tests with a fake Gemini | `tests/voice-order.mock.test.mjs` | 254 |
| Run with `docker compose up` and no keys | `Dockerfile`, `docker-compose.yml`, `.github/workflows/docker.yml`, `next.config.ts` | about 90 |

Smaller changes: shop-page wiring in `components/site/SiteView.tsx`, `.s-vo-*` styles in `lib/siteCss.ts`, a `matchOrder` Gemini call in `lib/ai.ts`, a `voiceOrder` rate limit in `lib/ratelimit.ts`.

### How voice ordering works

1. The customer speaks (or types). Speech goes to `/api/transcribe` (Gemini).
2. `/api/voice-order/<slug>` loads the shop's saved items **on the server** and matches the sentence to them. Gemini does it when a key is set. If there is no key, no network, or Gemini finds nothing, `matchLocally` does it in plain code.
3. Both matchers feed one safety check, `resolveMatches`. It drops unknown items, marks sold-out items, clamps quantity to 1-99, and checks the chosen option.
4. The customer sees the list, can fix any line, and only then taps **Add to cart**.

Prices and products always come from the saved shop, never from the sentence or the browser.

### Try it

Voice ordering shows on a published shop page (`/p/<slug>`), not on the home-page preview. Creating a shop uses Gemini, so you need a `GEMINI_API_KEY` for that step. Then:

1. Open `/create`, speak or type a shop description with a few items and prices, and publish.
2. Open the public link, tap **Order by voice**, and speak or type an order.
3. Check the list, then tap **Add to cart**.

### Tests

```bash
node --import ./tests/helpers/register.mjs --test tests/
```

The tests use a fake Gemini (`tests/helpers/mock-gemini.mjs`), so they need no key and no network.

## The owner journey

1. **Speak** (`/create`): the phone records audio and Gemini transcribes it. You can also type.
2. **Extract**: Gemini turns the transcript into a business name, items and prices, and flags prices that may be misheard.
3. **Read-back**: the owner checks the list and fixes anything. Rules check that every item has a name and a price, with no negative prices and no duplicates.
4. **Publish**: the owner gets a public link (`/p/<slug>`) and a private edit link.
5. **Order**: customers tap **Order on WhatsApp**, which opens `wa.me/<owner>` with the item list filled in, or use **Order by voice** first.
6. **Voice edit** (`/p/<slug>/edit`): "change the kurti price to 799" becomes a patch. The owner sees a before and after, and the page changes only after they approve. The last 10 versions are kept for undo.

AI is used only for messy speech (transcription, planning, edits, order matching). Everything else is ordinary code.

## Stack

Next.js 16 (App Router), React 19, TypeScript, zod, Google Gemini (`@google/genai`), Cloudflare Pages and D1 for customer sites, Vercel for the app, Razorpay for payments (test mode), WhatsApp Cloud API for owner login codes.

## Storage

- No cloud settings: catalogues are written to `data/` on disk (this is what Docker uses, `STORAGE=local`).
- With Cloudflare D1 settings: sites and orders live in D1.
- With `GITHUB_TOKEN` + `GITHUB_REPO`: each publish or edit is a commit, so git history gives you undo. Required on Vercel only if D1 is not used, because the filesystem there is read-only.

## Settings (Vercel, Environment Variables)

None are needed to start the app. Each one turns on a feature.

| Variable | Turns on |
|---|---|
| `GEMINI_API_KEY` | Speech, website planning, translations, voice edits, voice-order matching |
| `UNSPLASH_ACCESS_KEY` / `PIXABAY_API_KEY` / `PEXELS_API_KEY` | Stock photos when the owner adds none |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Pages Edit, D1 Edit) | Separate customer websites and D1 storage |
| Same token with **Workers AI Read** (optional `CF_IMAGES_DAILY`, default 120) | AI product photos (FLUX), switching back to stock photos before the free daily allowance runs out |
| Vercel Blob store (**Public** access) with `BLOB_READ_WRITE_TOKEN` | Photo and video uploads |
| `ADMIN_PASSWORD` | Admin panel at `/admin` |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` + `AUTH_SECRET` | Owner login with a WhatsApp code |
| `CRON_SECRET` | Daily job: cleanup, renewal reminders, Sunday backup |
| `GITHUB_TOKEN` + `GITHUB_REPO` | Weekly database backups into a separate **private** repo; never point this at a public repo |
| `BREVO_API_KEY` + `ALERT_FROM_EMAIL` | New-order and renewal emails to owners |
| `SUPPORT_EMAIL` | Contact address on the Privacy and Terms pages (public) |

Variables only reach the site after a new deployment.

## Known limits

- Razorpay is in test mode. No real payment has gone through the flow yet.
- Each customer site is its own Cloudflare Pages project, so today's design holds about 100 sites. Shared hosting is planned before site 80.
- Voice ordering has been tested with a fake microphone and a fake Gemini. Real speech in Indian accents is still to be tested on real phones.
