import type { Metadata } from "next";

import { getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Réglages</h1>
      <p className="mt-1 text-stone">Paramètres généraux du salon et du programme de fidélité.</p>

      <div className="mt-8 max-w-xl">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
