import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/tienda/header";
import { Alert } from "@/components/ui/feedback";
import { getServerEnv, publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false },
};

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  const demo = publicEnv.NEXT_PUBLIC_DEMO_MODE
    ? { email: getServerEnv().DEMO_ADMIN_EMAIL, password: getServerEnv().DEMO_ADMIN_PASSWORD }
    : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Panel de administración</h1>
        </div>
        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {error === "no-admin" && (
            <Alert tono="peligro">Esta cuenta no tiene permisos de administrador.</Alert>
          )}
          <LoginForm demo={demo} />
        </div>
        <p className="text-center text-sm">
          <Link href="/" className="text-brand-700 hover:underline">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </main>
  );
}
