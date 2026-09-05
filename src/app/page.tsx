import Link from "next/link";
import type { Metadata } from "next";
import { Award, Clock, MapPin, Phone } from "lucide-react";

import { getActiveServices, getGallery, getOpeningRules, getSettings } from "@/lib/data";
import { formatDuration, formatPhone, formatPrice } from "@/lib/utils";
import { WEEKDAY_LABELS } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { LogoMark } from "@/components/logo";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Magnetic } from "@/components/motion/magnetic";

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
    <div className="flex flex-1 flex-col overflow-x-clip bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="flex flex-1 flex-col">
        {/* Hero — asymétrique volontairement : le texte déborde vers le
            monogramme plutôt que deux colonnes égales, et le monogramme est
            posé légèrement de travers, comme accroché à la main. */}
        <section id="accueil" className="grain relative flex-1 px-6 py-20 sm:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 sm:grid-cols-5 sm:gap-4">
            <div className="rise-in sm:col-span-3">
              <p className="mb-4 font-accent font-medium text-lg text-djerba-blue">
                — depuis Djerba, pour ceux qui aiment le travail bien fait
              </p>
              <h1 className="font-display text-6xl font-semibold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
                La coupe
                <br />
                nette,
                <br />
                <span className="text-brass">le style</span> qui dure.
              </h1>
              <p className="mt-7 max-w-md text-lg text-stone">
                {settings.salonName} est un barbershop à Djerba : coupes, dégradés, taille de barbe
                et soins pour homme, faits main, sans se presser.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Magnetic>
                  <Link
                    href="/reserver"
                    className="rounded-sm bg-brass px-7 py-3.5 text-sm font-medium text-charcoal transition-colors hover:bg-brass-soft"
                  >
                    Réserver un créneau
                  </Link>
                </Magnetic>
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-2 text-sm font-medium text-ivory underline decoration-stone/40 decoration-2 underline-offset-8 transition-colors hover:decoration-brass"
                >
                  <Phone size={15} aria-hidden="true" />
                  {formatPhone(settings.phone)}
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center sm:col-span-2 sm:justify-end">
              <LogoMark className="h-48 w-48 rotate-[-4deg] sm:h-64 sm:w-64" />
            </div>
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

        {/* Prestations — présentées en carte de menu, pas en grille de
            widgets : numérotation manuscrite, traits fins plutôt que
            cartes bordées, pour une lecture plus « atelier » que SaaS. */}
        <section id="coupes" className="mx-auto w-full max-w-4xl px-6 py-24">
          <div className="mb-12 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-4xl font-semibold tracking-tight">
              Coupes &amp; prestations
            </h2>
            <Link href="/reserver" className="whitespace-nowrap text-sm text-brass hover:underline">
              Voir tout →
            </Link>
          </div>
          {previewServices.length === 0 ? (
            <p className="text-stone">Les prestations seront bientôt publiées.</p>
          ) : (
            <Reveal className="flex flex-col">
              {previewServices.map((service, i) => (
                <div
                  key={service.id}
                  className="group flex items-center gap-6 border-t border-brass-soft/20 py-6 last:border-b"
                >
                  <span className="font-accent font-medium w-10 shrink-0 text-2xl text-brass/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl transition-colors group-hover:text-brass">
                      {service.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-stone">
                      <Clock size={13} aria-hidden="true" />
                      {formatDuration(service.durationMin)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-display text-2xl text-brass">
                    {formatPrice(service.priceMillimes)}
                  </span>
                </div>
              ))}
            </Reveal>
          )}
        </section>

        {/* Galerie — cartes inclinables au survol, légère rotation alternée
            au repos pour casser la symétrie de grille parfaite. */}
        {previewCuts.length > 0 && (
          <section className="border-t border-brass-soft/30 bg-charcoal-raised">
            <div className="mx-auto w-full max-w-6xl px-6 py-24">
              <div className="mb-12 flex items-baseline justify-between gap-4">
                <h2 className="font-display text-4xl font-semibold tracking-tight">Galerie</h2>
                <Link href="/coupes" className="whitespace-nowrap text-sm text-brass hover:underline">
                  Toute la galerie →
                </Link>
              </div>
              <Reveal className="grid grid-cols-2 gap-5 sm:grid-cols-4" y={36}>
                {previewCuts.map((cut, i) => (
                  <TiltCard key={cut.id} className={i % 2 === 0 ? "-rotate-1" : "rotate-1"}>
                    <figure className="overflow-hidden rounded-sm border border-brass-soft/20">
                      <CloudinaryImage
                        publicId={cut.cloudinaryPublicId}
                        alt={cut.title}
                        width={280}
                        height={340}
                        className="aspect-[4/5] w-full"
                        sizes="(min-width: 640px) 25vw, 50vw"
                      />
                      <figcaption className="p-2.5 text-sm text-stone">{cut.title}</figcaption>
                    </figure>
                  </TiltCard>
                ))}
              </Reveal>
            </div>
          </section>
        )}

        {/* Fidélité */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="flex flex-col items-start gap-6 border border-brass-soft/30 p-10 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-24 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight">Nous trouver</h2>
              <p className="font-accent font-medium mt-3 text-lg text-djerba-blue">
                à deux pas du centre, facile à trouver.
              </p>
              <dl className="mt-8 space-y-4 text-stone">
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
