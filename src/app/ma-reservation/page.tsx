import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = {
  title: "Suivre un rendez-vous",
  description: "Retrouvez votre réservation avec votre code et votre numéro de téléphone.",
};

export default function LookupPage() {
  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Ma réservation</h1>
        <p className="mt-2 text-stone">
          Retrouvez votre rendez-vous avec le code reçu à la réservation et votre numéro de
          téléphone.
        </p>

        <div className="mt-8">
          <LookupForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
