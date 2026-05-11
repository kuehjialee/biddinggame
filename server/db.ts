import { eq, and, desc, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, rooms, items, bids, participants, Room, Item, Bid, Participant } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// Room Queries
// ============================================================================

/**
 * Generate a unique 8-character room ID (e.g., "ABC12345")
 */
export function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new bidding room
 */
export async function createRoom(hostUserId: number): Promise<Room | null> {
  const db = await getDb();
  if (!db) return null;

  let roomId = generateRoomId();
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure unique room ID
  while (attempts < maxAttempts) {
    const existing = await db.select().from(rooms).where(eq(rooms.roomId, roomId)).limit(1);
    if (existing.length === 0) break;
    roomId = generateRoomId();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique room ID");
  }

  const result = await db.insert(rooms).values({
    roomId,
    hostUserId,
    status: "waiting",
  });

  const created = await db.select().from(rooms).where(eq(rooms.roomId, roomId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

/**
 * Get room by room ID
 */
export async function getRoomByRoomId(roomId: string): Promise<Room | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(rooms).where(eq(rooms.roomId, roomId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Get room by database ID
 */
export async function getRoomById(id: number): Promise<Room | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Update room status
 */
export async function updateRoomStatus(roomId: number, status: "waiting" | "active" | "completed"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(rooms).set({ status }).where(eq(rooms.id, roomId));
}

/**
 * Update current round state
 */
export async function updateRoundState(roomId: number, currentItemId: number | null, roundActive: boolean, endTime: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(rooms).set({
    currentItemId,
    currentRoundActive: roundActive,
    currentRoundEndTime: endTime,
  }).where(eq(rooms.id, roomId));
}

// ============================================================================
// Item Queries
// ============================================================================

/**
 * Create a new bidding item
 */
export async function createItem(roomId: number, name: string, description: string | null, startingPrice: string): Promise<Item | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(items).values({
    roomId,
    name,
    description,
    startingPrice,
  });

  const created = await db.select().from(items).where(eq(items.id, result[0].insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

/**
 * Get all items for a room
 */
export async function getItemsByRoomId(roomId: number): Promise<Item[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(items).where(eq(items.roomId, roomId));
}

/**
 * Get item by ID
 */
export async function getItemById(id: number): Promise<Item | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Update item status
 */
export async function updateItemStatus(itemId: number, status: "pending" | "active" | "completed"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(items).set({ status }).where(eq(items.id, itemId));
}

/**
 * Mark item as completed with winner
 */
export async function completeItem(itemId: number, winnerId: number, winningBidAmount: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(items).set({
    status: "completed",
    winnerId,
    winningBidAmount,
  }).where(eq(items.id, itemId));
}

// ============================================================================
// Bid Queries
// ============================================================================

/**
 * Create a new bid
 */
export async function createBid(itemId: number, participantId: number, bidAmount: string): Promise<Bid | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(bids).values({
    itemId,
    participantId,
    bidAmount,
  });

  const created = await db.select().from(bids).where(eq(bids.id, result[0].insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

/**
 * Get all bids for an item, ordered by amount (highest first)
 */
export async function getBidsByItemId(itemId: number): Promise<Bid[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(bids).where(eq(bids.itemId, itemId)).orderBy(desc(bids.bidAmount));
}

/**
 * Get the highest bid for an item
 */
export async function getHighestBidForItem(itemId: number): Promise<Bid | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(bids).where(eq(bids.itemId, itemId)).orderBy(desc(bids.bidAmount)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// Participant Queries
// ============================================================================

/**
 * Add a participant to a room
 */
export async function addParticipant(roomId: number, guestName: string): Promise<Participant | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(participants).values({
    roomId,
    guestName,
  });

  const created = await db.select().from(participants).where(eq(participants.id, result[0].insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

/**
 * Get all participants in a room
 */
export async function getParticipantsByRoomId(roomId: number): Promise<Participant[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(participants).where(eq(participants.roomId, roomId));
}

/**
 * Get participant by ID
 */
export async function getParticipantById(id: number): Promise<Participant | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
