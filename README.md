# GyanDistro

A complete, production-shaped blogging platform on the MERN stack, written end to end in
TypeScript. Roles and permissions, threaded comments, categories and tags, an editorial
review queue, a provider-agnostic AI assistant, and three monetisation channels built in
rather than bolted on.

- **Front end** — React 18 + TypeScript + Vite + React Router
- **Back end** — Node + Express 4 + TypeScript
- **Database** — MongoDB with Mongoose
- **Auth** — JWT access tokens plus rotating refresh tokens in httpOnly cookies

New here? Read **[GETTING_STARTED.md](./GETTING_STARTED.md)** — it gets you running in
about five minutes. This file explains how the whole thing is put together.

---

## Contents

1. [What it does](#what-it-does)
2. [Folder map](#folder-map)
3. [Every file, explained](#every-file-explained)
4. [Running it](#running-it)
5. [How the security works](#how-the-security-works)
6. [Roles and permissions](#roles-and-permissions)
7. [Making money from it](#making-money-from-it)
8. [The AI layer](#the-ai-layer)
9. [API reference](#api-reference)
10. [Deploying](#deploying)
11. [Where to take it next](#where-to-take-it-next)

---

## What it does

| Area | What is in the box |
| --- | --- |
| Accounts | Register, sign in, sign out, sign out everywhere, change password, public author pages |
| Roles | reader → author → editor → admin, enforced on every route |
| Articles | Full CRUD, draft → pending → published → archived, reading time, view counts, likes, featured flag |
| Taxonomy | Categories with colours and counts; tags created on the fly from the editor |
| Comments | Threaded three levels deep, soft delete, moderation queue, optional AI screening |
| Discovery | Full-text search, filter by category or tag, sort by newest / most read / most discussed, pagination |
| Pages | Home, article, author, About, sign in, register, dashboard, editor, admin |
| Chrome | Sticky header with mobile menu, footer with newsletter signup and social links |
| Money | Weighted display ad slots with impression and click tracking, sponsored-article labelling, affiliate disclosure |
| AI | Summaries, headline ideas, excerpts, tags, SEO fields, draft tightening, comment moderation |
| Security | Helmet, CORS whitelist, rate limiting, HTML sanitising, brute-force lockout, token rotation |

---

## Folder map

```
gyandistro/
├── package.json              Root scripts: setup, dev, seed, build
├── README.md                 This file
├── GETTING_STARTED.md        Five-minute setup
│
├── server/                   Express + MongoDB API
│   ├── .env.example          Copy to .env and fill in
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          Boots the server, handles shutdown
│       ├── app.ts            Express instance and middleware order
│       ├── config/           Environment and database connection
│       ├── models/           Mongoose schemas
│       ├── middleware/       Auth, validation, rate limits, errors
│       ├── controllers/      The actual logic per feature
│       ├── routes/           URL → controller wiring
│       ├── services/         Tokens and the AI adapter
│       ├── utils/            Slugs, sanitising, paging, error class
│       ├── types/            Express Request augmentation
│       └── seed/seed.ts      Demo content
│
└── client/                   React front end
    ├── .env.example
    ├── index.html            Fonts and metadata
    ├── vite.config.ts        Dev server and /api proxy
    ├── tsconfig.json
    └── src/
        ├── main.tsx          Mounts React, providers, router
        ├── App.tsx           Route table
        ├── styles.css        The whole design system
        ├── types.ts          Shared TypeScript shapes
        ├── lib/api.ts        Fetch wrapper with silent token refresh
        ├── context/          Auth state
        ├── components/       Header, Footer, cards, comments, ads
        └── pages/            One file per screen
```

---

## Every file, explained

### Server — configuration

**`server/src/config/env.ts`** reads `.env` once and exports a typed `env` object. If a
required variable is missing the process refuses to start, which is much easier to debug
than a mysterious failure three screens later.

**`server/src/config/db.ts`** opens the single Mongoose connection and logs connect,
error and disconnect events. `autoIndex` is on in development and off in production,
where indexes should be created deliberately.

### Server — models

**`User.ts`** — name, email, password hash, role, bio, avatar, six social links, plus the
brute-force fields. The password hash and lockout fields carry `select: false`, so they
never leak into an ordinary query result. A `pre('save')` hook hashes the password with
bcrypt at cost 12, and only when it changed.

**`Post.ts`** — the article. Title, unique slug, excerpt, sanitised HTML body, cover
image, author, category, tags, status, reading time, views, likes, comment count, the
sponsored / affiliate flags, and an SEO sub-document. Two indexes matter: a text index
across title, excerpt and body for the search box, and a compound `status + publishedAt`
index for the default feed.

**`Category.ts` / `Tag.ts`** — name, slug, and a cached `postCount` refreshed whenever a
post is written, so listings do not have to count on every request.

**`Comment.ts`** — post, author, optional parent, depth, body, status, likes. Threading
is a parent pointer plus a depth number rather than nested arrays; the tree is assembled
in one pass when it is read.

**`Ad.ts`** — an ad unit: internal name, slot, image-or-HTML creative, rotation weight,
active flag, impressions, clicks, and an optional run window.

**`RefreshToken.ts`** — one row per issued refresh token, storing the **SHA-256 hash**
rather than the token. A TTL index makes Mongo delete expired rows on its own.

**`Newsletter.ts`** — email addresses from the footer form.

### Server — middleware

**`auth.ts`** — `requireAuth` rejects a request without a valid access token,
`optionalAuth` attaches the user when there is one and never rejects (used on public
routes so an editor can see their own drafts), and `requireRole('editor', 'admin')` gates
by role. `hasAtLeast` compares roles by rank.

**`validate.ts`** — takes a Zod schema and validates the body, query or params. Failures
come back as `{ field, message }` pairs, which is exactly what the forms render.

**`rateLimit.ts`** — four ceilings: 900 requests per 15 minutes site-wide, 12 per 15
minutes on sign-in and sign-up, 30 per minute on writes, 10 per minute on AI calls.

**`error.ts`** — one place that turns anything thrown into a consistent JSON body. It
translates Mongo duplicate-key errors into "that email is already taken", turns Mongoose
validation errors into field lists, and strips stack traces in production.

### Server — controllers

**`auth.controller.ts`** — register, login, refresh, logout, logout-everywhere, me. The
first account ever created is promoted to admin automatically. Wrong credentials always
return the same message whether or not the email exists, so the endpoint cannot be used
to find out who has an account.

**`post.controller.ts`** — listing with filters and paging, fetch by slug (or by id, for
the editor), create, update, delete, like, and the home-page counters. Categories and
tags are created on demand from whatever the author typed. Authors who choose "Published"
get `pending` instead; only editors and admins can push something live.

**`comment.controller.ts`** — reads the flat list and returns a tree, enforces the
three-level depth cap, runs AI moderation before publishing, and soft-deletes so replies
survive.

**`taxonomy.controller.ts`** — category CRUD and tag listing. A category with articles in
it cannot be deleted.

**`user.controller.ts`** — profile edits, password change (which revokes every other
session), public author page, and the admin user list with role and activation controls.

**`ad.controller.ts`** — serves one weighted-random live creative per slot, counts
impressions and clicks, and gives admins CRUD with a click-through rate column.

**`ai.controller.ts`** — thin HTTP layer over the AI service.

### Server — services and utils

**`token.service.ts`** — signs and verifies access tokens; issues, rotates and revokes
refresh tokens. Rotation means redeeming a refresh token retires it and returns a new
one, so a stolen token works at most once.

**`ai.service.ts`** — one adapter over Ollama, OpenAI and Anthropic. Everything else
calls `complete(system, user)` and never learns which model answered. `AI_PROVIDER=none`
turns the whole layer off cleanly.

**`sanitize.ts`** — the main defence against stored XSS. Post bodies keep formatting tags
and lose anything executable; comments are reduced to plain text. Also computes reading
time and auto-excerpts.

**`slug.ts`**, **`pagination.ts`**, **`ApiError.ts`**, **`asyncHandler.ts`** — unique slug
generation, page metadata, the typed HTTP error class, and the wrapper that routes a
rejected promise into the error middleware.

### Client

**`lib/api.ts`** — the single fetch wrapper. The access token lives **in a module
variable, never in localStorage**, so an injected script has nothing to read. On a 401 it
refreshes once and retries, and concurrent 401s share one refresh call.

**`context/AuthContext.tsx`** — holds the current user. On page load there is no token in
memory, so it tries a refresh once; if the cookie is still good the session comes back
silently.

**`components/`** — `Header` (sticky, mobile menu, role-aware links), `Footer`
(newsletter, social, links, an ad slot), `AdSlot` (fetches one creative, renders nothing
if the slot is empty), `PostCard`, `Pagination`, `Avatar`, `CommentThread` (recursive,
with inline reply forms), `SocialLinks`, `ProtectedRoute`.

**`pages/`** — `Home` (hero, counters, featured pick, filtered feed, sidebar),
`Article` (body split around an in-article ad, likes, tags, author box, comments),
`About` (mission, advertising rates, disclosure, privacy), `Login`, `Register` (live
password rules), `Dashboard` (your articles, profile, security), `Editor` (the write
screen with the assistant panel), `Admin` (review queue, users, sections, advertising),
`Author`, `NotFound`.

**`styles.css`** — the design system in one file. Indigo ink on cool paper, marigold and
rani-pink accents, Bricolage Grotesque for display, Newsreader for reading, JetBrains
Mono for data. The recurring device is the **rail**: a marigold hairline down the left
gutter with a square node at every section heading.

---

## Running it

```bash
npm run setup     # install everything
npm run seed      # demo content (needs server/.env first)
npm run dev       # API on :5000, site on :5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Both halves with hot reload |
| `npm run build` | Compiles the API to `server/dist` and the site to `client/dist` |
| `npm start` | Runs the compiled API |
| `npm run seed` | Wipes and refills the demo data |
| `npm run typecheck` | TypeScript across both halves |

---

## How the security works

**Passwords** are bcrypt hashes at cost 12, never stored or logged in the clear, and
excluded from queries by default.

**Access tokens** are JWTs that live fifteen minutes and stay in memory on the client.
Short life is the point: a stolen access token cannot be revoked, so it should not be
worth much.

**Refresh tokens** are random 48-byte strings in an httpOnly, SameSite, Secure-in-
production cookie scoped to `/api/auth`. The database stores only their SHA-256 hash, and
every redemption issues a new one and retires the old. Changing a password, changing a
role, or deactivating an account revokes all of them.

**Brute force** — five wrong passwords locks an account for fifteen minutes, on top of
the twelve-attempts-per-15-minutes limit on the endpoint itself.

**Stored XSS** — every post body passes through an allow-list sanitiser on save.
Comments are stripped to plain text. External links get `rel="noopener noreferrer"`.

**Headers** — Helmet sets a Content-Security-Policy, HSTS in production, `nosniff`, and
`frame-ancestors 'none'`. `x-powered-by` is off.

**CORS** is a whitelist read from `CLIENT_ORIGIN`, with credentials allowed only for
listed origins.

**Injection** — Mongoose casts and validates every query input, and Zod validates the
shape of every request body before a controller runs.

**Authorisation** is checked on the server for every request. The client-side
`ProtectedRoute` only hides screens; it is convenience, not protection.

---

## Roles and permissions

| | reader | author | editor | admin |
| --- | :-: | :-: | :-: | :-: |
| Read, comment, reply, like | ✓ | ✓ | ✓ | ✓ |
| Write and edit own articles | | ✓ | ✓ | ✓ |
| Publish directly | | | ✓ | ✓ |
| Edit and delete anyone's article | | | ✓ | ✓ |
| Moderate comments | | | ✓ | ✓ |
| Feature on the home page | | | ✓ | ✓ |
| Manage categories | | | ✓ | ✓ |
| Manage users and roles | | | | ✓ |
| Manage advertising | | | | ✓ |

The first account created on a fresh database becomes the admin.

---

## Making money from it

Three channels are wired in, and all three are labelled where a reader meets them —
that is a legal requirement in most markets and the reason readers keep trusting you.

**1. Display advertising.** Five slots: `header`, `sidebar`, `in-article`, `below-post`,
`footer`. Create units under **Admin → Advertising** as either an image creative with a
click-through URL, or pasted network code (AdSense, Ezoic, Media.net, a direct sponsor's
tag). Rotation is weighted, and every unit tracks impressions, clicks and CTR.

**2. Sponsored articles.** Tick the box in the editor and name the sponsor. The article
carries a "Sponsored by X" chip in its header and in every listing.

**3. Affiliate links.** Tick the box and a disclosure panel appears at the foot of the
article body. The footer carries a site-wide disclosure too.

A fourth channel is half-built: the newsletter form collects confirmed-optional
subscribers into the `newslettersubscribers` collection, ready to export into Mailchimp,
Buttondown or Listmonk when you want a sponsored newsletter slot.

Practical order of operations: publish consistently for a few months, apply to an ad
network once you have steady traffic, add affiliate links where they genuinely fit, and
only then sell direct sponsorships — direct deals pay far better but need a media kit and
real numbers, which the impression counters give you.

---

## The AI layer

Everything routes through `services/ai.service.ts`, so switching providers is one line in
`.env`.

| Provider | Set | Cost |
| --- | --- | --- |
| Ollama | `AI_PROVIDER=ollama`, `AI_MODEL=llama3.1:8b` | Free, runs on your machine |
| OpenAI | `AI_PROVIDER=openai`, `OPENAI_API_KEY=...` | Per token |
| Anthropic | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...` | Per token |
| Off | `AI_PROVIDER=none` | Free — the assistant panel explains it is off |

In the editor: headline options, an excerpt, tag suggestions, the SEO fields, and a
tightening pass over the draft. Nothing is applied without a click, and nothing is saved
until you press save.

In the background: comment moderation. It **fails open** — if the provider is off, slow
or unreachable, comments still post. A blocked comment goes to `pending` and shows up in
the admin review queue rather than disappearing.

The design assumption throughout is that AI is a desk assistant, not an author. Every
published word still has a named human behind it, which is what the About page promises
readers.

---

## API reference

All routes are under `/api`. Auth is `Authorization: Bearer <access token>`.

### Auth
| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | refresh cookie |
| POST | `/auth/logout` | public |
| POST | `/auth/logout-all` | signed in |
| GET | `/auth/me` | signed in |

### Posts
| Method | Path | Access |
| --- | --- | --- |
| GET | `/posts` | public — `?page,limit,category,tag,author,search,status,featured,sort` |
| GET | `/posts/stats` | public |
| GET | `/posts/:slugOrId` | public (drafts need the owner or an editor) |
| POST | `/posts` | author+ |
| PUT | `/posts/:id` | owner or editor+ |
| DELETE | `/posts/:id` | owner or editor+ |
| POST | `/posts/:id/like` | signed in |

### Comments
| Method | Path | Access |
| --- | --- | --- |
| GET | `/posts/:slug/comments` | public |
| POST | `/posts/:slug/comments` | signed in |
| DELETE | `/comments/:id` | owner or editor+ |
| GET | `/comments/pending` | editor+ |
| PATCH | `/comments/:id/status` | editor+ |

### Taxonomy, users, ads, AI, newsletter
| Method | Path | Access |
| --- | --- | --- |
| GET | `/categories`, `/tags` | public |
| POST/PUT | `/categories`, `/categories/:id` | editor+ |
| DELETE | `/categories/:id`, `/tags/:id` | admin |
| GET | `/users/:id` | public author profile |
| PUT | `/users/me`, `/users/me/password` | signed in |
| GET | `/users` | admin |
| PATCH | `/users/:id/role`, `/users/:id/active` | admin |
| GET | `/ads/serve/:placement` | public |
| POST | `/ads/:id/click` | public |
| GET/POST/PUT/DELETE | `/ads` | admin |
| GET | `/ai/status` | public |
| POST | `/ai/summarise\|excerpt\|titles\|tags\|seo\|improve` | author+ |
| POST | `/newsletter` | public |
| GET | `/newsletter` | admin |

Every response follows the same shape:

```json
{ "success": true, "data": {}, "meta": {} }
{ "success": false, "message": "...", "details": [{ "field": "email", "message": "..." }] }
```

---

## Deploying

**Build**

```bash
npm run build
```

**API** — Render, Railway, Fly.io, or any VPS. Set every variable from `.env.example`,
with `NODE_ENV=production`, real secrets, and `CLIENT_ORIGIN` set to your exact site
origin. Start command: `node dist/index.js` from `server/`.

**Site** — `client/dist` is a static bundle for Netlify, Vercel, Cloudflare Pages or
Nginx. Set `VITE_API_BASE_URL` to the deployed API origin before building. Add a rewrite
so every path serves `index.html`, otherwise a refresh on `/about` returns 404:

```
/*  /index.html  200
```

**Database** — MongoDB Atlas. Allow your API's IP, use a database user with the minimum
rights, and turn on automated backups.

**Before you announce it**

- [ ] New `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Admin password changed from the seeded one
- [ ] `NODE_ENV=production` (this is what turns on Secure cookies and HSTS)
- [ ] `CLIENT_ORIGIN` correct — a mismatch is the usual cause of "signed out on refresh"
- [ ] HTTPS on both halves
- [ ] Atlas backups on

---

## Where to take it next

Things deliberately left out, roughly in the order they usually become worth adding:

- **Email** — password reset and comment notifications. Resend or Postmark, an hour's work.
- **Image uploads** — right now covers and avatars are URLs. Cloudinary or S3 with a
  signed upload keeps large files out of your API.
- **A rich text editor** — the body field is HTML. TipTap or Lexical drops in on top of
  the same field with no server change.
- **RSS and a sitemap** — two small routes, and they matter a lot for both search and
  readers.
- **Server-rendered article pages** — the biggest SEO win available, and the biggest job.
  Next.js with the same API, or a prerender service if you want it cheaply.
- **Tests** — Vitest plus supertest against `mongodb-memory-server`. Start with auth and
  the role checks, since those are the ones that hurt when they break.
