import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/TripCard";
import { DashboardInsights } from "@/components/DashboardInsights";
import { AddFlightModal } from "@/components/AddFlightModal";
import { Plane, Plus, Settings } from "lucide-react";
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
    potentialSavings: 0,
  });

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch trips (excluding soft-deleted)
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      setLoading(false);
      return;
    }

    setTrips(tripsData || []);

    // Fetch segments for all trips
    if (tripsData && tripsData.length > 0) {
      const tripIds = tripsData.map((t) => t.id);
      const { data: segmentsData, error: segmentsError } = await supabase
        .from("segments")
        .select("*")
        .in("trip_id", tripIds);

      if (!segmentsError && segmentsData) {
        const map: Record<string, any[]> = {};
        segmentsData.forEach((seg) => {
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
      const tripsAddedThisWeek = tripsData.filter(
        t => new Date(t.created_at) >= oneWeekAgo
      ).length;

      // Active monitors
      const activeMonitors = tripsData.filter(
        t => t.monitoring_enabled !== false
      ).length;

      // Potential savings from price checks
      const { data: priceChecks } = await supabase
        .from("price_checks")
        .select("diff_vs_paid")
        .in("trip_id", tripIds)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .gt("diff_vs_paid", 0);

      const potentialSavings = priceChecks?.reduce((sum, check) => sum + (check.diff_vs_paid || 0), 0) || 0;

      setInsights({
        tripsAddedThisWeek,
        activeMonitors,
        potentialSavings,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FareDrop Guide</span>
          </div>
          <div className="flex gap-2">
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

      <main className="container mx-auto px-4 py-8">
        {trips.length > 0 && (
          <DashboardInsights
            tripsAddedThisWeek={insights.tripsAddedThisWeek}
            activeMonitors={insights.activeMonitors}
            potentialSavings={insights.potentialSavings}
          />
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Flights</h2>
          <Button variant="outline" asChild>
            <Link to="/trip/new">
              <Plus className="mr-2 h-4 w-4" />
              Manual Entry
            </Link>
          </Button>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No trips yet. Add your first booked flight to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {["AA", "DL", "UA", "AS"].map((airline) => {
              const airlineTrips = trips.filter((t) => t.airline === airline);
              if (airlineTrips.length === 0) return null;

              return (
                <div key={airline}>
                  <h2 className="text-lg font-semibold mb-3">
                    {airline === "AA" && "American Airlines"}
                    {airline === "DL" && "Delta Air Lines"}
                    {airline === "UA" && "United Airlines"}
                    {airline === "AS" && "Alaska Airlines"}
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {airlineTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        segments={segmentsMap[trip.id] || []}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AddFlightModal 
        open={addFlightOpen} 
        onOpenChange={setAddFlightOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Dashboard;
