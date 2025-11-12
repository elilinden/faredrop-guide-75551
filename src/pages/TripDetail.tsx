import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidedRepriceWizard } from "@/components/GuidedRepriceWizard";
import { AirlineBadge } from "@/components/AirlineBadge";
import { EligibilityPill } from "@/components/EligibilityPill";
import { Plane, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { type AirlineKey } from "@/lib/airlines";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (tripError) throw tripError;

        const { data: segmentsData, error: segmentsError } = await supabase
          .from("segments")
          .select("*")
          .eq("trip_id", id)
          .order("depart_datetime", { ascending: true });

        if (segmentsError) throw segmentsError;

        setTrip(tripData);
        setSegments(segmentsData || []);
      } catch (error) {
        console.error("Error fetching trip:", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTrip();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!trip) return null;

  const route = segments.length > 0
    ? `${segments[0].depart_airport} → ${segments[segments.length - 1].arrive_airport}`
    : "Route details";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">FareDrop Guide</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to trips
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Trip Summary */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <AirlineBadge airline={trip.airline as AirlineKey} className="mb-2" />
                  <h2 className="text-xl font-bold">{route}</h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {trip.confirmation_code}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {format(new Date(trip.depart_date), "MMM d, yyyy")}
                      {trip.return_date && ` - ${format(new Date(trip.return_date), "MMM d, yyyy")}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Paid: ${trip.paid_total.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Fare:</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.brand || "Not specified"}
                  </p>
                </div>

                <EligibilityPill brand={trip.brand} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {segments.map((seg, i) => (
                    <div key={seg.id} className="text-sm">
                      <div className="font-medium">
                        {seg.carrier} {seg.flight_number}
                      </div>
                      <div className="text-muted-foreground">
                        {seg.depart_airport} → {seg.arrive_airport}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(seg.depart_datetime), "MMM d, h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Guided Reprice */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-1">Guided Reprice</h2>
              <p className="text-sm text-muted-foreground">
                Follow the steps to preview potential credit
              </p>
            </div>
            <GuidedRepriceWizard trip={trip} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TripDetail;
