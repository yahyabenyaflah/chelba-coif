import type { Metadata } from "next";
import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  CalendarDays,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";

import {
  getDailySeries,
  getDashboardStats,
  getPeakHours,
  getServiceBreakdown,
  getUpcomingBookings,
} from "@/lib/data";
import { formatDateTime, formatShortDay } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";
import { BarChart, HorizontalBars } from "@/components/admin/bar-chart";
import { StatusBadge } from "@/components/ui/badge";
import { BookingStatusControl } from "@/components/admin/booking-status-control";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  const [stats, dailySeries, serviceBreakdown, peakHours, upcoming] = await Promise.all([
    getDashboardStats(),
    getDailySeries(30),
    getServiceBreakdown(90),
    getPeakHours(90),
    getUpcomingBookings(8),
  ]);

  const peakHoursData = peakHours.map((h) => ({ label: `${h.hour}h`, value: h.count }));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="mt-1 text-stone">Aperçu de l&apos;activité du salon.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aujourd'hui" value={String(stats.todayCount)} icon={CalendarDays} />
        <StatCard label="Cette semaine" value={String(stats.weekCount)} icon={CalendarCheck} />
        <StatCard
          label="En attente"
          value={String(stats.pendingCount)}
          icon={AlertCircle}
          tone={stats.pendingCount > 0 ? "warning" : "default"}
          hint="À confirmer"
        />
        <StatCard
          label="CA du mois"
          value={formatPrice(stats.monthRevenueMillimes)}
          icon={Banknote}
          hint="Rendez-vous honorés"
        />
        <StatCard label="Clients au total" value={String(stats.totalCustomers)} icon={Users} />
        <StatCard label="Nouveaux ce mois" value={String(stats.newCustomersThisMonth)} icon={UserPlus} />
        <StatCard
          label="Taux d'annulation"
          value={`${Math.round(stats.cancellationRate * 100)} %`}
          icon={TrendingDown}
          tone={stats.cancellationRate > 0.2 ? "danger" : "default"}
          hint="30 derniers jours"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5">
          <h2 className="font-display text-lg font-semibold">Réservations — 30 derniers jours</h2>
          <div className="mt-4">
            <BarChart
              data={dailySeries.map((d) => ({ label: formatShortDay(d.day), value: d.count }))}
              valueLabel="Réservations par jour"
            />
          </div>
        </section>

        <section className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5">
          <h2 className="font-display text-lg font-semibold">Heures de pointe — 90 jours</h2>
          <div className="mt-4">
            <BarChart data={peakHoursData} valueLabel="Rendez-vous par heure" />
          </div>
        </section>

        <section className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Prestations les plus demandées — 90 jours</h2>
          <div className="mt-4">
            <HorizontalBars
              data={serviceBreakdown.map((s) => ({ label: s.name, value: s.count }))}
            />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Prochains rendez-vous</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-stone">Aucun rendez-vous à venir.</p>
        ) : (
          <div className="scroll-x mt-4">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brass-soft/30 text-left text-xs uppercase tracking-wide text-stone">
                  <th scope="col" className="pb-2 font-medium">Client</th>
                  <th scope="col" className="pb-2 font-medium">Prestation</th>
                  <th scope="col" className="pb-2 font-medium">Créneau</th>
                  <th scope="col" className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id} className="border-b border-brass-soft/10">
                    <td className="py-3">
                      <p className="text-ivory">{b.contactName}</p>
                      <p className="text-xs text-stone">{b.contactPhone}</p>
                    </td>
                    <td className="py-3 text-ivory">{b.serviceName}</td>
                    <td className="py-3 text-stone">{formatDateTime(b.startsAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={b.status} />
                        <BookingStatusControl bookingId={b.id} status={b.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
