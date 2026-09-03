import type { Metadata } from "next";

import { getAllServices, getGallery } from "@/lib/data";
import { GalleryUploader } from "@/components/admin/gallery-uploader";
import { GalleryItem } from "@/components/admin/gallery-item";

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryAdminPage() {
  const [gallery, services] = await Promise.all([
    getGallery({ includeHidden: true }),
    getAllServices(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Galerie</h1>
      <p className="mt-1 text-stone">
        Les coupes visibles ici apparaissent sur la page publique « Nos coupes ».
      </p>

      <div className="mt-8 max-w-xl">
        <GalleryUploader services={services} />
      </div>

      <div className="mt-10">
        {gallery.length === 0 ? (
          <p className="text-stone">Aucune image pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {gallery.map((item) => (
              <GalleryItem
                key={item.id}
                id={item.id}
                publicId={item.cloudinaryPublicId}
                title={item.title}
                serviceName={item.serviceName}
                isFeatured={item.isFeatured}
                isActive={item.isActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
