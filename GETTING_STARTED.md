# Getting started — five minutes

You need **Node.js 18 or newer** and a **MongoDB** database. If you do not have Mongo
locally, create a free cluster at mongodb.com/atlas and copy the connection string.

## 1. Install

From the `gyandistro` folder:

```bash
npm run setup
```

That installs the root tooling, the server and the client. If you would rather do it by
hand:

```bash
cd server && npm install
cd ../client && npm install
```

## 2. Configure the server

```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
```

Open `server/.env` and set two things:

| Variable | What to put there |
| --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/gyandistro` for local Mongo, or your Atlas string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Two different long random strings |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Everything else has a working default. Leave `AI_PROVIDER=none` for now.

## 3. Fill the database with demo content

```bash
npm run seed          # from the gyandistro folder
```

This creates four accounts, six articles, four sections, a comment thread and three
house ad units. It prints the sign-in details when it finishes:

| Role | Email | Password |
| --- | --- | --- |
| admin | admin@gyandistro.com | Admin@12345 |
| editor | editor@gyandistro.com | Editor@12345 |
| author | author@gyandistro.com | Author@12345 |
| reader | reader@gyandistro.com | Reader@12345 |

**Change the admin password the moment you deploy anywhere public.**

## 4. Run it

```bash
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:5000/api/health

Two terminals work just as well:

```bash
cd server && npm run dev
cd client && npm run dev
```

## 5. Look around

1. Open the home page — you should see the seeded articles.
2. Sign in as the admin and open **Admin → Advertising** to see the house ad units.
3. Sign in as the author and press **Write** to open the editor.
4. Sign in as the reader, open an article and post a comment, then reply to it.

## Turning on the AI assistant

Pick one provider in `server/.env` and restart the server.

**Free and local** — install [Ollama](https://ollama.com), then:

```bash
ollama pull llama3.1:8b
```

```ini
AI_PROVIDER=ollama
AI_MODEL=llama3.1:8b
```

**OpenAI**

```ini
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

**Anthropic**

```ini
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...
```

The Assistant panel in the editor lights up on its own. Comment moderation starts
running in the background too. If a provider is unreachable, comments still post and the
editor buttons show a clear message — nothing breaks.

## Common problems

**`MongooseServerSelectionError`** — Mongo is not running, or the URI is wrong. On Atlas,
add your IP under Network Access.

**Login works but you are signed out on refresh** — the refresh cookie is not reaching
the API. In development use `npm run dev` so Vite proxies `/api`; in production set
`CLIENT_ORIGIN` to your exact site origin and serve both over HTTPS.

**`Origin ... is not allowed`** — add that origin to `CLIENT_ORIGIN` in `server/.env`
(comma separated for more than one).

**Port already in use** — change `PORT` in `server/.env`, and `server.port` in
`client/vite.config.ts` for the front end.

**"Too many attempts. Try again in 15 minutes."** — five bad passwords locks an account.
Wait it out, or clear `failedLoginAttempts` and `lockedUntil` on that user in Mongo.
