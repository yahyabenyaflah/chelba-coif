import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un package-lock.json orphelin dans C:\Users\yahya (au-dessus de ce dépôt
  // git) fait sinon deviner à Turbopack la mauvaise racine de projet.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Les images de la galerie viennent de Cloudinary, qui applique déjà
    // f_auto/q_auto (voir src/lib/cloudinary.ts) : elles sont rendues avec
    // `unoptimized`, donc ce n'est pas l'allowlist du fetcher Next qui compte
    // ici. Déclaré quand même en défense en profondeur, si `unoptimized`
    // venait à être retiré d'un composant par erreur.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
