import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAdmin } from "@/lib/auth/dal";
import { LogoFull } from "@/components/logo";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — Espace coiffeur" };

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-charcoal px-6 py-16 text-ivory font-body">
      <LogoFull className="mb-8" />
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Espace coiffeur</h1>
        <p className="mt-1 text-sm text-stone">Connectez-vous pour gérer le salon.</p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
