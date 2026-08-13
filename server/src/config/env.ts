import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Reads a variable, falling back to a default; fails fast at boot if neither exists. */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export type AiProvider = 'none' | 'ollama' | 'openai' | 'anthropic';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/gyandistro'),

  accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  ai: {
    provider: (process.env.AI_PROVIDER ?? 'none') as AiProvider,
    model: process.env.AI_MODEL ?? '',
    openaiKey: process.env.OPENAI_API_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@gyandistro.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345'
  },

  uploads: {
    // Relative to the server package root; resolved to an absolute path
    // wherever it's actually used, so this stays readable in .env.
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxSizeMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
    // Blank = derive from the incoming request (correct for almost every
    // setup, including behind a reverse proxy since app.ts sets
    // 'trust proxy'). Only set this if the uploads need to be served from a
    // different host than the API itself, e.g. a CDN in front of /uploads.
    baseUrl: process.env.UPLOAD_BASE_URL || undefined
  }
};
