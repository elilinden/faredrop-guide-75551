import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plane, TrendingDown, Bell, Shield } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FareDrop Guide</span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate("/faq")}>
              FAQs
            </Button>
            <Button variant="ghost" onClick={() => navigate("/sign-in")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/sign-in")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Track Flight Prices, Save Money
            </h1>
            <p className="text-xl text-muted-foreground">
              Monitor your booked flights and get alerts when prices drop for potential refunds or repricing
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/sign-in")}>
              Start Tracking Flights
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/lookup")}> 
              Try Lookup Tool
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("/faq")}> 
              Explore FAQs
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <TrendingDown className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Price Monitoring</h3>
              <p className="text-muted-foreground">
                Automatic price checks for your booked flights to identify savings opportunities
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Smart Alerts</h3>
              <p className="text-muted-foreground">
                Get notified when prices drop significantly and repricing becomes worthwhile
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your flight data is encrypted and only accessible to you
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
