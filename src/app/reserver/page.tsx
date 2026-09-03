import type { Metadata } from "next";

import { getActiveServices } from "@/lib/data";
import { getCustomer } from "@/lib/auth/dal";
import { formatPhone } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingWizard } from "./booking-wizard";

export const metadata: Metadata = {
  title: "Réserver",
  description: "Réservez votre créneau chez Chelba Coif en quelques clics.",
};

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ prestation?: string }>;
}) {
  const [services, customer, params] = await Promise.all([
    getActiveServices(),
    getCustomer(),
    searchParams,
  ]);

  const initialServiceId = services.some((s) => s.id === params.prestation)
    ? params.prestation
    : undefined;

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Réserver</h1>
        <p className="mt-2 text-stone">Choisissez votre prestation, puis un créneau disponible.</p>

        <BookingWizard
          services={services}
          initialServiceId={initialServiceId}
          prefill={
            customer ? { name: customer.fullName, phone: formatPhone(customer.phone) } : undefined
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
