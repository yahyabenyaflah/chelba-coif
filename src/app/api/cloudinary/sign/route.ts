import { NextResponse } from "next/server";

import { requireAdminAction } from "@/lib/auth/dal";
import { UPLOAD_FOLDER, signUploadParams } from "@/lib/cloudinary";

/**
 * Signe une requête de dépôt Cloudinary pour le dashboard admin.
 *
 * Le fichier part directement du navigateur vers Cloudinary (jamais par ce
 * serveur) : cette route ne fait que prouver, via la signature, que
 * l'utilisateur autorisé à écrire dans le compte Cloudinary a bien demandé ce
 * dépôt précis, dans le dossier imposé.
 */
export async function POST() {
  try {
    await requireAdminAction();
  } catch {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const params = signUploadParams({ folder: UPLOAD_FOLDER });
  return NextResponse.json({ ...params, folder: UPLOAD_FOLDER });
}
