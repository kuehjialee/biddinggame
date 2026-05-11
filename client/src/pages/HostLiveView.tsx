import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ArrowLeft, Eye, Users, Trophy, Clock3 } from "lucide-react";
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

export default function HostLiveView() {
  const params = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const roomId = params?.roomId;

  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bids, setBids] = useState<Array<{ participantName: string; bidAmount: string }>>([]);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const roomQuery = trpc.room.getByRoomId.useQuery(
    { roomId: roomId || "" },
    { enabled: !!roomId }
  );

  const itemsQuery = trpc.item.getByRoomId.useQuery(
    { roomId: roomQuery.data?.id ?? 0 },
    { enabled: !!roomQuery.data?.id }
  );

  const participantsQuery = trpc.participant.getByRoomId.useQuery(
    { roomId: roomQuery.data?.id ?? 0 },
    { enabled: !!roomQuery.data?.id }
  );

  const { on } = useWebSocket({ roomId: roomId || "", isHost: true });

  useEffect(() => {
    on("round-started", (data: any) => {
      setCurrentRound(data);
      setTimeLeft(data.timerDuration);
      setBids([]);
      setShowWinner(false);
      setWinner(null);
      toast.success("Live view: round started");
    });

    on("bid-placed", (data: any) => {
      setBids((prev) => [
        ...prev,
        { participantName: data.participantName, bidAmount: data.bidAmount },
      ]);
    });

    on("round-ended", (data: any) => {
      setWinner(data);
      setShowWinner(true);
      setCurrentRound(null);
      setTimeLeft(0);
      toast.success("Live view: round ended");
    });

    on("item-added", () => {
      itemsQuery.refetch();
    });

    on("participant-joined", () => {
      participantsQuery.refetch();
    });
  }, [on, itemsQuery, participantsQuery]);

  useEffect(() => {
    if (roomQuery.data?.currentRoundActive && roomQuery.data.currentItemId) {
      const activeItem = itemsQuery.data?.find((item) => item.id === roomQuery.data?.currentItemId);
      const endTime = roomQuery.data.currentRoundEndTime
        ? new Date(roomQuery.data.currentRoundEndTime).getTime()
        : Date.now();

      if (activeItem) {
        setCurrentRound({
          itemId: activeItem.id,
          itemName: activeItem.name,
          description: activeItem.description || "",
          startingPrice: activeItem.startingPrice,
          timerDuration: Math.max(0, Math.ceil((endTime - Date.now()) / 1000)),
          endTime,
        });
        setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
      }
    }
  }, [roomQuery.data, itemsQuery.data]);

  useEffect(() => {
    if (!currentRound || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound, timeLeft]);

  if (!roomQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-pink-50 p-6">
      <button
        onClick={() => setLocation(`/host/dashboard/${roomId}`)}
        className="fixed top-6 left-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-20"
      >
        <ArrowLeft className="w-6 h-6 text-gray-700" />
      </button>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-200">
                  <Eye className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-gray-900">Host Live View</h1>
                  <p className="text-gray-600">Real-time auction display for guests and host screens.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="card-elevated p-4 bg-blue-50 border-2 border-blue-200 rounded-3xl">
                <p className="text-sm font-bold text-blue-700">ROOM ID</p>
                <p className="text-2xl font-mono font-bold text-blue-600">{roomId}</p>
              </div>
              <div className="card-elevated p-4 bg-purple-50 border-2 border-purple-200 rounded-3xl">
                <p className="text-sm font-bold text-purple-700">PARTICIPANTS</p>
                <p className="text-2xl font-bold text-purple-600">{participantsQuery.data?.length || 0}</p>
              </div>
              <div className="card-elevated p-4 bg-yellow-50 border-2 border-yellow-200 rounded-3xl">
                <p className="text-sm font-bold text-yellow-700">ACTIVE ITEMS</p>
                <p className="text-2xl font-bold text-yellow-600">{itemsQuery.data?.filter((item) => item.status !== "completed").length || 0}</p>
              </div>
            </div>
          </div>

          {showWinner && winner ? (
            <div className="card-elevated p-10 bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 border-2 border-orange-300 rounded-3xl text-center">
              <p className="text-sm text-orange-700 font-bold mb-4">ROUND COMPLETE</p>
              <h2 className="text-5xl font-bold text-orange-800 mb-4">Winner Announced</h2>
              {winner.winnerId ? (
                <>
                  <p className="text-4xl font-bold text-orange-700">{winner.winnerName}</p>
                  <p className="text-xl text-gray-700 mt-3">Winning Bid: <span className="font-bold text-orange-600">${winner.winningBidAmount}</span></p>
                </>
              ) : (
                <p className="text-xl text-gray-700">No bids were placed for this round.</p>
              )}
            </div>
          ) : currentRound ? (
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="card-elevated p-10 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-3xl">
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-sm text-blue-700 font-bold">CURRENT ITEM</p>
                    <h2 className="text-5xl font-bold text-gray-900 mt-3">{currentRound.itemName}</h2>
                    {currentRound.description && <p className="text-lg text-gray-700 mt-2">{currentRound.description}</p>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-5 rounded-3xl bg-white border border-blue-100">
                      <p className="text-sm text-blue-700 uppercase tracking-[0.24em]">Starting Price</p>
                      <p className="text-3xl font-bold text-blue-600 mt-3">${currentRound.startingPrice}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-white border border-blue-100">
                      <p className="text-sm text-blue-700 uppercase tracking-[0.24em]">Time Left</p>
                      <p className="text-3xl font-bold text-orange-600 mt-3">{timeLeft}s</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-white border border-blue-100">
                      <p className="text-sm text-blue-700 uppercase tracking-[0.24em]">Highest Bid</p>
                      <p className="text-3xl font-bold text-green-600 mt-3">${bids.length > 0 ? bids[0].bidAmount : currentRound.startingPrice}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-8 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-sm font-bold text-gray-700">Live Bids</p>
                    <p className="text-xs text-gray-500">Latest activity is shown in real-time.</p>
                  </div>
                  <Clock3 className="w-5 h-5 text-purple-600" />
                </div>
                {bids.length > 0 ? (
                  <div className="space-y-3 max-h-[42rem] overflow-y-auto">
                    {bids.map((bid, idx) => (
                      <div key={idx} className="p-4 rounded-3xl bg-white border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold text-gray-900">{bid.participantName}</p>
                          <p className="font-bold text-green-600">${bid.bidAmount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No bids yet. Waiting for participants to join the round.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card-elevated p-10 bg-gradient-to-br from-purple-100 to-blue-100 border-2 border-purple-300 rounded-3xl text-center">
              <p className="text-lg font-bold text-gray-900 mb-4">Waiting for the host to start a round</p>
              <p className="text-sm text-gray-700">This screen will update automatically once the auction begins.</p>
            </div>
          )}

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="card-elevated p-8 bg-white border-2 border-blue-100 rounded-3xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Participants</h3>
              {participantsQuery.data?.length ? (
                <ul className="space-y-3">
                  {participantsQuery.data.map((participant) => (
                    <li key={participant.id} className="flex items-center justify-between p-4 rounded-3xl bg-blue-50 border border-blue-100">
                      <span className="font-semibold text-gray-900">{participant.guestName}</span>
                      <span className="text-sm text-gray-500">ID {participant.id}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No guests have joined yet.</p>
              )}
            </div>

            <div className="card-elevated p-8 bg-white border-2 border-yellow-100 rounded-3xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Items</h3>
              {itemsQuery.data?.length ? (
                <div className="space-y-3">
                  {itemsQuery.data.map((item) => (
                    <div key={item.id} className="p-4 rounded-3xl bg-yellow-50 border border-yellow-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <span className="text-sm text-gray-500">{item.status}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">${item.startingPrice}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No items have been added to this room yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
