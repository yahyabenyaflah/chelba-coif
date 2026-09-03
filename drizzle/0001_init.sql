-- =============================================================================
-- Chelba Coif — schéma initial (PostgreSQL / Neon)
-- À exécuter une seule fois dans la console SQL Neon, ou via `npm run db:migrate`.
-- =============================================================================

-- Nécessaire pour la contrainte anti-double-réservation (EXCLUDE ... USING gist).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending',    -- demandé par le client, pas encore validé par le salon
    'confirmed',  -- validé par le salon
    'completed',  -- le client est venu (déclenche les points de fidélité)
    'cancelled',  -- annulé (par le client ou le salon)
    'no_show'     -- le client n'est pas venu
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Administrateurs (le coiffeur)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  -- Invalide toutes les sessions émises avant cette date (changement de mot de
  -- passe, déconnexion globale). Comparé au `iat` du JWT.
  sessions_valid_from timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- Unicité insensible à la casse : évite deux comptes "A@x.tn" et "a@x.tn".
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_key ON admin_users (lower(email));

-- -----------------------------------------------------------------------------
-- Clients disposant d'un compte (la réservation en invité reste possible)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  phone          text NOT NULL,
  -- Solde de points courant. Dérivable de loyalty_transactions, dénormalisé ici
  -- pour l'affichage ; les deux sont écrits dans la même transaction.
  loyalty_points integer NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  sessions_valid_from timestamptz NOT NULL DEFAULT now(),
  is_blocked     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_key ON customers (lower(email));
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);

-- -----------------------------------------------------------------------------
-- Prestations proposées
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  -- Durée réservée dans le planning, bornée pour éviter les saisies aberrantes.
  duration_min integer NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  -- En millimes tunisiens (1 DT = 1000 millimes) : entier, pas de flottant.
  price_millimes integer NOT NULL CHECK (price_millimes >= 0),
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS services_active_idx ON services (is_active, sort_order);

