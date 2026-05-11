import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createRoom,
  getRoomByRoomId,
  getRoomById,
  createItem,
  getItemsByRoomId,
  getItemById,
  createBid,
  getBidsByItemId,
  getHighestBidForItem,
  addParticipant,
  getParticipantByRoomIdAndName,
  getParticipantsByRoomId,
  getParticipantById,
  updateRoundState,
  updateItemStatus,
  completeItem,
} from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // Room Management
  // ============================================================================
  room: router({
    /**
     * Create a new bidding room (host only)
     */
    create: protectedProcedure.mutation(async ({ ctx }) => {
      const room = await createRoom(ctx.user.id);
      if (!room) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create room" });
      }
      return room;
    }),

    /**
     * Get room details by room ID
     */
    getByRoomId: publicProcedure
      .input(z.object({ roomId: z.string() }))
      .query(async ({ input }) => {
        const room = await getRoomByRoomId(input.roomId);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
        }
        return room;
      }),

    /**
     * Get room details by database ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const room = await getRoomById(input.id);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
        }
        return room;
      }),
  }),

  // ============================================================================
  // Item Management
  // ============================================================================
  item: router({
    /**
     * Create a new bidding item (host only)
     */
    create: publicProcedure
      .input(
        z.object({
          roomId: z.number(),
          name: z.string().min(1, "Item name is required"),
          description: z.string().optional(),
          startingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
        })
      )
      .mutation(async ({ input }) => {
        const item = await createItem(
          input.roomId,
          input.name,
          input.description || null,
          input.startingPrice
        );
        if (!item) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create item" });
        }
        return item;
      }),

    /**
     * Get all items for a room
     */
    getByRoomId: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return await getItemsByRoomId(input.roomId);
      }),

    /**
     * Get item by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const item = await getItemById(input.id);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }
        return item;
      }),
  }),

  // ============================================================================
  // Bidding
  // ============================================================================
  bid: router({
    /**
     * Place a bid on an item
     */
    place: publicProcedure
      .input(
        z.object({
          itemId: z.number(),
          participantId: z.number(),
          bidAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid bid amount"),
        })
      )
      .mutation(async ({ input }) => {
        // Validate item exists
        const item = await getItemById(input.itemId);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        // Validate item is active
        if (item.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item is not currently active for bidding" });
        }

        // Validate bid amount is higher than starting price
        const bidAmount = parseFloat(input.bidAmount);
        const startingPrice = parseFloat(item.startingPrice);
        if (bidAmount < startingPrice) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Bid must be at least ${item.startingPrice}`,
          });
        }

        // Check if bid is exactly one increment above current highest bid
        const highestBid = await getHighestBidForItem(input.itemId);
        if (highestBid) {
          const highestAmount = parseFloat(highestBid.bidAmount);
          const expectedAmount = parseFloat((highestAmount + 1).toFixed(2));
          if (bidAmount !== expectedAmount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Bid must be exactly ${expectedAmount.toFixed(2)} (one increment above the current highest bid)`,
            });
          }
        } else {
          const expectedStart = parseFloat((startingPrice + 1).toFixed(2));
          if (bidAmount !== expectedStart) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `First bid must be exactly ${expectedStart.toFixed(2)} (starting price + 1)`,
            });
          }
        }

        // Create the bid
        const bid = await createBid(input.itemId, input.participantId, input.bidAmount);
        if (!bid) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to place bid" });
        }

        return bid;
      }),

    /**
     * Get all bids for an item
     */
    getByItemId: publicProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ input }) => {
        return await getBidsByItemId(input.itemId);
      }),

    /**
     * Get the highest bid for an item
     */
    getHighest: publicProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ input }) => {
        return await getHighestBidForItem(input.itemId);
      }),
  }),

  // ============================================================================
  // Participants
  // ============================================================================
  participant: router({
    /**
     * Join a room as a guest
     */
    join: publicProcedure
      .input(
        z.object({
          roomId: z.number(),
          guestName: z.string().min(1, "Guest name is required").max(255),
        })
      )
      .mutation(async ({ input }) => {
        // Validate room exists
        const room = await getRoomById(input.roomId);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
        }

        // Prevent duplicate names in the same room
        const existingParticipant = await getParticipantByRoomIdAndName(input.roomId, input.guestName.trim());
        if (existingParticipant) {
          throw new TRPCError({ code: "CONFLICT", message: "This name is already taken in the room" });
        }

        // Add participant
        const participant = await addParticipant(input.roomId, input.guestName.trim());
        if (!participant) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to join room" });
        }

        return participant;
      }),

    /**
     * Get all participants in a room
     */
    getByRoomId: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return await getParticipantsByRoomId(input.roomId);
      }),

    /**
     * Get participant by ID
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const participant = await getParticipantById(input.id);
        if (!participant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
        }
        return participant;
      }),
  }),

  // ============================================================================
  // Round Management (for host)
  // ============================================================================
  round: router({
    /**
     * Start a bidding round for an item
     */
    start: publicProcedure
      .input(
        z.object({
          roomId: z.number(),
          itemId: z.number(),
          timerDuration: z.enum(["10", "30", "60"]), // Only allow 10, 30, or 60 seconds
        })
      )
      .mutation(async ({ input }) => {
        // Validate room and item
        const room = await getRoomById(input.roomId);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
        }

        const item = await getItemById(input.itemId);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        if (item.roomId !== input.roomId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item does not belong to this room" });
        }

        // Set item to active
        await updateItemStatus(input.itemId, "active");

        // Calculate round end time
        const durationSeconds = parseInt(input.timerDuration);
        const endTime = new Date(Date.now() + durationSeconds * 1000);

        // Update room round state
        await updateRoundState(input.roomId, input.itemId, true, endTime);

        return {
          success: true,
          endTime: endTime.getTime(),
          durationSeconds,
        };
      }),

    /**
     * End a bidding round and determine winner
     */
    end: publicProcedure
      .input(z.object({ roomId: z.number(), itemId: z.number() }))
      .mutation(async ({ input }) => {
        // Get the highest bid
        const highestBid = await getHighestBidForItem(input.itemId);

        if (highestBid) {
          // Get participant details
          const participant = await getParticipantById(highestBid.participantId);
          if (!participant) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
          }

          // Mark item as completed with winner
          await completeItem(input.itemId, highestBid.participantId, highestBid.bidAmount);

          // Update room state
          await updateRoundState(input.roomId, null, false, null);

          return {
            success: true,
            winnerId: highestBid.participantId,
            winnerName: participant.guestName,
            winningBidAmount: highestBid.bidAmount,
          };
        } else {
          // No bids placed
          await updateItemStatus(input.itemId, "completed");
          await updateRoundState(input.roomId, null, false, null);

          return {
            success: true,
            winnerId: null,
            winnerName: null,
            winningBidAmount: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
