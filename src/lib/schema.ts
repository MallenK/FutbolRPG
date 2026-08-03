import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core"

// ─── Better Auth tables ────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// ─── Game tables ───────────────────────────────────────────────────────────

export const player = pgTable("player", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: text("position").notNull(),
  nationality: text("nationality").notNull().default("España"),
  age: integer("age").notNull().default(18),
  attributes: jsonb("attributes").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const career = pgTable("career", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => player.id, { onDelete: "cascade" }),
  currentClub: text("current_club").notNull(),
  currentLeague: text("current_league").notNull(),
  currentSeason: integer("current_season").notNull().default(1),
  status: text("status").notNull().default("active"),
  stats: jsonb("stats"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const seasonHistory = pgTable("season_history", {
  id: text("id").primaryKey(),
  careerId: text("career_id")
    .notNull()
    .references(() => career.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  club: text("club").notNull(),
  stats: jsonb("stats").notNull(),
  trophies: jsonb("trophies"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const transferListing = pgTable("transfer_listing", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .unique()
    .references(() => player.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const transferOffer = pgTable("transfer_offer", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => transferListing.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fromPlayerName: text("from_player_name").notNull(),
  fromClub: text("from_club").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("transfer_offer_listing_idx").on(t.listingId),
])

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  playerPosition: text("player_position").notNull(),
  clubName: text("club_name").notNull(),
  eventType: text("event_type").notNull(), // 'match' | 'season_end'
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
