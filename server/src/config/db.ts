import mongoose from 'mongoose';
import { env } from './env';

/** Opens the single shared MongoDB connection used by the whole API. */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => console.log('[db] connected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: !env.isProd
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
