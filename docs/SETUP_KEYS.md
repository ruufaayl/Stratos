# STRATOS — Production keys setup

This walks through getting **Clerk**, **Stripe**, and **Resend** into a state
where you can `vercel --prod` and ship.

Order matters: Clerk first (auth gates everything), Stripe second (billing
depends on Clerk userId), Resend last (digest depends on Stripe tier).

Time budget: **~30 minutes** end-to-end if you don't already have the accounts.

---

## 1) Clerk — authentication (≈ 5 min)

You're currently in **keyless mode** — Clerk generates ephemeral keys per
session, which works locally but means you don't own the user accounts.

### Steps

1. **Visit the claim URL** that printed in your `pnpm dev` logs. It looks like
   `https://dashboard.clerk.com/apps/claim?token=...`
2. **Sign in / sign up** on the Clerk dashboard
3. **Confirm "Claim this app"** — it ports the keyless app to your Clerk org
4. From the app dashboard, click **API Keys** → copy:
   - `Publishable key` → `pk_test_xxx...`
   - `Secret key` → `sk_test_xxx...`
5. Paste into `C:\dev\stratos\.env.local`:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx..."
   CLERK_SECRET_KEY="sk_test_xxx..."
   ```

6. Restart `pnpm dev` so the env vars reload. The yellow "keyless mode"
   banner disappears.

### Verify

Visit `/sign-up`, create a test account, then `/dashboard`. Empty state
should render (with the "Connect AWS account" button). UserButton in the
header shows your avatar.

### Going live later

When you're ready to flip to production users:

1. In Clerk dashboard, click **Domains** → add `stratoscloud.io`
2. Use **Production Instance** API keys (start with `pk_live_` / `sk_live_`)
3. Configure email + social providers under **User & Authentication**

---

## 2) Stripe — billing (≈ 15 min)

You'll do this in **test mode** first (safe, no real charges). Switch to
live mode later by repeating with live keys.

### Steps

#### A. Account + keys (3 min)

1. Sign up at <https://dashboard.stripe.com> (or log in if you have it)
2. **Top-right** — confirm you're in **Test mode** (toggle should be ON)
3. **Developers → API keys** → reveal both:
   - `Publishable key` → `pk_test_xxx...`
   - `Secret key` → `sk_test_xxx...`
4. Paste into `.env.local`:

   ```
   STRIPE_SECRET_KEY="sk_test_xxx..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx..."
   ```

#### B. Create the Pro product (3 min)

1. **Products → + Add product**
2. Name: `Stratos Pro`
3. Description: `AI-native cloud cost intelligence — read-only AWS analysis`
4. **Pricing:**
   - Model: **Recurring**
   - Price: `199.00 USD`
   - Billing period: **Monthly**
5. **Save product**
6. After save, click into the product → copy the **Price ID** (starts with
   `price_xxx...`)
7. Paste into `.env.local`:

   ```
   STRIPE_PRO_PRICE_ID="price_xxx..."
   ```

#### C. Webhook for `/api/stripe/webhook` (5 min)

The webhook is the *only* path that writes `accounts.tier = 'pro'`. Without
it, customers pay but don't get upgraded.

**For local development** — use the Stripe CLI:

```powershell
# Install Stripe CLI (one-time)
scoop install stripe   # or: winget install --id Stripe.StripeCLI

# Login to your test account
stripe login

# Forward webhooks to your local dev server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret. Copy it:

```
STRIPE_WEBHOOK_SECRET="whsec_xxx..."
```

Leave the `stripe listen` process running in its own terminal — every test
event proxies through it.

**For production (Vercel)** — register the real webhook endpoint:

