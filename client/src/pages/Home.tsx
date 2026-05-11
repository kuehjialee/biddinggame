import { useLocation } from "wouter";
import { Users, Trophy } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-blue-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-orange-200 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-32 right-10 w-40 h-40 bg-blue-200 rounded-full opacity-20 animate-float" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple-200 rounded-full opacity-20 animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center pt-12 md:pt-20 px-4">
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            <div className="animate-scale-pop">
              <img src="/manus-storage/LOGO_e3812815.png" alt="Jdesign Studio Logo" className="w-24 h-24 md:w-32 md:h-32" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gradient">Bidding Game</h1>
              <p className="text-sm md:text-base text-gray-600 font-semibold">by Jdesign Studio</p>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Real-time Bidding Arena</p>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the thrill of live bidding with friends! Fast-paced, fun, and exciting.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Host Card */}
            <div 
              className="card-elevated p-8 md:p-12 cursor-pointer group"
              onClick={() => setLocation("/host/create")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 p-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-16 h-16 text-orange-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Host</h2>
                <p className="text-gray-600 text-lg mb-6">
                  Create a bidding room, manage items, and control the auction with precision timing
                </p>
                <button className="button-primary w-full">
                  Create Room
                </button>
              </div>
            </div>

            {/* Guest Card */}
            <div 
              className="card-elevated p-8 md:p-12 cursor-pointer group"
              onClick={() => setLocation("/guest/join")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 p-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-16 h-16 text-blue-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Guest</h2>
                <p className="text-gray-600 text-lg mb-6">
                  Join a room and place bids on exciting items in real-time with instant updates
                </p>
                <button className="button-secondary w-full">
                  Join Room
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="card-elevated p-8 md:p-12 bg-gradient-to-r from-orange-50 to-blue-50">
            <h3 className="text-3xl font-bold mb-8 text-center text-gray-900">How It Works</h3>
            <div className="grid md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-lg mx-auto mb-3">
                  1
                </div>
                <p className="font-bold text-gray-900">Host Creates</p>
                <p className="text-sm text-gray-600">Room with unique ID</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white font-bold text-lg mx-auto mb-3">
                  2
                </div>
                <p className="font-bold text-gray-900">Guests Join</p>
                <p className="text-sm text-gray-600">Enter name & room ID</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500 text-white font-bold text-lg mx-auto mb-3">
                  3
                </div>
                <p className="font-bold text-gray-900">Host Starts</p>
                <p className="text-sm text-gray-600">Bidding round begins</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-500 text-white font-bold text-lg mx-auto mb-3">
                  4
                </div>
                <p className="font-bold text-gray-900">Winner Crowned</p>
                <p className="text-sm text-gray-600">Celebrate the victory!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-gray-600 border-t border-gray-200">
          <p>Made with ❤️ by Jdesign Studio</p>
        </div>
      </div>
    </div>
  );
}
