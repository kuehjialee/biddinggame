import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  createRoom: vi.fn(),
  getRoomByRoomId: vi.fn(),
  getRoomById: vi.fn(),
  createItem: vi.fn(),
  getItemsByRoomId: vi.fn(),
  getItemById: vi.fn(),
  createBid: vi.fn(),
  getBidsByItemId: vi.fn(),
  getHighestBidForItem: vi.fn(),
  addParticipant: vi.fn(),
  getParticipantByRoomIdAndName: vi.fn(),
  getParticipantsByRoomId: vi.fn(),
  getParticipantById: vi.fn(),
  updateRoundState: vi.fn(),
  updateItemStatus: vi.fn(),
  completeItem: vi.fn(),
}));

import * as db from "./db";

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Bidding System - tRPC Procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("room.create", () => {
    it("should create a new room for authenticated user", async () => {
      const mockRoom = {
        id: 1,
        roomId: "ABC12345",
        hostUserId: 1,
        status: "waiting" as const,
        currentItemId: null,
        currentRoundActive: false,
        currentRoundEndTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createRoom).mockResolvedValue(mockRoom);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.room.create();

      expect(result).toEqual(mockRoom);
      expect(db.createRoom).toHaveBeenCalledWith(1);
    });

    it("should throw error if room creation fails", async () => {
      vi.mocked(db.createRoom).mockResolvedValue(null);

      const caller = appRouter.createCaller(createMockContext());

      await expect(caller.room.create()).rejects.toThrow(
        "Failed to create room"
      );
    });
  });

  describe("room.getByRoomId", () => {
    it("should retrieve room by room ID", async () => {
      const mockRoom = {
        id: 1,
        roomId: "ABC12345",
        hostUserId: 1,
        status: "waiting" as const,
        currentItemId: null,
        currentRoundActive: false,
        currentRoundEndTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getRoomByRoomId).mockResolvedValue(mockRoom);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.room.getByRoomId({ roomId: "ABC12345" });

      expect(result).toEqual(mockRoom);
      expect(db.getRoomByRoomId).toHaveBeenCalledWith("ABC12345");
    });

    it("should throw NOT_FOUND if room does not exist", async () => {
      vi.mocked(db.getRoomByRoomId).mockResolvedValue(null);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.room.getByRoomId({ roomId: "INVALID" })
      ).rejects.toThrow("Room not found");
    });
  });

  describe("item.create", () => {
    it("should create a new item in a room", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Vintage Watch",
        description: "Beautiful antique watch",
        startingPrice: "100.00",
        status: "pending" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createItem).mockResolvedValue(mockItem);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.item.create({
        roomId: 1,
        name: "Vintage Watch",
        description: "Beautiful antique watch",
        startingPrice: "100.00",
      });

      expect(result).toEqual(mockItem);
      expect(db.createItem).toHaveBeenCalledWith(
        1,
        "Vintage Watch",
        "Beautiful antique watch",
        "100.00"
      );
    });

    it("should reject invalid price format", async () => {
      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.item.create({
          roomId: 1,
          name: "Item",
          startingPrice: "invalid",
        })
      ).rejects.toThrow("Invalid price format");
    });

    it("should require item name", async () => {
      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.item.create({
          roomId: 1,
          name: "",
          startingPrice: "100.00",
        })
      ).rejects.toThrow("Item name is required");
    });
  });

  describe("bid.place", () => {
    it("should place a valid first bid at starting price + 1", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "active" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockBid = {
        id: 1,
        itemId: 1,
        participantId: 1,
        bidAmount: "101.00",
        createdAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);
      vi.mocked(db.getHighestBidForItem).mockResolvedValue(null);
      vi.mocked(db.createBid).mockResolvedValue(mockBid);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.bid.place({
        itemId: 1,
        participantId: 1,
        bidAmount: "101.00",
      });

      expect(result).toEqual(mockBid);
      expect(db.createBid).toHaveBeenCalledWith(1, 1, "101.00");
    });

    it("should reject bid lower than starting price", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "active" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.bid.place({
          itemId: 1,
          participantId: 1,
          bidAmount: "50.00",
        })
      ).rejects.toThrow("Bid must be at least 100.00");
    });

    it("should reject a bid that is not exactly one increment above the current highest", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "active" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockHighestBid = {
        id: 1,
        itemId: 1,
        participantId: 1,
        bidAmount: "200.00",
        createdAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);
      vi.mocked(db.getHighestBidForItem).mockResolvedValue(mockHighestBid);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.bid.place({
          itemId: 1,
          participantId: 2,
          bidAmount: "202.00",
        })
      ).rejects.toThrow(
        "Bid must be exactly 201.00 (one increment above the current highest bid)"
      );
    });

    it("should reject bid not lower than starting price", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "active" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.bid.place({
          itemId: 1,
          participantId: 1,
          bidAmount: "50.00",
        })
      ).rejects.toThrow("Bid must be at least 100.00");
    });

    it("should reject first bid that is not starting price + 1", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "active" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);
      vi.mocked(db.getHighestBidForItem).mockResolvedValue(null);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.bid.place({
          itemId: 1,
          participantId: 1,
          bidAmount: "100.00",
        })
      ).rejects.toThrow("First bid must be exactly 101.00 (starting price + 1)");
    });

    it("should reject bid on inactive item", async () => {
      const mockItem = {
        id: 1,
        roomId: 1,
        name: "Watch",
        description: null,
        startingPrice: "100.00",
        status: "pending" as const,
        winnerId: null,
        winningBidAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getItemById).mockResolvedValue(mockItem);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.bid.place({
          itemId: 1,
          participantId: 1,
          bidAmount: "150.00",
        })
      ).rejects.toThrow("Item is not currently active for bidding");
    });
  });

  describe("participant.join", () => {
    it("should add participant to room", async () => {
      const mockRoom = {
        id: 1,
        roomId: "ABC12345",
        hostUserId: 1,
        status: "waiting" as const,
        currentItemId: null,
        currentRoundActive: false,
        currentRoundEndTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParticipant = {
        id: 1,
        roomId: 1,
        guestName: "John Doe",
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getRoomById).mockResolvedValue(mockRoom);
      vi.mocked(db.getParticipantByRoomIdAndName).mockResolvedValue(null);
      vi.mocked(db.addParticipant).mockResolvedValue(mockParticipant);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.participant.join({
        roomId: 1,
        guestName: "John Doe",
      });

      expect(result).toEqual(mockParticipant);
      expect(db.getParticipantByRoomIdAndName).toHaveBeenCalledWith(1, "John Doe");
      expect(db.addParticipant).toHaveBeenCalledWith(1, "John Doe");
    });

    it("should reject duplicate guest names in the same room", async () => {
      const mockRoom = {
        id: 1,
        roomId: "ABC12345",
        hostUserId: 1,
        status: "waiting" as const,
        currentItemId: null,
        currentRoundActive: false,
        currentRoundEndTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingParticipant = {
        id: 1,
        roomId: 1,
        guestName: "John Doe",
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getRoomById).mockResolvedValue(mockRoom);
      vi.mocked(db.getParticipantByRoomIdAndName).mockResolvedValue(existingParticipant);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.participant.join({
          roomId: 1,
          guestName: "John Doe",
        })
      ).rejects.toThrow("This name is already taken in the room");
    });

    it("should reject join with empty guest name", async () => {
      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.participant.join({
          roomId: 1,
          guestName: "",
        })
      ).rejects.toThrow("Guest name is required");
    });

    it("should reject join to non-existent room", async () => {
      vi.mocked(db.getRoomById).mockResolvedValue(null);

      const caller = appRouter.createCaller(createMockContext());

      await expect(
        caller.participant.join({
          roomId: 999,
          guestName: "John Doe",
        })
      ).rejects.toThrow("Room not found");
    });
  });

  describe("round.end", () => {
    it("should end round and determine winner", async () => {
      const mockHighestBid = {
        id: 1,
        itemId: 1,
        participantId: 1,
        bidAmount: "250.00",
        createdAt: new Date(),
      };

      const mockParticipant = {
        id: 1,
        roomId: 1,
        guestName: "Winner",
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getHighestBidForItem).mockResolvedValue(mockHighestBid);
      vi.mocked(db.getParticipantById).mockResolvedValue(mockParticipant);
      vi.mocked(db.completeItem).mockResolvedValue(undefined);
      vi.mocked(db.updateRoundState).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.round.end({
        roomId: 1,
        itemId: 1,
      });

      expect(result.winnerId).toBe(1);
      expect(result.winnerName).toBe("Winner");
      expect(result.winningBidAmount).toBe("250.00");
      expect(db.completeItem).toHaveBeenCalledWith(1, 1, "250.00");
    });

    it("should handle round with no bids", async () => {
      vi.mocked(db.getHighestBidForItem).mockResolvedValue(null);
      vi.mocked(db.updateItemStatus).mockResolvedValue(undefined);
      vi.mocked(db.updateRoundState).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.round.end({
        roomId: 1,
        itemId: 1,
      });

      expect(result.winnerId).toBeNull();
      expect(result.winnerName).toBeNull();
      expect(result.winningBidAmount).toBeNull();
    });
  });
});
