import type { Metadata } from "next";

import { getAllServices } from "@/lib/data";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Prestations" };

export default async function ServicesPage() {
  const services = await getAllServices();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Prestations</h1>
      <p className="mt-1 text-stone">
        Gérez les coupes et soins proposés. Une prestation masquée reste visible dans
        l&apos;historique mais n&apos;est plus réservable.
      </p>

      <div className="mt-8 max-w-xl">
        <ServicesManager services={services} />
      </div>
    </div>
  );
}
