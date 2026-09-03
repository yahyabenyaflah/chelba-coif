import { requireAdmin } from "@/lib/auth/dal";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Garde réelle de l'espace admin : `requireAdmin()` interroge la base à
 * chaque navigation (voir src/lib/auth/dal.ts). `proxy.ts` ne fait qu'un
 * filtrage optimiste en amont pour éviter l'aller-retour le plus évident.
 *
 * Isolé dans le groupe de routes `(protected)` pour que `/admin/connexion`,
 * hors du groupe, reste accessible sans session.
 */
export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-charcoal text-ivory font-body md:flex-row">
      <AdminSidebar adminName={admin.fullName} />
      <main id="contenu" className="min-w-0 flex-1 px-6 py-8 md:px-10 md:py-10">
        {children}
      </main>
    </div>
  );
}
