import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function HostCreateRoom() {
  const [, setLocation] = useLocation();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createRoomMutation = trpc.room.create.useMutation({
    onSuccess: (room) => {
      setRoomId(room.roomId);
      toast.success("🎉 Room created! Share the ID with guests");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create room");
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("✅ Room ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartBidding = () => {
    if (roomId) {
      setLocation(`/host/dashboard/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-purple-50 flex items-center justify-center px-4 py-8">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-40 h-40 bg-orange-200 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-float" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Header */}
      <button
        onClick={() => setLocation("/")}
        className="fixed top-6 left-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-20"
      >
        <ArrowLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div className="relative z-10 w-full max-w-md">
        {!roomId ? (
          <div className="card-elevated p-8 md:p-12">
            <div className="text-center mb-8">
              <img src="jdesign.png" alt="Jdesign Studio Logo" className="w-16 h-16 mx-auto mb-4 animate-scale-pop" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                Create Room
              </h1>
              <p className="text-gray-600 text-lg">
                Start your bidding adventure!
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={createRoomMutation.isPending}
                className="button-primary w-full py-4 text-lg flex items-center justify-center"
              >
                {createRoomMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "🎉 Create New Room"
                )}
              </button>

              <button
                onClick={() => setLocation("/")}
                className="w-full px-6 py-4 rounded-full font-bold text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300"
              >
                ← Back Home
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You'll get a unique room ID to share with guests
              </p>
            </div>
          </div>
        ) : (
          <div className="card-elevated p-8 md:p-12">
            <div className="text-center mb-8 animate-scale-pop">
              <div className="text-6xl mb-4">🎊</div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                Room Created!
              </h1>
              <p className="text-gray-600 text-lg">
                Your bidding room is ready
              </p>
            </div>

            <div className="space-y-6">
              {/* Room ID Display */}
              <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-2xl p-6 border-2 border-orange-300">
                <p className="text-sm text-orange-700 font-bold mb-2">YOUR ROOM ID</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-3xl md:text-4xl font-bold text-orange-600 font-mono">
                    {roomId}
                  </p>
                  <button
                    onClick={handleCopyRoomId}
                    className="p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors duration-300 shadow-md hover:shadow-lg"
                  >
                    {copied ? (
                      <Check className="w-6 h-6 text-green-500" />
                    ) : (
                      <Copy className="w-6 h-6 text-orange-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <p className="text-sm text-purple-800 mb-3">
                  <strong>📢 Share with guests:</strong>
                </p>
                <p className="text-purple-700 font-mono text-lg font-bold">
                  {roomId}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleStartBidding}
                  className="button-primary w-full py-4 text-lg flex items-center justify-center"
                >
                  🚀 Start Bidding
                </button>

                <button
                  onClick={() => setLocation("/")}
                  className="w-full px-6 py-4 rounded-full font-bold text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300"
                >
                  ← Back Home
                </button>
              </div>

              {/* Tips */}
              <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-200">
                <p className="text-xs text-green-800">
                  ✨ <strong>Pro tip:</strong> Keep this screen open while guests join. You'll see them appear in the dashboard!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
