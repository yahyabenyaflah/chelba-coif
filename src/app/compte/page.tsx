import Link from "next/link";
import type { Metadata } from "next";
import { Award, CalendarDays, LogOut, Sparkles } from "lucide-react";

import { requireCustomer } from "@/lib/auth/dal";
import { customerLogoutAction } from "@/lib/actions/auth";
import { getCustomerBookings, getLoyaltyHistory, getSettings } from "@/lib/data";
import { formatDateTime } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const customer = await requireCustomer();
  const [bookings, loyaltyHistory, settings] = await Promise.all([
    getCustomerBookings(customer.id),
    getLoyaltyHistory(customer.id),
    getSettings(),
  ]);

  const upcoming = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const past = bookings.filter((b) => b.status !== "pending" && b.status !== "confirmed");

  const progress = settings.pointsForReward > 0
    ? Math.min(100, Math.round((customer.loyaltyPoints / settings.pointsForReward) * 100))
    : 0;
  const remaining = Math.max(0, settings.pointsForReward - customer.loyaltyPoints);

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Bonjour, {customer.fullName.split(" ")[0]}
            </h1>
            <p className="mt-1 text-stone">{customer.email}</p>
          </div>
          <form action={customerLogoutAction}>
            <SubmitButton variant="outline" size="sm">
              <LogOut size={14} aria-hidden="true" />
              Déconnexion
            </SubmitButton>
          </form>
        </div>

        {/* Fidélité */}
        <section className="mt-10 rounded-sm border border-brass-soft/30 bg-charcoal-raised p-6">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-brass" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold">Programme de fidélité</h2>
          </div>
          <p className="mt-3 text-2xl font-display font-semibold text-brass">
            {customer.loyaltyPoints} point{customer.loyaltyPoints > 1 ? "s" : ""}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-charcoal">
            <div
              className="h-full rounded-full bg-brass transition-all"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={customer.loyaltyPoints}
              aria-valuemin={0}
              aria-valuemax={settings.pointsForReward}
              aria-label="Progression vers la récompense"
            />
          </div>
          <p className="mt-2 text-sm text-stone">
            {remaining > 0
              ? `Encore ${remaining} point${remaining > 1 ? "s" : ""} avant : ${settings.rewardLabel}.`
              : `Récompense disponible : ${settings.rewardLabel}. Signalez-le au salon lors de votre passage.`}
          </p>
        </section>

        {/* Rendez-vous à venir */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CalendarDays size={18} aria-hidden="true" />
              Prochains rendez-vous
            </h2>
            <Link href="/reserver" className="text-sm text-brass hover:underline">
              Réserver →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-stone">Aucun rendez-vous à venir.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-brass-soft/30 p-4"
                >
                  <div>
                    <p className="font-medium">{b.serviceName}</p>
                    <p className="text-sm text-stone">{formatDateTime(b.startsAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-brass">{formatPrice(b.priceMillimes)}</span>
                    <StatusBadge status={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Historique */}
        {past.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">Historique</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {past.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-brass-soft/20 py-3 text-sm"
                >
                  <div>
                    <p className="text-ivory">{b.serviceName}</p>
                    <p className="text-stone">{formatDateTime(b.startsAt)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Mouvements de fidélité */}
        {loyaltyHistory.length > 0 && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles size={16} aria-hidden="true" />
              Mouvements de points
            </h2>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {loyaltyHistory.map((t) => (
                <li key={t.id} className="flex items-center justify-between border-b border-brass-soft/20 py-2">
                  <span className="text-stone">{t.reason}</span>
                  <span className={t.points >= 0 ? "text-success" : "text-danger"}>
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
