import type { Metadata } from "next";

import { getAllClosures, getOpeningRules } from "@/lib/data";
import { OpeningHoursForm } from "@/components/admin/opening-hours-form";
import { ClosuresManager } from "@/components/admin/closures-manager";

export const metadata: Metadata = { title: "Horaires" };

export default async function HoursPage() {
  const [rules, closures] = await Promise.all([getOpeningRules(), getAllClosures()]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Horaires</h1>
      <p className="mt-1 text-stone">
        Définissez les horaires d&apos;ouverture hebdomadaires et les fermetures exceptionnelles.
      </p>

      <section className="mt-8 max-w-2xl">
        <OpeningHoursForm hours={rules} />
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-display text-lg font-semibold">Fermetures exceptionnelles</h2>
        <div className="mt-4">
          <ClosuresManager closures={closures} />
        </div>
      </section>
    </div>
  );
}
