import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with additional tables for the bidding system.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bidding rooms created by hosts.
 * Each room has a unique auto-generated ID and tracks the current state.
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("roomId", { length: 8 }).notNull().unique(), // Auto-generated unique room ID (e.g., "ABC12345")
  hostUserId: int("hostUserId").notNull(), // Reference to the host user
  status: mysqlEnum("status", ["waiting", "active", "completed"]).default("waiting").notNull(),
  currentItemId: int("currentItemId"), // Reference to the current bidding item
  currentRoundActive: boolean("currentRoundActive").default(false).notNull(),
  currentRoundEndTime: timestamp("currentRoundEndTime"), // When the current round timer ends
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Bidding items added by the host to a room.
 * Each item has a name, description, and starting price.
 */
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(), // Reference to the room
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startingPrice: decimal("startingPrice", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  winnerId: int("winnerId"), // Reference to the winning participant (null if no winner yet)
  winningBidAmount: decimal("winningBidAmount", { precision: 10, scale: 2 }), // The winning bid amount
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

/**
 * Individual bids placed by guests during a bidding round.
 * Tracks the bid amount, bidder, and timestamp.
 */
export const bids = mysqlTable("bids", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(), // Reference to the item being bid on
  participantId: int("participantId").notNull(), // Reference to the participant who placed the bid
  bidAmount: decimal("bidAmount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bid = typeof bids.$inferSelect;
export type InsertBid = typeof bids.$inferInsert;

/**
 * Participants (guests) in a bidding room.
 * Tracks guest name and their participation status.
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(), // Reference to the room
  guestName: varchar("guestName", { length: 255 }).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;
