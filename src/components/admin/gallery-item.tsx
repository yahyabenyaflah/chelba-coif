"use client";

import { useActionState } from "react";
import { Star, Trash2 } from "lucide-react";

import { deleteHaircutStyleAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import { CloudinaryImage } from "@/components/cloudinary-image";

export function GalleryItem({
  id,
  publicId,
  title,
  serviceName,
  isFeatured,
  isActive,
}: {
  id: string;
  publicId: string;
  title: string;
  serviceName: string | null;
  isFeatured: boolean;
  isActive: boolean;
}) {
  const [state, formAction] = useActionState(deleteHaircutStyleAction, idleState);

  // La ligne disparaît de la liste via `revalidatePath` après suppression :
  // en attendant ce rafraîchissement, on masque déjà la carte pour un retour
  // immédiat.
  if (state.status === "success") return null;

  return (
    <div className="group relative overflow-hidden rounded-sm border border-brass-soft/20">
      <CloudinaryImage
        publicId={publicId}
        alt={title}
        width={220}
        height={280}
        className="aspect-[4/5] w-full"
        sizes="(min-width: 1024px) 20vw, 33vw"
      />
      {!isActive && (
        <span className="absolute left-2 top-2 rounded-full bg-charcoal/90 px-2 py-0.5 text-[10px] text-stone">
          Masquée
        </span>
      )}
      {isFeatured && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brass/90">
          <Star size={12} className="text-charcoal" aria-hidden="true" />
        </span>
      )}
      <div className="p-2.5">
        <p className="truncate text-sm text-ivory">{title}</p>
        {serviceName && <p className="truncate text-xs text-stone">{serviceName}</p>}
      </div>
      <form action={formAction} className="absolute inset-x-0 bottom-0 translate-y-full bg-charcoal/95 p-2 transition-transform group-hover:translate-y-0">
        <input type="hidden" name="styleId" value={id} />
        <button
          type="submit"
          onClick={(e) => {
            if (!window.confirm(`Supprimer « ${title} » de la galerie ?`)) e.preventDefault();
          }}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs text-danger transition-colors hover:bg-danger-bg"
        >
          <Trash2 size={13} aria-hidden="true" />
          Supprimer
        </button>
      </form>
    </div>
  );
}
