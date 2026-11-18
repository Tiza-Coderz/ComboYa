import { z } from "zod";

/**
 * Variables públicas: disponibles en cliente y servidor.
 * Next.js sustituye `process.env.NEXT_PUBLIC_*` en build, por eso se leen una a una.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_NEGOCIO: z.string().regex(/^\d{8,15}$/, "Solo dígitos, con código de país"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEMO_ADMIN_EMAIL: z.string().email().default("admin@demo.cu"),
  DEMO_ADMIN_PASSWORD: z.string().min(6).default("demo1234"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_WHATSAPP_NEGOCIO: process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
});

/** Solo llamar desde código de servidor. */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() no puede usarse en el navegador");
  }
  return serverSchema.parse(process.env);
}
