import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (ex-Middleware) : deux responsabilités distinctes sur chaque requête.
 *
 * 1. Content-Security-Policy à base de nonce — voir la documentation Next.js
 *    « Content Security Policy ». Next applique automatiquement le nonce aux
 *    scripts du framework dès qu'il détecte le motif `'nonce-{valeur}'` dans
 *    l'en-tête `Content-Security-Policy` de la réponse ; aucune balise à
 *    modifier à la main. Une politique stricte (`script-src` sans
 *    `'unsafe-inline'`) élimine toute une classe d'attaques XSS par injection
 *    de script.
 *
 * 2. Garde de navigation optimiste pour `/admin` et `/compte` — ne fait que
 *    lire la présence du cookie de session pour rediriger tôt et éviter un
 *    aller-retour base de données sur une page manifestement interdite. Ce
 *    n'est PAS le contrôle de sécurité : le cookie peut être expiré, signé
 *    pour un compte supprimé, ou révoqué — seule la couche d'accès aux
 *    données (`src/lib/auth/dal.ts`), qui interroge la base à chaque page et
 *    chaque Server Action, fait foi.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const csp = buildCsp();

  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/connexion";
  const isAccountArea =
    pathname.startsWith("/compte") && pathname !== "/compte/connexion" && pathname !== "/compte/inscription";

  if (isAdminArea && !request.cookies.get("cc_admin_session")) {
    return applyResponseHeaders(NextResponse.redirect(new URL("/admin/connexion", request.url)), csp.value);
  }
  if (isAccountArea && !request.cookies.get("cc_customer_session")) {
    return applyResponseHeaders(NextResponse.redirect(new URL("/compte/connexion", request.url)), csp.value);
  }

  // Propagé côté requête (via un nouvel objet Headers, comme documenté) pour
  // que Next puisse extraire le nonce pendant le rendu de la page.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", csp.nonce);
  requestHeaders.set("Content-Security-Policy", csp.value);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyResponseHeaders(response, csp.value);
}

function buildCsp(): { nonce: string; value: string } {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const value = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https://res.cloudinary.com;
    connect-src 'self' https://api.cloudinary.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return { nonce, value };
}

function applyResponseHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  // Défense en profondeur, redondante avec certaines directives CSP
  // ci-dessus mais comprise par des navigateurs ou outils qui ne lisent pas
  // le CSP.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
