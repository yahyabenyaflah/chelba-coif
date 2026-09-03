import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCustomer } from "@/lib/auth/dal";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage() {
  const customer = await getCustomer();
  if (customer) redirect("/compte");

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Créer un compte</h1>
        <p className="mt-2 text-sm text-stone">
          Cumulez des points de fidélité et retrouvez l&apos;historique de vos rendez-vous.
        </p>

        <div className="mt-8">
          <SignupForm />
        </div>

        <p className="mt-6 text-sm text-stone">
          Déjà un compte ?{" "}
          <Link href="/compte/connexion" className="text-brass hover:underline">
            Connectez-vous
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
