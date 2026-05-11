import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function GuestJoinRoom() {
  const [, setLocation] = useLocation();
  const [roomId, setRoomId] = useState("");
  const [guestName, setGuestName] = useState("");

  const joinMutation = trpc.participant.join.useMutation({
    onSuccess: (participant) => {
      toast.success("🎉 Welcome to the room!");
      setLocation(`/guest/bidding/${roomId}/${participant.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join room");
    },
  });

  const getRoomQuery = trpc.room.getByRoomId.useQuery(
    { roomId: roomId.toUpperCase() },
    { enabled: false }
  );

  const handleJoin = async () => {
    if (!roomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }
    if (!guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      const room = await getRoomQuery.refetch();
      if (room.data) {
        joinMutation.mutate({
          roomId: room.data.id,
          guestName: guestName.trim(),
        });
      } else {
        toast.error("Room not found");
      }
    } catch (error: any) {
      toast.error("Room not found");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 flex items-center justify-center px-4 py-8">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-blue-200 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-cyan-200 rounded-full opacity-20 animate-float" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Header */}
      <button
        onClick={() => setLocation("/")}
        className="fixed top-6 left-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-20"
      >
        <ArrowLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div className="relative z-10 w-full max-w-md">
        <div className="card-elevated p-8 md:p-12">
          <div className="text-center mb-8">
            <img src="jdesign.png" alt="Jdesign Studio Logo" className="w-16 h-16 mx-auto mb-4 animate-scale-pop" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              Join Room
            </h1>
            <p className="text-gray-600 text-lg">
              Enter your name and room ID to start bidding!
            </p>
          </div>

          <div className="space-y-5">
            {/* Guest Name Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="input-elegant"
              />
            </div>

            {/* Room ID Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                placeholder="e.g., ABC12345"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="input-elegant font-mono text-lg"
              />
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={joinMutation.isPending}
              className="button-secondary w-full py-4 text-lg flex items-center justify-center mt-6"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "✨ Join Room"
              )}
            </button>

            {/* Back Button */}
            <button
              onClick={() => setLocation("/")}
              className="w-full px-6 py-4 rounded-full font-bold text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300"
            >
              ← Back Home
            </button>
          </div>

          {/* Tips */}
          <div className="mt-8 space-y-3">
            <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Ask the host for the room ID
              </p>
            </div>
            <div className="bg-cyan-50 rounded-2xl p-4 border-2 border-cyan-200">
              <p className="text-xs text-cyan-800">
                🎯 <strong>Ready?</strong> Get set to place amazing bids!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
