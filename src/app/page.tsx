import Link from "next/link";
import type { Metadata } from "next";
import { Award, Clock, MapPin, Phone, Scissors } from "lucide-react";

import { getActiveServices, getGallery, getOpeningRules, getSettings } from "@/lib/data";
import { formatDuration, formatPhone, formatPrice } from "@/lib/utils";
import { WEEKDAY_LABELS } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = {
  title: "Accueil",
};

export default async function HomePage() {
  const [settings, services, gallery, hours] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getGallery(),
    getOpeningRules(),
  ]);

  const featuredCuts = gallery.filter((g) => g.isFeatured).slice(0, 4);
  const previewCuts = (featuredCuts.length > 0 ? featuredCuts : gallery).slice(0, 4);
  const previewServices = services.slice(0, 6);

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="flex flex-1 flex-col">
        {/* Hero */}
        <section
          id="accueil"
          className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-20 sm:grid-cols-2 sm:py-28"
        >
          <div className="rise-in">
            <p className="mb-4 text-sm text-djerba-blue">{settings.address}</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              La coupe nette,
              <br />
              le style qui dure.
            </h1>
            <p className="mt-6 max-w-md text-stone">
              {settings.salonName} est un barbershop moderne à Djerba : coupes, dégradés, taille
              de barbe et une sélection de produits de soin pour homme. Réservez votre créneau en
              ligne, sans attendre.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/reserver"
                className="rounded-sm bg-brass px-6 py-3 text-sm font-medium text-charcoal transition-all hover:scale-[1.03] hover:bg-brass-soft"
              >
                Réserver un créneau
              </Link>
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-2 rounded-sm border border-stone/40 px-6 py-3 text-sm font-medium text-ivory transition-colors hover:border-ivory"
              >
                <Phone size={15} aria-hidden="true" />
                {formatPhone(settings.phone)}
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <LogoMark className="h-56 w-56 sm:h-72 sm:w-72" />
          </div>
        </section>

        {/* barber stripe divider */}
        <div
          className="h-1.5 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--brass) 0 14px, var(--djerba-blue-deep) 14px 28px, var(--ivory) 28px 42px)",
            opacity: 0.85,
          }}
        />

        {/* Prestations */}
        <section id="coupes" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mb-10 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Coupes &amp; prestations
            </h2>
            <Link href="/reserver" className="whitespace-nowrap text-sm text-brass hover:underline">
              Voir tout →
            </Link>
          </div>
          {previewServices.length === 0 ? (
            <p className="text-stone">Les prestations seront bientôt publiées.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {previewServices.map((service) => (
                <li
                  key={service.id}
                  className="group flex items-center gap-4 rounded-sm border border-brass-soft/30 p-4 transition-all hover:-translate-y-0.5 hover:border-brass hover:bg-charcoal-raised"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-ivory/80 bg-charcoal">
                    <Scissors size={22} className="text-brass" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-stone">
                      <Clock size={13} aria-hidden="true" />
                      {formatDuration(service.durationMin)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-display text-brass">
                    {formatPrice(service.priceMillimes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Galerie */}
        {previewCuts.length > 0 && (
          <section className="border-t border-brass-soft/30 bg-charcoal-raised">
            <div className="mx-auto w-full max-w-6xl px-6 py-20">
              <div className="mb-10 flex items-baseline justify-between gap-4">
                <h2 className="font-display text-3xl font-semibold tracking-tight">Galerie</h2>
                <Link href="/coupes" className="whitespace-nowrap text-sm text-brass hover:underline">
                  Toute la galerie →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {previewCuts.map((cut) => (
                  <figure key={cut.id} className="overflow-hidden rounded-sm">
                    <CloudinaryImage
                      publicId={cut.cloudinaryPublicId}
                      alt={cut.title}
                      width={280}
                      height={340}
                      className="aspect-[4/5] w-full transition-transform duration-300 hover:scale-105"
                      sizes="(min-width: 640px) 25vw, 50vw"
                    />
                    <figcaption className="mt-2 text-sm text-stone">{cut.title}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Fidélité */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-col items-start gap-6 rounded-sm border border-brass-soft/30 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass/10">
                <Award size={22} className="text-brass" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">Programme de fidélité</h2>
                <p className="mt-1 max-w-md text-sm text-stone">
                  Créez un compte pour cumuler des points à chaque visite et suivre l&apos;historique
                  de vos rendez-vous. {settings.rewardLabel} tous les {settings.pointsForReward}{" "}
                  points.
                </p>
              </div>
            </div>
            <Link
              href="/compte/inscription"
              className="whitespace-nowrap rounded-sm border border-brass px-5 py-2.5 text-sm font-medium text-brass transition-colors hover:bg-brass hover:text-charcoal"
            >
              Créer un compte
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-brass-soft/30 bg-charcoal-raised">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">Nous trouver</h2>
              <dl className="mt-6 space-y-4 text-stone">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-djerba-blue">
                    <MapPin size={13} aria-hidden="true" />
                    Adresse
                  </dt>
                  <dd className="mt-1 text-ivory">{settings.address}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-djerba-blue">
                    <Phone size={13} aria-hidden="true" />
                    Téléphone
                  </dt>
                  <dd className="mt-1">
                    <a href={`tel:${settings.phone}`} className="text-ivory transition-colors hover:text-brass">
                      {formatPhone(settings.phone)}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="flex items-center gap-1.5 font-display text-xl font-semibold tracking-tight">
                <Clock size={17} aria-hidden="true" />
                Horaires
              </h2>
              <dl className="mt-6 space-y-2 text-sm">
                {hours.map((h) => (
                  <div key={h.weekday} className="flex items-center justify-between border-b border-brass-soft/20 py-1.5">
                    <dt className="text-stone">{WEEKDAY_LABELS[h.weekday]}</dt>
                    <dd className="text-ivory">
                      {h.isClosed ? "Fermé" : `${h.opensAt.slice(0, 5)} – ${h.closesAt.slice(0, 5)}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
