import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import HostCreateRoom from "@/pages/HostCreateRoom";
import HostDashboard from "@/pages/HostDashboard";
import HostLiveView from "@/pages/HostLiveView";
import GuestJoinRoom from "@/pages/GuestJoinRoom";
import GuestBidding from "@/pages/GuestBidding";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/host/create"} component={HostCreateRoom} />
      <Route path={"/host/dashboard/:roomId"} component={HostDashboard} />
      <Route path={"/host/live/:roomId"} component={HostLiveView} />
      <Route path={"/guest/join"} component={GuestJoinRoom} />
      <Route path={"/guest/bidding/:roomId/:participantId"} component={GuestBidding} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
