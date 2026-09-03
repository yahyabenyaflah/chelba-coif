import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Miroir typé de `drizzle/0001_init.sql`. La source de vérité reste le SQL :
 * toute modification ici doit être accompagnée d'une nouvelle migration.
 */

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  sessionsValidFrom: timestamp("sessions_valid_from", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    sessionsValidFrom: timestamp("sessions_valid_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_phone_idx").on(t.phone)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    durationMin: integer("duration_min").notNull(),
    priceMillimes: integer("price_millimes").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_active_idx").on(t.isActive, t.sortOrder)],
);

export const haircutStyles = pgTable(
  "haircut_styles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    cloudinaryPublicId: text("cloudinary_public_id").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("haircut_styles_active_idx").on(t.isActive, t.sortOrder)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    priceMillimes: integer("price_millimes").notNull(),
    notes: text("notes").notNull().default(""),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    index("bookings_starts_at_idx").on(t.startsAt),
    index("bookings_status_idx").on(t.status, t.startsAt),
    index("bookings_customer_idx").on(t.customerId, t.startsAt),
    index("bookings_phone_idx").on(t.contactPhone),
  ],
);

export const openingHours = pgTable("opening_hours", {
  weekday: smallint("weekday").primaryKey(),
  isClosed: boolean("is_closed").notNull().default(false),
  opensAt: time("opens_at").notNull().default("09:00"),
  closesAt: time("closes_at").notNull().default("19:00"),
  breakStart: time("break_start"),
  breakEnd: time("break_end"),
});

export const closures = pgTable(
  "closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("closures_range_idx").on(t.startDate, t.endDate)],
);

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    points: integer("points").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("loyalty_customer_idx").on(t.customerId, t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  bucket: text("bucket").primaryKey(),
  hits: integer("hits").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const salonSettings = pgTable("salon_settings", {
  id: smallint("id").primaryKey().default(1),
  salonName: text("salon_name").notNull().default("Chelba Coif"),
  phone: text("phone").notNull().default("+21650882529"),
  address: text("address").notNull().default("Djerba, Tunisie"),
  slotIntervalMin: integer("slot_interval_min").notNull().default(30),
  maxAdvanceDays: integer("max_advance_days").notNull().default(30),
  minAdvanceMin: integer("min_advance_min").notNull().default(60),
  pointsPerVisit: integer("points_per_visit").notNull().default(1),
  pointsForReward: integer("points_for_reward").notNull().default(10),
  rewardLabel: text("reward_label").notNull().default("Une coupe offerte"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type HaircutStyle = typeof haircutStyles.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];
export type Customer = typeof customers.$inferSelect;
export type OpeningHour = typeof openingHours.$inferSelect;
export type Closure = typeof closures.$inferSelect;
export type SalonSettings = typeof salonSettings.$inferSelect;
