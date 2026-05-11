import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useState, useEffect } from "react";
import { Loader2, Plus, Play, Square, ArrowLeft, Users, Eye } from "lucide-react";
import { toast } from "sonner";

export default function HostDashboard() {
  const params = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [timerDuration, setTimerDuration] = useState<"10" | "30" | "60">("30");
  const [activeRound, setActiveRound] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bids, setBids] = useState<Array<{ participantName: string; bidAmount: string }>>([]);

  // Fetch room data
  const roomQuery = trpc.room.getByRoomId.useQuery(
    { roomId: roomId || "" },
    { enabled: !!roomId }
  );

  // Fetch items for this room
  const itemsQuery = trpc.item.getByRoomId.useQuery(
    { roomId: roomQuery.data?.id ?? 0 },
    { enabled: !!roomQuery.data?.id }
  );

  // Fetch participants
  const participantsQuery = trpc.participant.getByRoomId.useQuery(
    { roomId: roomQuery.data?.id ?? 0 },
    { enabled: !!roomQuery.data?.id }
  );

  // WebSocket connection
  const { emit, on } = useWebSocket({
    roomId: roomId || "",
    isHost: true,
  });

  // Create item mutation
  const createItemMutation = trpc.item.create.useMutation({
    onSuccess: (item) => {
      toast.success("✨ Item added!");
      setItemName("");
      setItemDescription("");
      setStartingPrice("");
      itemsQuery.refetch();
      emit("item-added", {
        itemId: item.id,
        itemName: item.name,
        description: item.description || "",
        startingPrice: item.startingPrice,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add item");
    },
  });

  // Start round mutation
  const startRoundMutation = trpc.round.start.useMutation({
    onSuccess: (result, variables) => {
      const startedItem = itemsQuery.data?.find((item) => item.id === variables.itemId);
      toast.success("🎬 Round started!");
      setActiveRound(true);
      setCurrentItemId(variables.itemId);
      setTimeLeft(Math.max(0, Math.ceil((result.endTime - Date.now()) / 1000)));
      roomQuery.refetch();
      itemsQuery.refetch();

      emit("round-started", {
        itemId: variables.itemId,
        itemName: startedItem?.name || "",
        description: startedItem?.description || "",
        startingPrice: startedItem?.startingPrice || "0",
        timerDuration: parseInt(variables.timerDuration),
        endTime: result.endTime,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start round");
    },
  });

  // End round mutation
  const endRoundMutation = trpc.round.end.useMutation({
    onSuccess: (result) => {
      toast.success("🏁 Round ended!");
      setActiveRound(false);
      setCurrentItemId(null);
      setTimeLeft(0);
      setBids([]);
      roomQuery.refetch();
      itemsQuery.refetch();
      emit("round-ended", {
        itemId: roomQuery.data?.currentItemId || currentItemId || 0,
        winnerId: result.winnerId,
        winnerName: result.winnerName,
        winningBidAmount: result.winningBidAmount,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to end round");
    },
  });

  const handleAddItem = () => {
    if (!itemName.trim()) {
      toast.error("Please enter item name");
      return;
    }
    if (!startingPrice.trim()) {
      toast.error("Please enter starting price");
      return;
    }

    createItemMutation.mutate({
      roomId: roomQuery.data?.id || 0,
      name: itemName,
      description: itemDescription || undefined,
      startingPrice,
    });
  };

  const handleStartRound = () => {
    if (!itemsQuery.data || itemsQuery.data.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const lastItem = itemsQuery.data[itemsQuery.data.length - 1];
    setCurrentItemId(lastItem.id);
    startRoundMutation.mutate({
      roomId: roomQuery.data?.id || 0,
      itemId: lastItem.id,
      timerDuration,
    });
  };

  const handleEndRound = () => {
    const itemId = roomQuery.data?.currentItemId ?? currentItemId;
    if (!itemId) {
      toast.error("No active round to end");
      return;
    }

    endRoundMutation.mutate({
      roomId: roomQuery.data?.id || 0,
      itemId,
    });
  };

  // Listen for bid updates
  useEffect(() => {
    on("bid-placed", (data: any) => {
      setBids((prev) => [
        ...prev,
        {
          participantName: data.participantName,
          bidAmount: data.bidAmount,
        },
      ]);
    });

    on("participant-joined", (data: any) => {
      participantsQuery.refetch();
      toast.success(`${data.participantName} joined the room!`);
    });
  }, [on, participantsQuery]);

  useEffect(() => {
    if (!roomQuery.data) return;

    setActiveRound(roomQuery.data.currentRoundActive);
    setCurrentItemId(roomQuery.data.currentItemId);

    if (roomQuery.data.currentRoundActive && roomQuery.data.currentRoundEndTime) {
      const endTime = new Date(roomQuery.data.currentRoundEndTime).getTime();
      setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    }
  }, [roomQuery.data]);

  useEffect(() => {
    if (!activeRound || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRound, timeLeft]);

  useEffect(() => {
    if (activeRound && timeLeft === 0 && !endRoundMutation.isPending) {
      handleEndRound();
    }
  }, [activeRound, timeLeft, endRoundMutation.isPending]);

  if (!roomQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-pink-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => setLocation("/")}
        className="fixed top-6 left-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-20"
      >
        <ArrowLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
            <img src="/manus-storage/LOGO_e3812815.png" alt="Jdesign Studio Logo" className="w-14 h-14" />
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">Host Control</h1>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="card-elevated p-4 bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300">
              <p className="text-sm text-blue-700 font-bold">ROOM ID</p>
              <p className="text-2xl font-mono font-bold text-blue-600">{roomId}</p>
            </div>
            <div className="card-elevated p-4 bg-gradient-to-r from-purple-100 to-purple-200 border-2 border-purple-300">
              <p className="text-sm text-purple-700 font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> PARTICIPANTS
              </p>
              <p className="text-2xl font-bold text-purple-600">{participantsQuery.data?.length || 0}</p>
            </div>
            <button
              onClick={() => setLocation(`/host/live/${roomId}`)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/90 px-5 py-4 text-base font-bold text-gray-800 shadow-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <Eye className="w-5 h-5 text-orange-600" />
              Open Live View
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Add Items */}
          <div className="lg:col-span-2">
            {/* Add Item Card */}
            <div className="card-elevated p-8 mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">✨ Add Bidding Item</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Vintage Watch"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="input-elegant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Item details..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                    className="input-elegant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Starting Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    step="0.01"
                    className="input-elegant"
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  disabled={createItemMutation.isPending}
                  className="button-primary w-full py-4 text-lg flex items-center justify-center"
                >
                  {createItemMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Add Item
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="card-elevated p-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">📦 Items Queue</h2>
              {itemsQuery.data && itemsQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {itemsQuery.data.map((item, idx) => (
                    <div key={item.id} className="card-subtle p-5 bg-white border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 animate-slide-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-sm">
                              {idx + 1}
                            </span>
                            <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          )}
                          <p className="text-sm font-mono font-bold text-orange-600">
                            💰 Starting: ${item.startingPrice}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                          item.status === "active"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-2 border-green-300"
                            : item.status === "completed"
                            ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-2 border-blue-300"
                            : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-2 border-gray-300"
                        }`}>
                          {item.status === "active" ? "🔴 Active" : item.status === "completed" ? "✅ Done" : "⏳ Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg text-gray-600">No items added yet. Add your first item above! 👆</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Round Controls */}
          <div>
            <div className="card-elevated p-8 sticky top-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">🎮 Round Control</h2>

              <div className="space-y-6">
                {/* Timer Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">⏱️ Timer Duration</label>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(e.target.value as "10" | "30" | "60")}
                    disabled={activeRound}
                    className="input-elegant font-bold text-lg"
                  >
                    <option value="10">⚡ 10 seconds</option>
                    <option value="30">🔥 30 seconds</option>
                    <option value="60">🚀 60 seconds</option>
                  </select>
                </div>

                {activeRound && (
                  <div className="p-4 bg-blue-100 border-2 border-blue-300 rounded-2xl">
                    <p className="text-sm text-blue-700 font-bold">⏳ Remaining Time</p>
                    <p className="text-4xl font-bold text-blue-800 font-mono mt-2">{timeLeft}s</p>
                    {currentItemId && (
                      <p className="text-sm text-blue-700 mt-2">Item ID: {currentItemId}</p>
                    )}
                  </div>
                )}

                {/* Start/End Round Button */}
                {!activeRound ? (
                  <button
                    onClick={handleStartRound}
                    disabled={startRoundMutation.isPending}
                    className="button-primary w-full py-4 text-lg font-bold flex items-center justify-center"
                  >
                    {startRoundMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Round
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleEndRound}
                    disabled={endRoundMutation.isPending}
                    className="w-full px-6 py-4 rounded-full font-bold text-lg text-white bg-gradient-to-r from-red-500 to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                  >
                    {endRoundMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <Square className="w-5 h-5 mr-2" />
                        End Round
                      </>
                    )}
                  </button>
                )}

                {activeRound && (
                  <div className="p-4 bg-red-100 border-2 border-red-300 rounded-2xl">
                    <p className="text-sm text-red-700 font-bold">🔴 ROUND ACTIVE</p>
                  </div>
                )}
              </div>

              {/* Live Bids */}
              <div className="mt-8 pt-8 border-t-2 border-purple-200">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">📊 Live Bids</h3>
                {bids.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bids.map((bid, idx) => (
                      <div key={idx} className="card-subtle p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 animate-scale-pop">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-gray-900">{bid.participantName}</span>
                          <span className="text-green-600 font-bold text-lg">${bid.bidAmount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center py-4">Waiting for bids...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
