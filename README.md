# Community Budget (Next.js)

The same system as before, with only the languages changed: **everything is now JavaScript**, in one Next.js project that you deploy to **Vercel**.

1. An **admin** registers the shopping list: each item with an estimated price and quantity. The sum of price × quantity is the **total budget**.
2. Any **member** records a purchase: the product, the quantity and the price actually paid.
3. The system deducts it from the budget, shows the **remaining balance** straight away, and keeps a history of **who bought what, for how much, and when**.

**Stack:** React (screens) · Next.js API routes (backend) · PostgreSQL (database, for example Neon on Vercel)

| Before | Now |
|---|---|
| React app (Vite) on Vercel | Same React screens, inside the Next.js app |
| PHP files on another host | Next.js API routes in `app/api/` (same endpoints, same rules) |
| MySQL | PostgreSQL |
| Login token kept in the browser | Login kept in a secure `httpOnly` cookie |
| CORS settings + `VITE_API_URL` | Nothing to set: screens and API are one website |

---

## What is inside

```
community-budget-next/
├── db/schema.sql              ← the 4 tables (run this once)
├── scripts/setup-db.mjs       ← "npm run db:setup" runs schema.sql for you
├── app/
│   ├── layout.js, page.js, globals.css, icon.svg
│   └── api/                   ← THE BACKEND
│       ├── auth/register|login|logout|me/route.js
│       ├── items/route.js            GET list · POST add          (admin)
│       ├── items/[id]/route.js       PUT edit · DELETE            (admin)
│       ├── purchases/route.js        GET history · POST record a purchase
│       ├── purchases/[id]/route.js   DELETE = void a purchase     (admin)
│       └── users/route.js, users/[id]/route.js   members          (admin)
├── lib/
│   ├── server/                ← database, login, budget maths (never sent to the browser)
│   └── client/                ← api.js (the only file the screens use to call the backend), format.js
├── hooks/useBudgetData.js     ← screen state: items, purchases, balance
└── components/                ← App, AuthPage, Main, BalanceCards, PurchaseForm,
                                 ItemForm, ItemsTable, HistoryTable, MembersPanel
```

---

## A. Put it online on Vercel (everything in one place)

You need: a GitHub account, a Vercel account (the one you already use).

**1. Upload the project to GitHub.** Create a new repository and push this folder to it. (`node_modules` and `.env.local` are already ignored.)

**2. Create the Vercel project.** Vercel dashboard → **Add New… → Project** → pick the repository → Vercel detects **Next.js** by itself → **Deploy**. (The first deploy will load but cannot log anyone in yet, because there is no database.)

> Want to reuse your old Vercel project? Replace its repository contents with this project, then open **Settings → Build & Development Settings** and set **Framework Preset = Next.js**. A new project is simpler.

**3. Add the database.** In your project: **Storage** tab → **Create Database** (or browse the Marketplace) → choose **Neon (Postgres)** → pick the free plan → connect it to the project. Vercel adds the connection string to the project as environment variable `DATABASE_URL` (check in **Settings → Environment Variables**; if it is named differently, add `DATABASE_URL` yourself with the same value).

**4. Create the tables.** Storage tab → open your database → **Database / Query** tab → paste the whole of `db/schema.sql` → **Run**. You should now see 4 tables: `users`, `auth_tokens`, `budget_items`, `transactions`. (It is safe to run it twice.)

**5. Set the other settings.** **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `INVITE_CODE` | a secret word your community knows (strongly recommended) |
| `NEXT_PUBLIC_CURRENCY` | `RWF` (or your currency) |
| `ALLOW_OVERSPEND` | optional: `true` lets purchases go over the budget (default `false`) |
| `SESSION_DAYS` | optional: how long a login lasts (default `14`) |

**6. Redeploy.** **Deployments** tab → three dots on the latest deployment → **Redeploy**. (Needed because `NEXT_PUBLIC_…` values are fixed at build time.)

**7. Create the admin account first.** Open your site → **Create an account**. **The first account ever registered becomes the admin.** Do this straight away. Everyone after is a member, and the admin can promote people in the **Members** tab.

---

## B. Run it on your computer

