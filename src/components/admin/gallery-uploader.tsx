"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";

import { saveHaircutStyleAction } from "@/lib/actions/admin";
import { idleState, type ActionState } from "@/lib/actions/types";
import { ALLOWED_FORMATS, MAX_UPLOAD_BYTES } from "@/lib/cloudinary-constants";
import type { Service } from "@/lib/db/schema";
import { TextField, SelectField, TextAreaField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form-alert";

type SignedParams = { signature: string; apiKey: string; timestamp: number; cloudName: string; folder: string };
type UploadResult = { public_id: string; width: number; height: number };

/**
 * Dépôt en deux temps : d'abord vers Cloudinary directement depuis le
 * navigateur (signé par /api/cloudinary/sign), puis enregistrement du
 * `public_id` obtenu via la Server Action habituelle. Cloudinary ne voit
 * jamais transiter les autres champs du formulaire (titre, description).
 */
export function GalleryUploader({ services }: { services: Service[] }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<ActionState>(idleState);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploaded(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_FORMATS.includes(ext as (typeof ALLOWED_FORMATS)[number])) {
      setUploadError(`Format non supporté. Utilisez : ${ALLOWED_FORMATS.join(", ")}.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`Image trop lourde (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo).`);
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (!signRes.ok) throw new Error("Session expirée. Reconnectez-vous.");
      const signed: SignedParams = await signRes.json();

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signed.apiKey);
      body.append("timestamp", String(signed.timestamp));
      body.append("signature", signed.signature);
      body.append("folder", signed.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
        method: "POST",
        body,
      });
      if (!uploadRes.ok) throw new Error("Échec de l'envoi vers Cloudinary.");
      const result = await uploadRes.json();
      setUploaded({ public_id: result.public_id, width: result.width, height: result.height });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Appel direct de la Server Action (plutôt que `<form action={...}>` +
   * `useActionState`) pour pouvoir réinitialiser `uploaded` au bon moment :
   * dans le gestionnaire d'événement lui-même, une fois le résultat connu,
   * et non dans un effet réagissant à son changement. La galerie affichée en
   * dessous se met à jour séparément via `revalidatePath` dans l'action.
   */
  async function handleSaveSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaving(true);
    const result = await saveHaircutStyleAction(idleState, formData);
    setSaving(false);
    setSaveState(result);
    if (result.status === "success") {
      setUploaded(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <ImagePlus size={18} aria-hidden="true" />
        Ajouter une coupe à la galerie
      </h2>

      <div className="mt-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-stone/30 px-6 py-8 text-center transition-colors hover:border-brass">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileChange}
            className="sr-only"
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 size={22} className="animate-spin text-brass" aria-hidden="true" />
          ) : (
            <UploadCloud size={22} className="text-stone" aria-hidden="true" />
          )}
          <span className="text-sm text-stone">
            {uploading ? "Envoi en cours…" : "Cliquez pour choisir une image"}
          </span>
        </label>
        {uploadError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {uploadError}
          </p>
        )}
      </div>

      {uploaded && (
        <form onSubmit={handleSaveSubmit} className="mt-6 flex flex-col gap-4 border-t border-brass-soft/20 pt-6">
          <input type="hidden" name="cloudinaryPublicId" value={uploaded.public_id} />
          <input type="hidden" name="width" value={uploaded.width} />
          <input type="hidden" name="height" value={uploaded.height} />

          <p className="text-sm text-success">Image envoyée. Complétez les informations :</p>

          <TextField label="Titre" name="title" error={saveState.errors?.title} required />
          <TextAreaField label="Description (facultative)" name="description" error={saveState.errors?.description} />
          <SelectField label="Prestation associée (facultative)" name="serviceId" error={saveState.errors?.serviceId}>
            <option value="">Aucune</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ivory">
            <input type="checkbox" name="isFeatured" className="h-4 w-4 accent-brass" />
            Mettre en avant sur la page d&apos;accueil
          </label>

          <FormAlert state={saveState} />

          <Button type="submit" disabled={saving} aria-busy={saving} className="self-start">
            {saving && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
            Ajouter à la galerie
          </Button>
        </form>
      )}
    </div>
  );
}
