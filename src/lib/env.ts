import { z } from "zod";

/**
 * URL pública del sitio. En Vercel, si no se define NEXT_PUBLIC_SITE_URL, se usa
 * el dominio de producción del proyecto (variable de sistema de Vercel).
 */
function urlDelSitio(): string | undefined {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : undefined;
}

/**
 * Variables públicas: disponibles en cliente y servidor.
 * Next.js sustituye `process.env.NEXT_PUBLIC_*` en build, por eso se leen una a una.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_NEGOCIO: z
    .string()
    .regex(/^\d{8,15}$/, "Solo dígitos, con código de país")
    .default("5355555555"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEMO_ADMIN_EMAIL: z.email().default("admin@demo.cu"),
  DEMO_ADMIN_PASSWORD: z.string().min(6).default("demo1234"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: urlDelSitio(),
  NEXT_PUBLIC_WHATSAPP_NEGOCIO: process.env.NEXT_PUBLIC_WHATSAPP_NEGOCIO || undefined,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || undefined,
});

/** Solo llamar desde código de servidor. */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() no puede usarse en el navegador");
  }
  return serverSchema.parse(process.env);
}
