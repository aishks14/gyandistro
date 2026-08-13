import slugify from 'slugify';
import type { Model } from 'mongoose';

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true }).slice(0, 90) || 'untitled';
}

/** Appends -2, -3 ... until the slug is free in the given collection. */
export async function uniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ModelRef: Model<any>,
  value: string,
  ignoreId?: string
): Promise<string> {
  const base = toSlug(value);
  let candidate = base;
  let counter = 2;

  for (;;) {
    const query: Record<string, unknown> = { slug: candidate };
    if (ignoreId) query._id = { $ne: ignoreId };
    const clash = await ModelRef.exists(query);
    if (!clash) return candidate;
    candidate = `${base}-${counter++}`;
  }
}
