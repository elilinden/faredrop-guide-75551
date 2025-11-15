import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/TripCard";
import { DashboardInsights } from "@/components/DashboardInsights";
import { AddFlightModal } from "@/components/AddFlightModal";
import { Plane, Plus, Settings } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { type AirlineKey } from "@/lib/airlines";
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [segmentsMap, setSegmentsMap] = useState<Record<string, any[]>>({});
  const [addFlightOpen, setAddFlightOpen] = useState(false);
  const [insights, setInsights] = useState({
    tripsAddedThisWeek: 0,
    activeMonitors: 0,
    potentialSavings: 0
  });
  const fetchData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/sign-in");
      return;
    }

    // Fetch trips (excluding soft-deleted)
    const {
      data: tripsData,
      error: tripsError
    } = await supabase.from("trips").select("*").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", {
      ascending: false
    });
    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      setLoading(false);
      return;
    }
    setTrips(tripsData || []);

    // Fetch segments for all trips
    if (tripsData && tripsData.length > 0) {
      const tripIds = tripsData.map(t => t.id);
      const {
        data: segmentsData,
        error: segmentsError
      } = await supabase.from("segments").select("*").in("trip_id", tripIds);
      if (!segmentsError && segmentsData) {
        const map: Record<string, any[]> = {};
        segmentsData.forEach(seg => {
          if (!map[seg.trip_id]) map[seg.trip_id] = [];
          map[seg.trip_id].push(seg);
        });
        setSegmentsMap(map);
      }

      // Fetch insights data
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Trips added this week
      const tripsAddedThisWeek = tripsData.filter(t => new Date(t.created_at) >= oneWeekAgo).length;

      // Active monitors
      const activeMonitors = tripsData.filter(t => t.monitoring_enabled !== false).length;

      // Potential savings from price checks
      const {
        data: priceChecks
      } = await supabase.from("price_checks").select("diff_vs_paid").in("trip_id", tripIds).gte("created_at", thirtyDaysAgo.toISOString()).gt("diff_vs_paid", 0);
      const potentialSavings = priceChecks?.reduce((sum, check) => sum + (check.diff_vs_paid || 0), 0) || 0;
      setInsights({
        tripsAddedThisWeek,
        activeMonitors,
        potentialSavings
      });
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, [navigate]);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 items-center justify-center">Loading...</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FareDrop Guide</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="https://fareguardian.lovable.app/#/dashboard" target="_blank" rel="noreferrer">
                Dashboard
              </a>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button onClick={() => setAddFlightOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add My Flight
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        {trips.length > 0 && (
          <DashboardInsights
            tripsAddedThisWeek={insights.tripsAddedThisWeek}
            activeMonitors={insights.activeMonitors}
            potentialSavings={insights.potentialSavings}
          />
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Flights</h2>
          <Button variant="outline" asChild>
            <Link to="/trips/new">Add Trip</Link>
          </Button>
        </div>

        {trips.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>No trips yet. Add your first booked flight to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {["AA", "DL", "UA", "AS"].map(airline => {
              const airlineTrips = trips.filter(t => t.airline === airline);
              if (airlineTrips.length === 0) return null;
              return (
                <div key={airline}>
                  <h2 className="mb-3 text-lg font-semibold">
                    {airline === "AA" && "American Airlines"}
                    {airline === "DL" && "Delta Air Lines"}
                    {airline === "UA" && "United Airlines"}
                    {airline === "AS" && "Alaska Airlines"}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {airlineTrips.map(trip => (
                      <TripCard key={trip.id} trip={trip} segments={segmentsMap[trip.id] || []} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
      <AddFlightModal open={addFlightOpen} onOpenChange={setAddFlightOpen} onSuccess={fetchData} />
    </div>
  );
};
export default Dashboard;