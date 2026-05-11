import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

// Type definitions for WebSocket events
export interface RoomEventMap {
  "bid-placed": {
    participantId: number;
    participantName: string;
    bidAmount: string;
    timestamp: number;
  };
  "round-started": {
    itemId: number;
    itemName: string;
    description: string;
    startingPrice: string;
    timerDuration: number; // in seconds
    endTime: number; // timestamp when round ends
  };
  "round-ended": {
    itemId: number;
    winnerId: number | null;
    winnerName: string | null;
    winningBidAmount: string | null;
  };
  "item-added": {
    itemId: number;
    itemName: string;
    description: string;
    startingPrice: string;
  };
  "participant-joined": {
    participantId: number;
    participantName: string;
    totalParticipants: number;
  };
  "room-state-update": {
    roomId: string;
    status: string;
    currentItemId: number | null;
    currentRoundActive: boolean;
    participants: Array<{ id: number; name: string }>;
    currentBids: Array<{ participantName: string; bidAmount: string }>;
  };
}

interface ClientSocket extends Socket {
  roomId?: string;
  participantId?: number;
  isHost?: boolean;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private roomConnections: Map<string, Set<string>> = new Map(); // roomId -> Set of socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: ClientSocket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Join room
      socket.on("join-room", (data: { roomId: string; participantId?: number; isHost?: boolean }) => {
        const { roomId, participantId, isHost } = data;
        socket.roomId = roomId;
        socket.participantId = participantId;
        socket.isHost = isHost || false;

        socket.join(roomId);

        if (!this.roomConnections.has(roomId)) {
          this.roomConnections.set(roomId, new Set());
        }
        this.roomConnections.get(roomId)!.add(socket.id);

        console.log(`[WebSocket] Client ${socket.id} joined room ${roomId}`);
      });

      // Handle bid placed
      socket.on("bid-placed", (data: RoomEventMap["bid-placed"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("bid-placed", data);
          console.log(`[WebSocket] Bid placed in room ${socket.roomId}: ${data.participantName} - ${data.bidAmount}`);
        }
      });

      // Handle round started
      socket.on("round-started", (data: RoomEventMap["round-started"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("round-started", data);
          console.log(`[WebSocket] Round started in room ${socket.roomId} for item ${data.itemId}`);
        }
      });

      // Handle round ended
      socket.on("round-ended", (data: RoomEventMap["round-ended"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("round-ended", data);
          console.log(`[WebSocket] Round ended in room ${socket.roomId}`);
        }
      });

      // Handle item added
      socket.on("item-added", (data: RoomEventMap["item-added"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("item-added", data);
          console.log(`[WebSocket] Item added in room ${socket.roomId}: ${data.itemName}`);
        }
      });

      // Handle participant joined
      socket.on("participant-joined", (data: RoomEventMap["participant-joined"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("participant-joined", data);
          console.log(`[WebSocket] Participant joined in room ${socket.roomId}: ${data.participantName}`);
        }
      });

      // Handle room state update
      socket.on("room-state-update", (data: RoomEventMap["room-state-update"]) => {
        if (socket.roomId) {
          this.io.to(socket.roomId).emit("room-state-update", data);
        }
      });

      // Disconnect
      socket.on("disconnect", () => {
        if (socket.roomId) {
          const connections = this.roomConnections.get(socket.roomId);
          if (connections) {
            connections.delete(socket.id);
            if (connections.size === 0) {
              this.roomConnections.delete(socket.roomId);
            }
          }
        }
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcast an event to all clients in a room
   */
  public broadcastToRoom<K extends keyof RoomEventMap>(
    roomId: string,
    event: K,
    data: RoomEventMap[K]
  ) {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Get the number of connected clients in a room
   */
  public getRoomConnectionCount(roomId: string): number {
    return this.roomConnections.get(roomId)?.size || 0;
  }

  /**
   * Get the Socket.IO server instance (for advanced usage)
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