You need **Node.js 20.9 or newer** and a Postgres database. The easiest database is the same Neon database from step A3 (use its connection string below). A local Postgres works too: create an empty database, for example `community_budget`, and use a URL like `postgres://postgres:YOURPASSWORD@localhost:5432/community_budget`.

```bash
npm install
cp .env.example .env.local      # on Windows: copy .env.example .env.local
```

Open `.env.local` and paste your `DATABASE_URL`. Then:

```bash
npm run db:setup     # creates the tables
npm run dev          # opens on http://localhost:3000
```

Create the first account in the browser: it becomes the admin.

---

## How a purchase is calculated

When a member presses **Save purchase**, `POST /api/purchases` does this in one all-or-nothing database transaction:

1. Validates the quantity and price. A typed product that matches an item on the list (capitals ignored) is linked to it; otherwise it is saved as an **unplanned** purchase and still comes out of the same money.
2. Takes a short database lock, so two people paying at the same moment can never both spend the last money.
3. Computes the balance: **total budget − total spent**. A purchase bigger than what is left is refused with a clear message (unless `ALLOW_OVERSPEND=true`).
4. Saves the purchase with the user, price, quantity and time.
5. Returns the new `summary` (with the new remaining balance). The screen shows it immediately; other members' screens catch up within 20 seconds.

The balance is **always calculated from the saved purchases**, never stored, so it can't get out of step. A mistaken purchase is **voided** by an admin (Purchases tab): it stays in the history marked "Voided" and its money returns to the balance.

## API reference

JSON in and out. Everything except `register` and `login` needs a logged-in session (the cookie is sent automatically by the browser).

| Method | URL | Who | Body | Result |
|---|---|---|---|---|
| POST | `/api/auth/register` | anyone | `name, email, password, invite_code?` | `{user}` |
| POST | `/api/auth/login` | anyone | `email, password` | `{user}` |
| POST | `/api/auth/logout` | logged in | | `{ok}` |
| GET | `/api/auth/me` | logged in | | `{user}` |
| GET | `/api/items` | logged in | | `{items[], summary}` |
| POST | `/api/items` | admin | `name, estimated_price, quantity` | `{item, summary}` |
| PUT | `/api/items/:id` | admin | same as POST | `{item, summary}` |
| DELETE | `/api/items/:id` | admin | refused if the item has purchases | `{ok, summary}` |
| GET | `/api/purchases?limit=` | logged in | max 500 | `{purchases[]}` newest first |
| POST | `/api/purchases` | logged in | `budget_item_id?, item_name, quantity, amount_paid, note?` | `{purchase, summary, item}` |
| DELETE | `/api/purchases/:id` | admin | voids the purchase | `{purchase, summary, item}` |
| GET | `/api/users` | admin | | `{users[]}` |
| PATCH | `/api/users/:id` | admin | `role: "admin" \| "member"` | `{user}` |

`summary` = `{ total_budget, total_spent, remaining, item_count, purchase_count, allow_overspend }`.
`amount_paid` is the **total** paid for that purchase, not per unit.

## Security notes

- Passwords are stored as salted `scrypt` hashes. Login tokens are random, kept in an `httpOnly`, `SameSite=Lax` cookie (`Secure` on https), and only their SHA-256 hash is stored in the database.
- Requests that change data are refused when they come from a different website.
- **Set `INVITE_CODE`** before sharing the link, or strangers can create accounts.
- Not included (ideas for later): limits on failed login attempts, password reset by email, a record of money contributed by members, Excel/PDF export.

## Troubleshooting

| What you see | Likely cause |
|---|---|
| "Something went wrong on the server" on every action | `DATABASE_URL` is missing or wrong. In Vercel: Settings → Environment Variables, then redeploy. |
| Error mentioning `relation "users" does not exist` | The tables were not created. Do step A4 (or `npm run db:setup`). |
| Everything shows "RWF" even though you changed the currency | `NEXT_PUBLIC_CURRENCY` only applies after a **redeploy**. |
| You are the member, not the admin | Someone registered before you. In the database Query tab run: `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';` and refresh. |
| `npm run db:setup` says DATABASE_URL is not set | Create `.env.local` from `.env.example` and paste your connection string. |
