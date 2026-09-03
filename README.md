# Chelba Coif — Barbershop à Djerba

Application Next.js 16 (App Router) pour un salon de coiffure : vitrine publique, galerie de
coupes, réservation en ligne, comptes clients avec programme de fidélité, et un espace
d'administration complet pour le coiffeur.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **PostgreSQL** hébergé sur [Neon](https://neon.tech), via [Drizzle ORM](https://orm.drizzle.team)
- **Cloudinary** pour l'hébergement des images de la galerie
- **Tailwind CSS v4**
- Authentification maison (sessions JWT en cookies `httpOnly`), sans dépendance externe

## Mise en route

### 1. Dépendances

```bash
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseignez dans `.env.local` :

- `DATABASE_URL` — chaîne de connexion PostgreSQL Neon (Dashboard Neon → Connection string, avec
  `?sslmode=require`).
- `SESSION_SECRET` — 32 caractères minimum. Génération :
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Dashboard Cloudinary.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — **la même valeur** que `CLOUDINARY_CLOUD_NAME` (ce n'est
  pas un secret, il doit juste être accessible côté navigateur pour afficher les images).

### 3. Schéma de base de données

Applique les fichiers SQL de `drizzle/` (idempotent, peut être relancé sans risque) :

```bash
npm run db:migrate
```

### 4. Compte administrateur

Aucune inscription admin par formulaire web (surface d'attaque inutile pour un salon à un seul
coiffeur) : le compte se crée en ligne de commande.

```bash
npm run create-admin -- --email=vous@exemple.tn --password="un-mot-de-passe-solide" --name="Votre nom"
```

### 5. Lancer le projet

```bash
npm run dev
```

- Site public : [http://localhost:3000](http://localhost:3000)
- Espace coiffeur : [http://localhost:3000/admin/connexion](http://localhost:3000/admin/connexion)

## Scripts

| Commande               | Effet                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Serveur de développement (Turbopack)                         |
| `npm run build`         | Build de production                                           |
| `npm run start`         | Sert le build de production                                   |
| `npm run lint`          | ESLint                                                        |
| `npm run db:migrate`    | Applique les fichiers SQL de `drizzle/`                       |
| `npm run create-admin`  | Crée ou met à jour un compte administrateur                   |

## Fonctionnalités

**Public**
- Vitrine (prestations, galerie, horaires, contact)
- Réservation en ligne sans compte (nom + téléphone), avec code de suivi
- Suivi / annulation d'une réservation via ce code
- Compte client optionnel : historique des rendez-vous, programme de fidélité

**Administration** (`/admin`)
- Tableau de bord : statistiques (réservations, CA, taux d'annulation, heures de pointe)
- Gestion des réservations (statut, notes internes)
- Fiche client : fréquence de visite, historique, points de fidélité, récompenses
- Gestion des prestations et de la galerie (dépôt d'images vers Cloudinary)
- Horaires d'ouverture et fermetures exceptionnelles
- Réglages du salon et du programme de fidélité

## Sécurité

- Mots de passe hachés avec bcrypt, sessions par JWT signé en cookie `httpOnly`/`secure`
- Toute action sensible revérifie l'identité côté serveur (`src/lib/auth/dal.ts`), indépendamment
  du `proxy.ts` (garde de navigation, pas un contrôle d'accès)
- Limitation de débit (par IP et par identifiant métier) sur les points d'entrée publics
- Contrainte PostgreSQL d'exclusion (`EXCLUDE USING gist`) empêchant tout chevauchement de
  réservations, y compris en cas de requêtes concurrentes
- Content-Security-Policy stricte à base de nonce, en-têtes de sécurité (`X-Frame-Options`,
  `Referrer-Policy`, etc.)
- Validation systématique des entrées côté serveur (Zod), jamais de confiance au seul formulaire