1. **Developers → Webhooks → + Add endpoint**
2. URL: `https://stratoscloud.io/api/stripe/webhook`
3. **Events to send** (check these):
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated` (optional, for plan changes)
4. **Save**, then click the endpoint to reveal its **Signing secret**
5. Add to Vercel env (not `.env.local`): `STRIPE_WEBHOOK_SECRET=whsec_xxx...`

#### D. Test the flow (4 min)

1. Run `pnpm dev` and `stripe listen` in two terminals
2. Visit `/pricing` while signed in
3. Click **Upgrade to Pro →**
4. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
5. Complete checkout → redirected to `/dashboard?upgraded=1`
6. Check the `stripe listen` terminal — you'll see `checkout.session.completed`
7. Query the DB to confirm tier upgrade:

   ```sql
   SELECT clerk_user_id, name, tier, stripe_customer_id FROM accounts;
   ```

If `tier = 'pro'`, billing is wired correctly.

### Going live later

1. Toggle to **Live mode** in the Stripe dashboard (top-right)
2. Repeat all of section A–C with live keys (`pk_live_`, `sk_live_`, fresh `price_`)
3. Add live keys to Vercel env vars
4. **First real charge will be real money.** Test it with your own card; refund yourself.

---

## 3) Resend — weekly email digest (≈ 5 min)

The digest cron runs every Monday 09:00 UTC and emails Pro users their top
opportunities for the week.

### Steps

1. Sign up at <https://resend.com> (free tier: 100 emails/day, 3K/month — fine for launch)
2. **API Keys → + Create API key**
   - Name: `stratos-prod` (or `stratos-dev`)
   - Permission: **Sending access**
   - Domain: leave as "All domains" for now
3. Copy the key (starts with `re_xxx...`) — **shown only once**
4. Paste into `.env.local`:

   ```
   RESEND_API_KEY="re_xxx..."
   ```

### Domain verification (production only)

For testing, Resend lets you send *to your own verified email* using their
`onboarding@resend.dev` sender. Good enough for end-to-end testing right now.

For production, you need to send `from: digest@stratoscloud.io`:

1. **Domains → + Add domain** → enter `stratoscloud.io`
2. Resend gives you 3 DNS records (DKIM, SPF, return-path). Add them to
   your DNS provider (Cloudflare, Namecheap, etc.)
3. Click **Verify** — propagation usually takes < 10 minutes
4. The `from` address in `app/api/digest/route.ts` will now work

### Test the digest

After upgrading a test user to Pro and running an analysis:

```powershell
# Local — needs ngrok or similar if your dev server isn't public
curl -X POST http://localhost:3000/api/digest `
  -H "Content-Type: application/json" `
  -d '{\"userId\":\"user_xxx_from_clerk\",\"email\":\"you@example.com\"}'
```

You should get a real email in your inbox within a few seconds — dark-themed
HTML, dollar headline, top 5 opportunities.

### Optional: cron for production

`vercel.json` already declares the cron at Monday 09:00 UTC. On deploy,
Vercel auto-registers it. Add a `CRON_SECRET` env var in Vercel project
settings to protect the endpoint:

```
CRON_SECRET="<some-long-random-string>"
```

---

## 4) Deploy to Vercel (≈ 5 min)

Once all three are set in `.env.local` and working locally:

```powershell
cd C:\dev\stratos\apps\web
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard (recommended — git push
auto-deploys).

**Critical**: set all env vars in **Vercel project settings → Environment
Variables**. Vercel does NOT read `.env.local`. Variables to add:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon dashboard |
| `DATABASE_URL_UNPOOLED` | Neon dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `ENGINE_URL` | Your Modal/Fly engine URL (or temp Vercel function) |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint (the prod one, not CLI) |
| `STRIPE_PRO_PRICE_ID` | Stripe product page |
| `RESEND_API_KEY` | Resend dashboard |
| `CRON_SECRET` | self-generated random string |
| `NEXT_PUBLIC_APP_URL` | `https://stratoscloud.io` (or vercel.app URL) |

---

## Sanity checklist before Show HN

- [ ] `/proof` renders the **real $7.1M Azure headline** (not the $1,262 synthetic)
- [ ] `/sign-up` works end-to-end with a real Clerk account
- [ ] `/pricing` → Stripe checkout → returns to `/dashboard?upgraded=1`
- [ ] DB shows `tier='pro'` for the upgraded user
- [ ] `POST /api/digest` sends a real email to your inbox
- [ ] `/onboarding` step 1 (name) works (the IAM verify step needs `STRATOS_AWS_PRINCIPAL` + a real cross-account role — fine to defer)
- [ ] `engine/health` returns 200 on production engine URL
- [ ] NOTICE + PROVENANCE.md committed (license-clean)
- [ ] 45/45 engine tests green in CI (TODO: add the GitHub Actions workflow)

When all checked: post to HN.