-- -----------------------------------------------------------------------------
-- Galerie des coupes (images hébergées sur Cloudinary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS haircut_styles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  description          text NOT NULL DEFAULT '',
  -- public_id Cloudinary : seule source de vérité, l'URL est reconstruite côté
  -- serveur pour empêcher l'injection d'une URL arbitraire dans <Image>.
  cloudinary_public_id text NOT NULL,
  width                integer NOT NULL CHECK (width > 0),
  height               integer NOT NULL CHECK (height > 0),
  -- Rattachement optionnel à une prestation réservable.
  service_id           uuid REFERENCES services (id) ON DELETE SET NULL,
  is_featured          boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS haircut_styles_active_idx ON haircut_styles (is_active, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS haircut_styles_public_id_key ON haircut_styles (cloudinary_public_id);

-- -----------------------------------------------------------------------------
-- Réservations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Code court communiqué au client (ex. "K7P2QM"). Avec le téléphone, il sert
  -- de preuve pour consulter/annuler sans compte.
  reference     text NOT NULL UNIQUE,
  -- NULL pour une réservation en invité.
  customer_id   uuid REFERENCES customers (id) ON DELETE SET NULL,
  -- Toujours renseignés (recopiés depuis le compte le cas échéant) : le salon
  -- garde le contact même si le client supprime son compte.
  contact_name  text NOT NULL,
  contact_phone text NOT NULL,
  -- RESTRICT : on ne supprime pas une prestation qui a un historique.
  service_id    uuid NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  status        booking_status NOT NULL DEFAULT 'pending',
  -- Prix et durée figés au moment de la réservation : les tarifs peuvent changer.
  price_millimes integer NOT NULL CHECK (price_millimes >= 0),
  notes          text NOT NULL DEFAULT '',
  admin_notes    text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  cancelled_at   timestamptz,
  CONSTRAINT bookings_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS bookings_starts_at_idx  ON bookings (starts_at);
CREATE INDEX IF NOT EXISTS bookings_status_idx     ON bookings (status, starts_at);
CREATE INDEX IF NOT EXISTS bookings_customer_idx   ON bookings (customer_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS bookings_phone_idx      ON bookings (contact_phone);

-- Garde-fou décisif : la base elle-même refuse deux rendez-vous qui se
-- chevauchent. Sans ça, deux clients qui valident le même créneau à la même
-- milliseconde passeraient tous les deux (la vérification applicative seule
-- laisse une fenêtre de concurrence). Les statuts annulés/absents sont exclus
-- pour que le créneau redevienne disponible.
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status IN ('pending', 'confirmed', 'completed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Horaires d'ouverture hebdomadaires
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opening_hours (
  -- 0 = dimanche … 6 = samedi (aligné sur Date.getDay()).
  weekday    smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_closed  boolean NOT NULL DEFAULT false,
  opens_at   time NOT NULL DEFAULT '09:00',
  closes_at  time NOT NULL DEFAULT '19:00',
  -- Pause déjeuner optionnelle : les deux colonnes vont ensemble.
  break_start time,
  break_end   time,
  CONSTRAINT opening_hours_order CHECK (closes_at > opens_at),
  CONSTRAINT opening_hours_break_pair CHECK (
    (break_start IS NULL AND break_end IS NULL)
    OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  )
);

-- -----------------------------------------------------------------------------
-- Fermetures exceptionnelles (congés, jours fériés)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS closures (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date   date NOT NULL,
  reason     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT closures_range CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS closures_range_idx ON closures (start_date, end_date);

-- -----------------------------------------------------------------------------
-- Fidélité : registre des mouvements de points
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES bookings (id) ON DELETE SET NULL,
  -- Positif = gain, négatif = utilisation d'une récompense.
  points      integer NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_customer_idx ON loyalty_transactions (customer_id, created_at DESC);
-- Un rendez-vous ne peut créditer des points qu'une seule fois, même si le
-- coiffeur repasse le statut en "terminé" plusieurs fois.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_booking_earn_key
  ON loyalty_transactions (booking_id) WHERE points > 0 AND booking_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Limitation de débit (anti-spam / anti-bruteforce), partagée par toutes les
-- instances serverless — un compteur en mémoire ne survivrait pas au scale-out.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      text PRIMARY KEY,
  hits        integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry_idx ON rate_limits (expires_at);

-- -----------------------------------------------------------------------------
-- Réglages du salon (ligne unique, id = 1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salon_settings (
  id                     smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  salon_name             text NOT NULL DEFAULT 'Chelba Coif',
  phone                  text NOT NULL DEFAULT '+21650882529',
  address                text NOT NULL DEFAULT 'Djerba, Tunisie',
  -- Pas de e-mail ni SMS en v1 : le coiffeur suit tout depuis le dashboard.
  slot_interval_min      integer NOT NULL DEFAULT 30 CHECK (slot_interval_min BETWEEN 5 AND 120),
  -- Fenêtre de réservation ouverte au public.
  max_advance_days       integer NOT NULL DEFAULT 30 CHECK (max_advance_days BETWEEN 1 AND 365),
  min_advance_min        integer NOT NULL DEFAULT 60 CHECK (min_advance_min >= 0),
  -- Fidélité.
  points_per_visit       integer NOT NULL DEFAULT 1 CHECK (points_per_visit >= 0),
  points_for_reward      integer NOT NULL DEFAULT 10 CHECK (points_for_reward > 0),
  reward_label           text NOT NULL DEFAULT 'Une coupe offerte',
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO salon_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Horaires par défaut : fermé le dimanche, 09h-19h le reste de la semaine.
INSERT INTO opening_hours (weekday, is_closed, opens_at, closes_at)
VALUES (0, true,  '09:00', '19:00'),
       (1, false, '09:00', '19:00'),
       (2, false, '09:00', '19:00'),
       (3, false, '09:00', '19:00'),
       (4, false, '09:00', '19:00'),
       (5, false, '09:00', '19:00'),
       (6, false, '09:00', '20:00')
ON CONFLICT (weekday) DO NOTHING;
