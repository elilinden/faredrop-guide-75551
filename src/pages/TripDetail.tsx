import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plane,
  Calendar,
  DollarSign,
  ArrowLeft,
  MoreVertical,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { type AirlineKey } from "@/lib/airlines";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [priceChecks, setPriceChecks] = useState<any[]>([]);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitorThreshold, setMonitorThreshold] = useState(20);
  const [monitorFrequency, setMonitorFrequency] = useState<number | null>(null);
  const [priceMode, setPriceMode] = useState<"exact" | "similar">("similar");
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
        setMonitorFrequency(tripData.monitor_frequency_minutes);
        setPriceMode((tripData.price_mode === "exact" ? "exact" : "similar") as "exact" | "similar");

        // Fetch price checks
        const { data: checksData, error: checksError } = await supabase
          .from("price_checks")
          .select("*")
          .eq("trip_id", id)
          .order("created_at", { ascending: true });

        if (!checksError && checksData) {
          setPriceChecks(checksData);
        }
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

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh || !id) return;

    const interval = setInterval(async () => {
      try {
        const { data: tripData } = await supabase.from("trips").select("*").eq("id", id).single();

        if (tripData) {
          setTrip(tripData);
        }
      } catch (error) {
        console.error("Auto-refresh error:", error);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!trip) return null;

  const route =
    segments.length > 0
      ? `${segments[0].depart_airport} → ${segments[segments.length - 1].arrive_airport}`
      : "Route details";

  const handleMonitoringToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase.from("trips").update({ monitoring_enabled: enabled }).eq("id", trip.id);

      if (error) throw error;

      setMonitoringEnabled(enabled);
      toast({
        title: enabled ? "Monitoring enabled" : "Monitoring disabled",
        description: enabled ? "We'll email you if prices might drop" : "Price monitoring paused for this trip",
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
      const { error } = await supabase.from("trips").update({ monitor_threshold: numValue }).eq("id", trip.id);

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
      const { error } = await supabase.from("trips").update({ deleted_at: new Date().toISOString() }).eq("id", trip.id);

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
      const { error } = await supabase.from("trips").update({ deleted_at: null }).eq("id", trip.id);

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

  const handlePriceModeToggle = async (mode: "exact" | "similar") => {
    try {
      const { error } = await supabase.from("trips").update({ price_mode: mode }).eq("id", trip.id);

      if (error) throw error;

      setPriceMode(mode);
      toast({
        title: "Price mode updated",
        description:
          mode === "exact" ? "Now checking for exact flights only" : "Now checking similar flights on same route",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update price mode",
        description: error.message,
      });
    }
  };

  const handleCheckNow = async () => {
    setIsCheckingNow(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-now", {
        body: { tripId: trip.id },
      });

      if (error) {
        // Check if it's a rate limit error
        if (error.message?.includes("Rate limit") || error.message?.includes("429")) {
          // Try to extract retry time from the error
          const retryMatch = error.message.match(/(\d+)\s*minute/i);
          const retryMinutes = retryMatch ? parseInt(retryMatch[1]) : 10;
          throw new Error(
            `Price checks are limited to once every 10 minutes. Please try again in ${retryMinutes} ${retryMinutes === 1 ? "minute" : "minutes"}.`,
          );
        }
        throw error;
      }

      // Store booking URL if returned
      if (data.booking_url) {
        setBookingUrl(data.booking_url);
      }

      // Refresh trip data
      const { data: tripData } = await supabase.from("trips").select("*").eq("id", trip.id).single();

      if (tripData) {
        setTrip(tripData);
      }

      toast({
        title: "Price check complete",
        description: data.last_public_price
          ? `Current price: $${data.last_public_price}`
          : "No pricing data available yet",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to check price",
        description: error.message,
      });
    } finally {
      setIsCheckingNow(false);
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
              <DropdownMenuItem onClick={() => navigate(`/trips/${id}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit trip
              </DropdownMenuItem>
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
                  <p className="text-sm text-muted-foreground font-mono">{trip.confirmation_code}</p>
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
                  <p className="text-sm text-muted-foreground">{trip.brand || "Not specified"}</p>
                </div>

                <EligibilityPill brand={trip.brand} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Price Watch Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last checked:</span>
                    <span className="font-medium">
                      {trip.last_checked_at
                        ? formatDistanceToNow(new Date(trip.last_checked_at), { addSuffix: true })
                        : "Never"}
                    </span>
                  </div>

                  {trip.last_public_price && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last observed:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${trip.last_public_price.toFixed(2)}</span>
                          {trip.last_confidence && (
                            <Badge variant="outline" className="text-xs">
                              {trip.last_confidence === "exact-flight" ? "Exact" : "Estimate"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {trip.last_public_price < trip.paid_total && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-800 dark:text-green-200 font-medium">Potential drop:</span>
                            <span className="text-green-600 dark:text-green-400 font-bold">
                              ${(trip.paid_total - trip.last_public_price).toFixed(2)}
                            </span>
                          </div>
                          {bookingUrl && (
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full"
                              onClick={() => window.open(bookingUrl, "_blank")}
                            >
                              Book cheaper flight →
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {segments.length === 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Flight details required
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Add flight segments to enable price monitoring
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button
                              onClick={handleCheckNow}
                              disabled={isCheckingNow || segments.length === 0}
                              size="sm"
                              variant="outline"
                              className="w-full"
                            >
                              {isCheckingNow ? (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                  Checking...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-2" />
                                  Check now
                                </>
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {segments.length === 0 && (
                          <TooltipContent>
                            <p>Add flight segments to enable price checking</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                        Auto-refresh (10s)
                      </Label>
                    </div>
                    <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>
                </div>
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
                      Email alerts every 3h
                    </Label>
                    <p className="text-xs text-muted-foreground">We check public fares automatically</p>
                  </div>
                  <Switch id="monitoring" checked={monitoringEnabled} onCheckedChange={handleMonitoringToggle} />
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
                    <p className="text-xs text-muted-foreground">Minimum savings to trigger an email</p>
                  </div>
                )}

                {monitoringEnabled && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium">Price check mode</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={priceMode === "similar" ? "default" : "outline"}
                        onClick={() => handlePriceModeToggle("similar")}
                        className="flex-1 text-xs"
                      >
                        Similar flights
                      </Button>
                      <Button
                        size="sm"
                        variant={priceMode === "exact" ? "default" : "outline"}
                        onClick={() => handlePriceModeToggle("exact")}
                        className="flex-1 text-xs"
                      >
                        Exact only
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {priceMode === "exact"
                        ? "Only check your exact flight numbers"
                        : "Check any flights on same route & dates"}
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
                <p className="text-sm text-muted-foreground">Follow the steps to preview potential credit</p>
              </div>
              <GuidedRepriceWizard trip={trip} />
            </div>

            <AirlineTipsBox airline={trip.airline as AirlineKey} brand={trip.brand} />

            <PriceHistoryChart priceChecks={priceChecks} paidTotal={trip.paid_total} />
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
