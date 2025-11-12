import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plane, ChevronDown, Plus, Trash2, Info, AlertCircle, ExternalLink } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BRAND_OPTIONS } from "@/lib/airlines";
import { MagicPasteImporter } from "@/components/MagicPasteImporter";
import type { ParsedTrip } from "@/lib/import/parsers";
import { logAudit } from "@/lib/audit";

const manageTripLinks = {
  AA: 'https://www.aa.com/reservation/view/find-your-reservation',
  DL: 'https://www.delta.com/my-trips/trip-details',
  UA: 'https://www.united.com/en/us/manageres/mytrips',
  AS: 'https://www.alaskaair.com/booking/reservation-lookup',
  WN: 'https://www.southwest.com/air/manage-reservation/index.html',
  B6: 'https://www.jetblue.com/manage-trips',
};

const segmentSchema = z.object({
  carrier: z.string().optional(),
  flight_number: z.string().optional(),
  depart_airport: z.string().optional(),
  arrive_airport: z.string().optional(),
  depart_datetime: z.string().optional(),
  arrive_datetime: z.string().optional(),
});

const baseTripFormSchema = z.object({
  airline: z.enum(["AA", "DL", "UA", "AS", "WN", "B6"], { required_error: "Select an airline" }),
  confirmation_code: z
    .string()
    .trim()
    .transform(s => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{6}$/, "6 letters/numbers required")),
  last_name: z
    .string()
    .trim()
    .regex(/^[\p{L} \-''.]{1,40}$/u, "Invalid name format")
    .min(1, "Last name required"),
  first_name: z
    .string()
    .trim()
    .regex(/^[\p{L} \-''.]{1,40}$/u, "Invalid name format")
    .optional()
    .or(z.literal("")),
  paid_total: z.coerce.number().min(0, "Must be 0 or greater"),
  segments: z.array(segmentSchema).optional(),
  brand: z.string().optional(),
  ticket_number: z.string().regex(/^[0-9]{13}$/, "13 digits").optional().or(z.literal("")),
  rbd: z.string().regex(/^[A-Z]$/, "Single letter").optional().or(z.literal("")),
  notes: z.string().optional(),
});

const tripFormSchema = baseTripFormSchema.refine(
  (v) => !(v.airline === "AA" || v.airline === "DL") || (!!v.first_name && v.first_name.length > 0),
  { path: ["first_name"], message: "First name required for this airline" }
);

type TripFormData = z.infer<typeof tripFormSchema>;

const TripNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [segments, setSegments] = useState<Array<z.infer<typeof segmentSchema>>>([]);
  const [duplicateTrip, setDuplicateTrip] = useState<{ id: string; airline: string; pnr: string } | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      airline: undefined,
      confirmation_code: "",
      last_name: "",
      first_name: "",
      paid_total: 0,
      brand: "",
      ticket_number: "",
      rbd: "",
      notes: "",
    },
  });

  const selectedAirline = watch("airline");
  const watchedPNR = watch("confirmation_code");
  const watchedLastName = watch("last_name");

  // Check for duplicates
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!selectedAirline || !watchedPNR || watchedPNR.length !== 6 || !watchedLastName) {
        setDuplicateTrip(null);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("trips")
        .select("id, airline, confirmation_code")
        .eq("user_id", user.id)
        .eq("airline", selectedAirline)
        .eq("confirmation_code", watchedPNR.toUpperCase())
        .eq("last_name", watchedLastName)
        .is("deleted_at", null)
        .limit(1)
        .single();

      if (data) {
        setDuplicateTrip({
          id: data.id,
          airline: data.airline,
          pnr: data.confirmation_code,
        });
      } else {
        setDuplicateTrip(null);
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [selectedAirline, watchedPNR, watchedLastName]);

  const addSegment = () => {
    setSegments([
      ...segments,
      {
        carrier: selectedAirline || "",
        flight_number: "",
        depart_airport: "",
        arrive_airport: "",
        depart_datetime: "",
        arrive_datetime: "",
      },
    ]);
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, field: keyof z.infer<typeof segmentSchema>, value: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
  };

  const handleImport = (parsed: ParsedTrip) => {
    // Fill form with parsed data
    if (parsed.confirmation_code) setValue("confirmation_code", parsed.confirmation_code);
    if (parsed.first_name) setValue("first_name", parsed.first_name);
    if (parsed.last_name) setValue("last_name", parsed.last_name);
    if (parsed.paid_total) setValue("paid_total", parsed.paid_total);
    if (parsed.brand) setValue("brand", parsed.brand);
    if (parsed.ticket_number) setValue("ticket_number", parsed.ticket_number);
    if (parsed.notes) setValue("notes", parsed.notes);

    // Fill segments
    if (parsed.segments && parsed.segments.length > 0) {
      setSegments(parsed.segments as any);
      setAdvancedOpen(true);
    }

    toast({
      title: "Data imported",
      description: `Imported with ${parsed.confidence} confidence. Review and save when ready.`,
    });
  };

  const onSubmit = async (data: TripFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Insert trip
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          airline: data.airline,
          confirmation_code: data.confirmation_code.toUpperCase(),
          last_name: data.last_name,
          first_name: data.first_name || null,
          paid_total: data.paid_total,
          brand: data.brand || null,
          ticket_number: data.ticket_number || null,
          rbd: data.rbd?.toUpperCase() || null,
          notes: data.notes || null,
          depart_date: null,
          return_date: null,
          currency: "USD",
          status: "active",
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Insert segments if any
      if (segments.length > 0) {
        const validSegments = segments.filter(
          (seg) =>
            seg.carrier &&
            seg.flight_number &&
            seg.depart_airport &&
            seg.arrive_airport &&
            seg.depart_datetime &&
            seg.arrive_datetime
        );

        if (validSegments.length > 0) {
          const { error: segmentsError } = await supabase.from("segments").insert(
            validSegments.map((seg) => ({
              trip_id: tripData.id,
              carrier: seg.carrier!.toUpperCase(),
              flight_number: seg.flight_number!,
              depart_airport: seg.depart_airport!.toUpperCase(),
              arrive_airport: seg.arrive_airport!.toUpperCase(),
              depart_datetime: seg.depart_datetime!,
              arrive_datetime: seg.arrive_datetime!,
            }))
          );

          if (segmentsError) throw segmentsError;
        }
      }

      // Log audit
      await logAudit("create", tripData.id, {
        airline: tripData.airline,
        pnr: tripData.confirmation_code,
      });

      toast({
        title: "Trip saved!",
        description: "Open Guided Reprice to preview credit.",
      });

      navigate(`/trips/${tripData.id}`);
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({
        title: "Error",
        description: "Failed to save trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FareDrop Guide</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Add Your Trip</h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          We only need what the airline requires to preview your credit.
        </p>

        <Tabs defaultValue="form" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Manual Entry</TabsTrigger>
            <TabsTrigger value="import">Import from Confirmation</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Required Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="airline">Airline</Label>
                <Controller
                  name="airline"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select airline" />
                      </SelectTrigger>
              <SelectContent>
                <SelectItem value="AA">American Airlines</SelectItem>
                <SelectItem value="DL">Delta Air Lines</SelectItem>
                <SelectItem value="UA">United Airlines</SelectItem>
                <SelectItem value="AS">Alaska Airlines</SelectItem>
                <SelectItem value="WN">Southwest Airlines</SelectItem>
                <SelectItem value="B6">JetBlue Airways</SelectItem>
              </SelectContent>
                    </Select>
                  )}
                />
                {errors.airline && (
                  <p className="text-sm text-destructive mt-1">{errors.airline.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmation_code">Confirmation Code</Label>
                <Controller
                  name="confirmation_code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="confirmation_code"
                      placeholder="ABC123"
                      maxLength={6}
                      className="uppercase"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
                {errors.confirmation_code && (
                  <p className="text-sm text-destructive mt-1">{errors.confirmation_code.message}</p>
                )}
                {duplicateTrip && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Looks like you already added this trip.
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-yellow-700 dark:text-yellow-300"
                        onClick={() => navigate(`/trips/${duplicateTrip.id}`)}
                      >
                        Go to trip →
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="first_name">
                  First Name
                  {(selectedAirline === "AA" || selectedAirline === "DL") && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => <Input {...field} id="first_name" placeholder="John" />}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
                )}
                {(selectedAirline === "AA" || selectedAirline === "DL") && !watch("first_name") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Required for {selectedAirline === "AA" ? "American" : "Delta"}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => <Input {...field} id="last_name" placeholder="Smith" />}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="paid_total">Paid Total (USD)</Label>
                <Controller
                  name="paid_total"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="paid_total"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="299.00"
                    />
                  )}
                />
                {errors.paid_total && (
                  <p className="text-sm text-destructive mt-1">{errors.paid_total.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fallback UI when no segments */}
          {segments.length === 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    We can't fetch your itinerary automatically from PNR. To enable price monitoring:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tabsTrigger = document.querySelector('[value="import"]') as HTMLElement;
                        tabsTrigger?.click();
                      }}
                      className="h-8"
                    >
                      Paste Confirmation Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSegment()}
                      className="h-8"
                    >
                      Enter Flight Details Manually
                    </Button>
                    {selectedAirline && manageTripLinks[selectedAirline as keyof typeof manageTripLinks] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8"
                      >
                        <a
                          href={manageTripLinks[selectedAirline as keyof typeof manageTripLinks]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          Open {selectedAirline} Manage Trip
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Flight Segments Section - Conditional */}
          {segments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flight Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Used for automatic price monitoring and alerts
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {segments.map((seg, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Segment {idx + 1}</span>
                        {segments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSegment(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                          <Label className="text-xs">Carrier</Label>
                          <Input
                            value={seg.carrier || ""}
                            onChange={(e) =>
                              updateSegment(idx, "carrier", e.target.value.toUpperCase())
                            }
                            placeholder="DL"
                            maxLength={2}
                            className="uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Flight #</Label>
                          <Input
                            value={seg.flight_number || ""}
                            onChange={(e) => updateSegment(idx, "flight_number", e.target.value)}
                            placeholder="1234"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">From</Label>
                          <Input
                            value={seg.depart_airport || ""}
                            onChange={(e) =>
                              updateSegment(idx, "depart_airport", e.target.value.toUpperCase())
                            }
                            placeholder="JFK"
                            maxLength={3}
                            className="uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">To</Label>
                          <Input
                            value={seg.arrive_airport || ""}
                            onChange={(e) =>
                              updateSegment(idx, "arrive_airport", e.target.value.toUpperCase())
                            }
                            placeholder="LAX"
                            maxLength={3}
                            className="uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Depart</Label>
                          <Input
                            type="datetime-local"
                            value={seg.depart_datetime || ""}
                            onChange={(e) => updateSegment(idx, "depart_datetime", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Arrive</Label>
                          <Input
                            type="datetime-local"
                            value={seg.arrive_datetime || ""}
                            onChange={(e) => updateSegment(idx, "arrive_datetime", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another Segment
                </Button>
              </CardContent>
            </Card>
          )}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Additional Details (optional)</CardTitle>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <Label htmlFor="brand">Fare Brand</Label>
                    <Controller
                      name="brand"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fare type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRAND_OPTIONS.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ticket_number">Ticket Number (13 digits)</Label>
                    <Controller
                      name="ticket_number"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} id="ticket_number" placeholder="0012345678901" maxLength={13} />
                      )}
                    />
                    {errors.ticket_number && (
                      <p className="text-sm text-destructive mt-1">{errors.ticket_number.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rbd">Booking Class / RBD</Label>
                    <Controller
                      name="rbd"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="rbd"
                          placeholder="Y"
                          maxLength={1}
                          className="uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      )}
                    />
                    {errors.rbd && <p className="text-sm text-destructive mt-1">{errors.rbd.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Textarea {...field} id="notes" placeholder="Any additional notes..." rows={3} />
                      )}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Trip"}
            </Button>
          </div>
            </form>
          </TabsContent>

          <TabsContent value="import">
            <MagicPasteImporter onImport={handleImport} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TripNew;
