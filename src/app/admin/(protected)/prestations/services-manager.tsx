"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";

import type { Service } from "@/lib/db/schema";
import { formatDuration, formatPrice } from "@/lib/utils";
import { ServiceForm } from "@/components/admin/service-form";
import { ServiceToggle } from "@/components/admin/service-toggle";
import { Button } from "@/components/ui/button";

export function ServicesManager({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {services.map((service) => (
          <li key={service.id} className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-4">
            {editingId === service.id ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">Modifier « {service.name} »</h3>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Fermer"
                    className="cursor-pointer text-stone hover:text-ivory"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                <ServiceForm service={service} onSaved={() => setEditingId(null)} />
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className={service.isActive ? "text-ivory" : "text-stone line-through"}>
                    {service.name}
                  </p>
                  <p className="text-sm text-stone">
                    {formatDuration(service.durationMin)} · {formatPrice(service.priceMillimes)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(service.id)}
                    aria-label={`Modifier ${service.name}`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm text-stone transition-colors hover:text-brass"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <ServiceToggle serviceId={service.id} isActive={service.isActive} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Nouvelle prestation</h3>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Fermer"
              className="cursor-pointer text-stone hover:text-ivory"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <ServiceForm onSaved={() => setAdding(false)} />
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="self-start">
          <Plus size={16} aria-hidden="true" />
          Ajouter une prestation
        </Button>
      )}
    </div>
  );
}
