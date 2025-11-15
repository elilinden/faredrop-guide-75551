import { useCallback } from "react";
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
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import About from "./pages/About";
import AuthLanding from "./pages/AuthLanding";
import AuthCallback from "./pages/AuthCallback";
import AuthDebug from "./pages/AuthDebug";
import ResetPassword from "./pages/ResetPassword";
import { useAuthListener } from "@/hooks/useAuthListener";

const queryClient = new QueryClient();

const App = () => {
  const handleAuthChange = useCallback(() => {
    queryClient.invalidateQueries();
  }, []);

  useAuthListener(handleAuthChange);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthLanding />} />
            <Route path="/sign-in" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trips/new" element={<TripNew />} />
            <Route path="/trips/:id/edit" element={<TripEdit />} />
            <Route path="/trips/:id" element={<TripDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/lookup" element={<Lookup />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
