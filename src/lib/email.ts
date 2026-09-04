import "server-only";

import { env } from "@/lib/env";
import { siteUrl } from "@/lib/site";

/**
 * Notification e-mail à l'admin, via l'API HTTP de Resend (pas de SDK : un
 * simple POST, inutile d'ajouter une dépendance pour ça).
 *
 * Désactivée silencieusement tant que RESEND_API_KEY /
 * ADMIN_NOTIFICATION_EMAIL ne sont pas renseignés, et n'échoue jamais bruyamment
 * même une fois configurée : une notification en échec ne doit jamais faire
 * échouer la réservation elle-même, qui est déjà enregistrée en base à ce
 * stade.
 */
export async function sendAdminNotification(params: { subject: string; html: string }): Promise<void> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_NOTIFICATION_EMAIL } = env();

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !ADMIN_NOTIFICATION_EMAIL) {
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      console.error("Notification e-mail : échec Resend", res.status, await res.text());
    }
  } catch (error) {
    console.error("Notification e-mail : échec d'envoi", error);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Gabarit de notification pour une nouvelle réservation. */
export function newBookingEmail(params: {
  contactName: string;
  contactPhone: string;
  serviceName: string;
  dateLabel: string;
  priceLabel: string;
  notes: string;
  reference: string;
}): { subject: string; html: string } {
  const { contactName, contactPhone, serviceName, dateLabel, priceLabel, notes, reference } = params;

  return {
    subject: `Nouvelle réservation — ${serviceName} le ${dateLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Nouvelle réservation</h2>
        <p style="color: #666; margin-top: 0;">Référence ${escapeHtml(reference)}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #666;">Client</td><td style="padding: 6px 0;">${escapeHtml(contactName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Téléphone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(contactPhone)}">${escapeHtml(contactPhone)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Prestation</td><td style="padding: 6px 0;">${escapeHtml(serviceName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Créneau</td><td style="padding: 6px 0;">${escapeHtml(dateLabel)}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Montant</td><td style="padding: 6px 0;">${escapeHtml(priceLabel)}</td></tr>
          ${notes ? `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Note</td><td style="padding: 6px 0;">${escapeHtml(notes)}</td></tr>` : ""}
        </table>
        <p style="margin-top: 20px;">
          <a href="${escapeHtml(siteUrl())}/admin/reservations" style="color: #c6952e;">Voir dans le dashboard →</a>
        </p>
      </div>
    `.trim(),
  };
}
