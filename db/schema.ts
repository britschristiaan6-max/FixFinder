import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * A trade professional's public profile.
 *
 * One row per Netlify Identity user. `user_id` is the Identity `sub` claim,
 * which is the only field a client may never set for itself — it always comes
 * from the verified JWT on the server.
 */
export const proProfiles = pgTable(
  "pro_profiles",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull().unique(),
    email: text().notNull(),
    displayName: text("display_name").notNull(),
    trade: text().notNull(),
    serviceArea: text("service_area").notNull(),
    town: text().notNull().default(""),
    phone: text().notNull().default(""),
    bio: text().notNull().default(""),
    yearsExperience: integer("years_experience").notNull().default(0),
    calloutFee: integer("callout_fee").notNull().default(0),
    qualifications: text().notNull().default(""),
    // Pros start unlisted so a half-finished profile never reaches the directory.
    published: boolean().notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pro_profiles_trade_idx").on(table.trade),
    index("pro_profiles_published_idx").on(table.published),
  ],
);

/**
 * A homeowner's job enquiry, submitted from the form on the landing page.
 * Previously this was written to localStorage and seen by nobody.
 */
export const jobRequests = pgTable(
  "job_requests",
  {
    id: serial().primaryKey(),
    service: text().notNull(),
    area: text().notNull(),
    details: text().notNull().default(""),
    urgency: text().notNull(),
    contactName: text("contact_name").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    status: text().notNull().default("new"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("job_requests_created_at_idx").on(table.createdAt)],
);
