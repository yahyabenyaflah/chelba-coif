import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAdmin, getCustomer } from "@/lib/auth/dal";
import { LogoFull } from "@/components/logo";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Connexion — Espace coiffeur" };

export default async function AdminLoginPage() {
  // Même formulaire que /compte/connexion (voir `unifiedLoginAction`) : une
  // session déjà ouverte, admin ou client, saute directement au bon espace.
  const [admin, customer] = await Promise.all([getAdmin(), getCustomer()]);
  if (admin) redirect("/admin");
  if (customer) redirect("/compte");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-charcoal px-6 py-16 text-ivory font-body">
      <LogoFull className="mb-8" />
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Espace coiffeur</h1>
        <p className="mt-1 text-sm text-stone">Connectez-vous pour gérer le salon.</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
