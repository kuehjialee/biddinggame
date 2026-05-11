import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CurrentRound {
  itemId: number;
  itemName: string;
  description: string;
  startingPrice: string;
  timerDuration: number;
  endTime: number;
}

interface WinnerInfo {
  winnerId: number | null;
  winnerName: string | null;
  winningBidAmount: string | null;
}

export default function GuestBidding() {
  const params = useParams<{ roomId: string; participantId: string }>();
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;
  const participantId = params?.participantId ? parseInt(params.participantId) : 0;

  const [nextBid, setNextBid] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [bids, setBids] = useState<Array<{ participantName: string; bidAmount: string }>>([]);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  // Fetch room data
  const roomQuery = trpc.room.getByRoomId.useQuery(
    { roomId: roomId || "" },
    { enabled: !!roomId }
  );

  // Fetch participant data
  const participantQuery = trpc.participant.getById.useQuery(
    { id: participantId },
    { enabled: participantId > 0 }
  );

  // WebSocket connection
  const { emit, on } = useWebSocket({
    roomId: roomId,
    participantId,
  });

  // Place bid mutation
  const placeBidMutation = trpc.bid.place.useMutation({
    onSuccess: (bid) => {
      toast.success("🎯 Bid placed!");
      emit("bid-placed", {
        participantId,
        participantName: participantQuery.data?.guestName || "Guest",
        bidAmount: bid.bidAmount,
        timestamp: Date.now(),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to place bid");
    },
  });

  const handlePlaceBid = () => {
    if (!nextBid.trim()) {
      toast.error("Please increase the price before bidding");
      return;
    }

    if (!currentRound) {
      toast.error("No active round");
      return;
    }

    placeBidMutation.mutate({
      itemId: currentRound.itemId,
      participantId,
      bidAmount: nextBid,
    });
  };

  const handleIncreaseBid = () => {
    const currentValue = nextBid ? parseFloat(nextBid) : parseFloat(currentRound?.startingPrice ?? "0") + 1;
    setNextBid((currentValue + 1).toFixed(2));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !placeBidMutation.isPending && timeLeft > 0) {
      handlePlaceBid();
    }
  };

  // Listen for round started
  useEffect(() => {
    on("round-started", (data: any) => {
      setCurrentRound(data);
      setTimeLeft(data.timerDuration);
      setBids([]);
      setShowWinner(false);
      setWinner(null);
      setNextBid((parseFloat(data.startingPrice) + 1).toFixed(2));
    });
  }, [on]);

  // Listen for bid placed
  useEffect(() => {
    on("bid-placed", (data: any) => {
      setBids((prev) => [
        ...prev,
        {
          participantName: data.participantName,
          bidAmount: data.bidAmount,
        },
      ]);
      setNextBid((parseFloat(data.bidAmount) + 1).toFixed(2));
    });
  }, [on]);

  // Listen for round ended
  useEffect(() => {
    on("round-ended", (data: any) => {
      setWinner(data);
      setShowWinner(true);
      setCurrentRound(null);
      setNextBid("");
      setTimeLeft(0);
    });
  }, [on]);

  // Timer countdown
  useEffect(() => {
    if (!currentRound || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound, timeLeft]);

  useEffect(() => {
    if (participantQuery.data) {
      emit("participant-joined", {
        participantId,
        participantName: participantQuery.data.guestName,
        totalParticipants: 0,
      });
    }
  }, [participantQuery.data, emit, participantId]);

  if (!roomQuery.data || !participantQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
            <img src="/manus-storage/LOGO_e3812815.png" alt="Jdesign Studio Logo" className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Bidding Arena</h1>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-lg text-gray-700">
              Welcome, <span className="font-bold text-orange-600">{participantQuery.data.guestName}</span>! 👋
            </p>
            <p className="text-lg text-gray-700">
              Room: <span className="font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{roomId}</span>
            </p>
          </div>
        </div>

        {showWinner && winner ? (
          // Winner Announcement
          <div className="card-elevated p-12 text-center max-w-2xl mx-auto bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 border-2 border-orange-300 animate-scale-pop">
            <h2 className="text-6xl font-bold mb-4 animate-bounce-gentle">🏆 WINNER! 🏆</h2>
            {winner.winnerId ? (
              <>
                <p className="text-4xl font-bold text-orange-600 mb-4 animate-heartbeat">
                  {winner.winnerName}
                </p>
                <p className="text-2xl text-gray-800 mb-6">
                  Winning Bid: <span className="font-bold text-orange-600 text-3xl">${winner.winningBidAmount}</span>
                </p>
              </>
            ) : (
              <p className="text-2xl text-gray-700">No bids placed</p>
            )}
            <button
              onClick={() => setLocation("/guest/join")}
              className="button-primary mt-8 inline-flex items-center"
            >
              🎊 Join Another Room
            </button>
          </div>
        ) : currentRound ? (
          // Active Bidding
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Bidding Area */}
            <div className="lg:col-span-2">
              {/* Item Details */}
              <div className="card-elevated p-8 mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300">
                <h2 className="text-4xl font-bold mb-2 text-gray-900">{currentRound.itemName}</h2>
                {currentRound.description && (
                  <p className="text-lg text-gray-700 mb-6">
                    {currentRound.description}
                  </p>
                )}
                <p className="text-xl text-blue-600 font-bold">
                  💰 Starting Price: ${currentRound.startingPrice}
                </p>
              </div>

              {/* Countdown Timer */}
              <div className={`card-elevated p-8 mb-6 text-center bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-300 transition-all duration-300 ${
                timeLeft <= 5 ? "animate-pulse-glow" : ""
              }`}>
                <p className="text-lg text-orange-700 font-bold mb-4">⏱️ Time Remaining</p>
                <div className={`text-8xl font-bold font-mono transition-all duration-300 ${
                  timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-orange-600"
                }`}>
                  {timeLeft}s
                </div>
              </div>

              {/* Bid Input */}
              <div className="card-elevated p-8 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">💎 Place Your Bid</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      readOnly
                      value={nextBid}
                      placeholder={currentRound ? "Press +1 to increase bid" : "Waiting for round..."}
                      className="input-elegant flex-1 bg-white/80"
                    />
                    <button
                      onClick={handleIncreaseBid}
                      disabled={!currentRound || timeLeft === 0}
                      className="button-secondary px-6 py-3"
                    >
                      +1
                    </button>
                  </div>

                  <button
                    onClick={handlePlaceBid}
                    disabled={placeBidMutation.isPending || timeLeft === 0 || !nextBid}
                    className="button-accent w-full py-4 text-lg"
                  >
                    {placeBidMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                        Bidding...
                      </>
                    ) : (
                      "🚀 Bid"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Bids Sidebar */}
            <div>
              <div className="card-elevated p-6 sticky top-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">📊 Live Bids</h3>
                {bids.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {bids.map((bid, idx) => (
                      <div key={idx} className="card-subtle p-4 animate-scale-pop bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-gray-900">{bid.participantName}</span>
                          <span className="text-green-600 font-bold text-lg">${bid.bidAmount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No bids yet. Be the first! 🎯</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Waiting for Round
          <div className="card-elevated p-12 text-center max-w-2xl mx-auto bg-gradient-to-br from-purple-100 to-blue-100 border-2 border-purple-300">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">⏳ Waiting for Host</h2>
            <p className="text-lg text-gray-700 mb-6">
              The host will start a bidding round soon...
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
              <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
