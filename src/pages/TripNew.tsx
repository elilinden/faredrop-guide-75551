import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plane, ChevronDown, Plus, Trash2, Info } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BRAND_OPTIONS } from "@/lib/airlines";

const segmentSchema = z.object({
  carrier: z.string().optional(),
  flight_number: z.string().regex(/^[0-9]{1,4}[A-Z]?$/, "Format: 123 or 1234A").optional().or(z.literal("")),
  depart_airport: z.string().regex(/^[A-Z]{3}$/, "3-letter code").optional().or(z.literal("")),
  arrive_airport: z.string().regex(/^[A-Z]{3}$/, "3-letter code").optional().or(z.literal("")),
  depart_datetime: z.string().optional().or(z.literal("")),
  arrive_datetime: z.string().optional().or(z.literal("")),
});

const baseTripFormSchema = z.object({
  airline: z.enum(["AA", "DL", "UA", "AS"], { required_error: "Select an airline" }),
  confirmation_code: z.string().regex(/^[A-Z0-9]{6}$/, "6 letters/numbers required"),
  last_name: z.string().min(1, "Last name required"),
  first_name: z.string().optional(),
  paid_total: z.coerce.number().min(0, "Must be 0 or greater"),
  brand: z.string().optional(),
  ticket_number: z.string().regex(/^[0-9]{13}$/, "13 digits").optional().or(z.literal("")),
  rbd: z.string().regex(/^[A-Z]$/, "Single letter").optional().or(z.literal("")),
  notes: z.string().optional(),
  segments: z.array(segmentSchema).optional(),
});

const tripFormSchema = baseTripFormSchema.refine(
  (v) => !(v.airline === "AA" || v.airline === "DL") || !!v.first_name,
  { path: ["first_name"], message: "First name required for this airline" }
);

type TripFormData = z.infer<typeof tripFormSchema>;

const TripNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [segments, setSegments] = useState<Array<z.infer<typeof segmentSchema>>>([]);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<TripFormData>({
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">FareDrop Guide</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Add Your Trip</h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          We only need what the airline requires to preview your credit.
        </p>

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

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Advanced (optional)</CardTitle>
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

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Flight Segments</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Segment
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {segments.map((seg, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Segment {idx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSegment(idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Carrier</Label>
                                <Input
                                  value={seg.carrier}
                                  onChange={(e) =>
                                    updateSegment(idx, "carrier", e.target.value.toUpperCase())
                                  }
                                  placeholder="AA"
                                  maxLength={2}
                                  className="uppercase"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Flight #</Label>
                                <Input
                                  value={seg.flight_number}
                                  onChange={(e) => updateSegment(idx, "flight_number", e.target.value)}
                                  placeholder="123"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">From</Label>
                                <Input
                                  value={seg.depart_airport}
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
                                  value={seg.arrive_airport}
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
                                  value={seg.depart_datetime}
                                  onChange={(e) => updateSegment(idx, "depart_datetime", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Arrive</Label>
                                <Input
                                  type="datetime-local"
                                  value={seg.arrive_datetime}
                                  onChange={(e) => updateSegment(idx, "arrive_datetime", e.target.value)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
      </main>
    </div>
  );
};

export default TripNew;
