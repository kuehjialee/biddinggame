import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketOptions {
  roomId?: string;
  participantId?: number;
  isHost?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(undefined, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      console.log("[WebSocket] Connected");
      if (options.roomId) {
        socketRef.current?.emit("join-room", {
          roomId: options.roomId,
          participantId: options.participantId,
          isHost: options.isHost,
        });
      }
    });

    socketRef.current.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
    });

    socketRef.current.on("connect_error", (error: any) => {
      console.error("[WebSocket] Connection error:", error);
    });
  }, [options.roomId, options.participantId, options.isHost]);

  useEffect(() => {
    connect();

    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, [connect]);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit ${event}: socket not connected`);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected ?? false,
  };
}
