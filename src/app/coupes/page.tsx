import Link from "next/link";
import type { Metadata } from "next";

import { getGallery } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Magnetic } from "@/components/motion/magnetic";

export const metadata: Metadata = {
  title: "Nos coupes",
  description: "Découvrez les coupes réalisées à Chelba Coif : dégradés, undercut, barbe et plus.",
};

export default async function GalleryPage() {
  const gallery = await getGallery();

  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <div className="mb-14 max-w-xl">
          <p className="font-accent font-medium mb-3 text-lg text-djerba-blue">un aperçu du métier</p>
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Nos coupes</h1>
          <p className="mt-4 text-stone">
            Trouvez votre style, puis réservez en ligne — chaque coupe ci-dessous a été faite ici,
            par la même main.
          </p>
        </div>

        {gallery.length === 0 ? (
          <p className="text-stone">La galerie sera bientôt disponible.</p>
        ) : (
          <Reveal className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" y={32}>
            {gallery.map((cut, i) => (
              <TiltCard key={cut.id} className={i % 3 === 1 ? "rotate-1" : "-rotate-1"}>
                <figure className="overflow-hidden rounded-sm border border-brass-soft/20">
                  <CloudinaryImage
                    publicId={cut.cloudinaryPublicId}
                    alt={cut.title}
                    width={320}
                    height={400}
                    className="aspect-[4/5] w-full"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  />
                  <figcaption className="p-3">
                    <p className="font-medium">{cut.title}</p>
                    {cut.description && <p className="mt-1 text-sm text-stone">{cut.description}</p>}
                    {cut.serviceName && (
                      <p className="mt-1 text-xs uppercase tracking-wide text-djerba-blue">
                        {cut.serviceName}
                      </p>
                    )}
                  </figcaption>
                </figure>
              </TiltCard>
            ))}
          </Reveal>
        )}

        <div className="mt-20 flex justify-center">
          <Magnetic>
            <Link
              href="/reserver"
              className="rounded-sm bg-brass px-7 py-3.5 text-sm font-medium text-charcoal transition-colors hover:bg-brass-soft"
            >
              Réserver ce style
            </Link>
          </Magnetic>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
