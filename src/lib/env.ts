import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
  CURRENCY: z.string().default("INR"),
  SESSION_SECRET: z.string().min(16),
  SEED_DEMO_DATA: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  OWNER_SEED_PASSWORD: z.string().optional(),
  ALLOW_PROD_SEED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isDemoSeedEnabled(): boolean {
  try {
    return Boolean(getEnv().SEED_DEMO_DATA) && getEnv().NODE_ENV !== "production";
  } catch {
    return process.env.SEED_DEMO_DATA === "true" && process.env.NODE_ENV !== "production";
  }
}
