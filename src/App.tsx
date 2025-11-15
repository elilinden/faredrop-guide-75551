import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TripNew from "./pages/TripNew";
import TripEdit from "./pages/TripEdit";
import TripDetail from "./pages/TripDetail";
import Settings from "./pages/Settings";
import Lookup from "./pages/Lookup";
import NotFound from "./pages/NotFound";
import Faq from "./pages/Faq";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trips/new" element={<TripNew />} />
          <Route path="/trips/:id/edit" element={<TripEdit />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/faq" element={<Faq />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
