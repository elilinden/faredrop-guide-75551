import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GuidedRepriceWizard } from "@/components/GuidedRepriceWizard";
import { AirlineBadge } from "@/components/AirlineBadge";
import { EligibilityPill } from "@/components/EligibilityPill";
import { AirlineTipsBox } from "@/components/airline/AirlineTipsBox";
import { DeleteTripDialog } from "@/components/DeleteTripDialog";
import { Plane, Calendar, DollarSign, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { type AirlineKey } from "@/lib/airlines";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitorThreshold, setMonitorThreshold] = useState(20);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        setMonitoringEnabled(tripData.monitoring_enabled ?? true);
        setMonitorThreshold(tripData.monitor_threshold ?? 20);
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

  const handleMonitoringToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("trips")
        .update({ monitoring_enabled: enabled })
        .eq("id", trip.id);

      if (error) throw error;

      setMonitoringEnabled(enabled);
      toast({
        title: enabled ? "Monitoring enabled" : "Monitoring disabled",
        description: enabled
          ? "We'll email you if prices might drop"
          : "Price monitoring paused for this trip",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update monitoring",
        description: error.message,
      });
    }
  };

  const handleThresholdChange = async (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setMonitorThreshold(numValue);

    try {
      const { error } = await supabase
        .from("trips")
        .update({ monitor_threshold: numValue })
        .eq("id", trip.id);

      if (error) throw error;

      toast({
        title: "Threshold updated",
        description: `We'll notify you if prices drop by $${numValue} or more`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update threshold",
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setIsDeleting(true);

    try {
      // Soft delete
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", trip.id);

      if (error) throw error;

      // Log audit
      await logAudit("delete", trip.id, {
        airline: trip.airline,
        pnr: trip.confirmation_code,
      });

      // Show undo toast
      const { dismiss } = toast({
        title: "Trip deleted",
        description: "You can undo this for 10 seconds",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleUndo();
              dismiss();
            }}
          >
            Undo
          </Button>
        ),
      });

      // Set timer to redirect after 10 seconds
      undoTimerRef.current = setTimeout(() => {
        navigate("/dashboard");
      }, 10000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: error.message,
      });
      setIsDeleting(false);
    }
  };

  const handleUndo = async () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    try {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: null })
        .eq("id", trip.id);

      if (error) throw error;

      // Log audit
      await logAudit("undo", trip.id, {
        airline: trip.airline,
        pnr: trip.confirmation_code,
      });

      setIsDeleting(false);
      toast({
        title: "Deletion cancelled",
        description: "Your trip has been restored",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to undo",
        description: error.message,
      });
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to trips
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                <CardTitle className="text-base">Price Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="monitoring" className="text-sm font-medium">
                      Email me if prices might drop
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      We check public fares every 6 hours
                    </p>
                  </div>
                  <Switch
                    id="monitoring"
                    checked={monitoringEnabled}
                    onCheckedChange={handleMonitoringToggle}
                  />
                </div>

                {monitoringEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="threshold" className="text-sm">
                      Alert threshold (USD)
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        id="threshold"
                        type="number"
                        min="0"
                        step="1"
                        value={monitorThreshold}
                        onChange={(e) => handleThresholdChange(e.target.value)}
                        className="max-w-[120px]"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum savings to trigger an alert
                    </p>
                  </div>
                )}
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
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1">Guided Reprice</h2>
                <p className="text-sm text-muted-foreground">
                  Follow the steps to preview potential credit
                </p>
              </div>
              <GuidedRepriceWizard trip={trip} />
            </div>

            <AirlineTipsBox airline={trip.airline as AirlineKey} brand={trip.brand} />
          </div>
        </div>

        <DeleteTripDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          airline={trip.airline}
          confirmationCode={trip.confirmation_code}
        />
      </main>
    </div>
  );
};

export default TripDetail;
