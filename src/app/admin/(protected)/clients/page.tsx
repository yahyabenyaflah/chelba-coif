import type { Metadata } from "next";
import { Gift } from "lucide-react";

import { getCustomerStats, getMonthlyVisits, getSettings } from "@/lib/data";
import { formatDateTime, formatMonthLabel } from "@/lib/time";
import { formatPhone, formatPrice } from "@/lib/utils";
import { BarChart } from "@/components/admin/bar-chart";
import { RedeemRewardButton } from "@/components/admin/redeem-reward-button";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const [customers, monthlyVisits, settings] = await Promise.all([
    getCustomerStats(),
    getMonthlyVisits(12),
    getSettings(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Clients</h1>
      <p className="mt-1 text-stone">
        Fréquentation des {customers.length} client{customers.length > 1 ? "s" : ""} inscrit
        {customers.length > 1 ? "s" : ""}.
      </p>

      <section className="mt-8 rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5">
        <h2 className="font-display text-lg font-semibold">Fréquentation mensuelle — 12 mois</h2>
        <div className="mt-4">
          <BarChart
            data={monthlyVisits.map((m) => ({
              label: formatMonthLabel(m.month),
              value: m.visits,
            }))}
            valueLabel="Visites par mois"
          />
        </div>
      </section>

      <section className="mt-8">
        {customers.length === 0 ? (
          <p className="text-stone">Aucun client inscrit pour le moment.</p>
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brass-soft/30 text-left text-xs uppercase tracking-wide text-stone">
                  <th scope="col" className="pb-2 font-medium">Client</th>
                  <th scope="col" className="pb-2 font-medium">Visites totales</th>
                  <th scope="col" className="pb-2 font-medium">Visites / mois</th>
                  <th scope="col" className="pb-2 font-medium">Dernière visite</th>
                  <th scope="col" className="pb-2 font-medium">Points</th>
                  <th scope="col" className="pb-2 font-medium">Total dépensé</th>
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-brass-soft/10">
                    <td className="py-3">
                      <p className="text-ivory">{c.fullName}</p>
                      <p className="text-xs text-stone">{formatPhone(c.phone)}</p>
                    </td>
                    <td className="py-3 text-ivory">{c.totalVisits}</td>
                    <td className="py-3 text-stone">{c.visitsPerMonth.toFixed(1)}</td>
                    <td className="py-3 text-stone">
                      {c.lastVisit ? formatDateTime(new Date(c.lastVisit)) : "—"}
                    </td>
                    <td className="py-3 text-brass">{c.loyaltyPoints}</td>
                    <td className="py-3 text-stone">{formatPrice(c.lifetimeMillimes)}</td>
                    <td className="py-3">
                      {c.loyaltyPoints >= settings.pointsForReward && (
                        <RedeemRewardButton customerId={c.id} rewardLabel={settings.rewardLabel} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-stone">
        <Gift size={12} aria-hidden="true" />
        Récompense : {settings.rewardLabel} tous les {settings.pointsForReward} points.
      </p>
    </div>
  );
}
