import "./load-env.mjs";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

/**
 * Crée (ou met à jour le mot de passe d')un compte administrateur.
 *
 * Usage :
 *   node scripts/create-admin.mjs --email=vous@exemple.tn --password="********" --name="Chelba"
 *
 * Un script séparé plutôt qu'une page d'inscription admin : ouvrir la création
 * de comptes administrateurs sur le web, même protégée, est une surface
 * d'attaque inutile pour un salon à un seul coiffeur.
 */

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const email = arg("email");
const password = arg("password");
const name = arg("name") ?? "Le coiffeur";

if (!email || !password) {
  console.error('Usage : node scripts/create-admin.mjs --email=... --password="..." --name="..."');
  process.exit(1);
}
if (Buffer.byteLength(password, "utf-8") > 72) {
  console.error("Le mot de passe dépasse 72 octets (limite bcrypt).");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Le mot de passe doit faire au moins 10 caractères.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant. Renseignez-le dans .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const passwordHash = await bcrypt.hash(password, 12);

const rows = await sql`
  INSERT INTO admin_users (email, password_hash, full_name)
  VALUES (${email.toLowerCase()}, ${passwordHash}, ${name})
  ON CONFLICT (lower(email)) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    sessions_valid_from = now()
  RETURNING id, email, full_name
`;

console.log(`Compte administrateur prêt : ${rows[0].email} (${rows[0].full_name})`);
