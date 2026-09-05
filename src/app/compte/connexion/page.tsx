import Link from "next/link";
import type { Metadata } from "next";

import { getAdmin, getCustomer } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function CustomerLoginPage() {
  // La même connexion sert aussi le coiffeur (voir `unifiedLoginAction`) :
  // une session déjà ouverte, quel que soit son type, saute directement au
  // bon espace plutôt que de réafficher un formulaire.
  const [customer, admin] = await Promise.all([getCustomer(), getAdmin()]);
  if (admin) redirect("/admin");
  if (customer) redirect("/compte");

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Connexion</h1>
        <p className="mt-2 text-sm text-stone">Accédez à votre espace fidélité et vos rendez-vous.</p>

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-sm text-stone">
          Pas encore de compte ?{" "}
          <Link href="/compte/inscription" className="text-brass hover:underline">
            Créez-en un
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
