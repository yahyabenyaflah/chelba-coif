import Link from "next/link";
import type { Metadata } from "next";

import { getGallery } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CloudinaryImage } from "@/components/cloudinary-image";

export const metadata: Metadata = {
  title: "Nos coupes",
  description: "Découvrez les coupes réalisées à Chelba Coif : dégradés, undercut, barbe et plus.",
};

export default async function GalleryPage() {
  const gallery = await getGallery();

  return (
    <div className="flex flex-1 flex-col bg-charcoal text-ivory font-body">
      <SiteHeader />

      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Nos coupes</h1>
          <p className="mt-3 max-w-xl text-stone">
            Un aperçu des réalisations du salon. Trouvez votre style, puis réservez en ligne.
          </p>
        </div>

        {gallery.length === 0 ? (
          <p className="text-stone">La galerie sera bientôt disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((cut) => (
              <figure
                key={cut.id}
                className="group overflow-hidden rounded-sm border border-brass-soft/20"
              >
                <div className="relative overflow-hidden">
                  <CloudinaryImage
                    publicId={cut.cloudinaryPublicId}
                    alt={cut.title}
                    width={320}
                    height={400}
                    className="aspect-[4/5] w-full transition-transform duration-300 group-hover:scale-105"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  />
                </div>
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
            ))}
          </div>
        )}

        <div className="mt-16 flex justify-center">
          <Link
            href="/reserver"
            className="rounded-sm bg-brass px-6 py-3 text-sm font-medium text-charcoal transition-all hover:scale-[1.02] hover:bg-brass-soft"
          >
            Réserver ce style
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
