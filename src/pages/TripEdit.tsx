import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
import { SiteFooter } from "@/components/SiteFooter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BRAND_OPTIONS } from "@/lib/airlines";
import { logAudit } from "@/lib/audit";
import { AirportInput } from "@/components/AirportInput";
import { AIRPORTS } from "@/data/airports";

const segmentSchema = z.object({
  carrier: z.string().optional(),
  flight_number: z.string().optional(),
  depart_airport: z.string().optional(),
  arrive_airport: z.string().optional(),
  depart_datetime: z.string().optional(),
  arrive_datetime: z.string().optional(),
});

const tripFormSchema = z.object({
  airline: z.enum(["AA", "DL", "UA", "AS", "WN", "B6"]),
  confirmation_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/),
  last_name: z.string().trim().regex(/^[\p{L} \-''.]{1,40}$/u).min(1),
  first_name: z.string().trim().regex(/^[\p{L} \-''.]{1,40}$/u).optional().or(z.literal("")),
  paid_total: z.coerce.number().min(0),
  brand: z.string().optional(),
  ticket_number: z.string().regex(/^[0-9]{13}$/).optional().or(z.literal("")),
  rbd: z.string().regex(/^[A-Z]$/).optional().or(z.literal("")),
  notes: z.string().optional(),
});

type TripFormData = z.infer<typeof tripFormSchema>;

const TripEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [segments, setSegments] = useState<Array<z.infer<typeof segmentSchema>>>([]);
  const [airportDisplayValues, setAirportDisplayValues] = useState<{ [key: string]: string }>({});

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

  // Load existing trip
  useEffect(() => {
    const loadTrip = async () => {
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

        const { data: segmentsData } = await supabase
          .from("segments")
          .select("*")
          .eq("trip_id", id)
          .order("depart_datetime", { ascending: true });

        setValue("airline", tripData.airline as any);
        setValue("confirmation_code", tripData.confirmation_code);
        setValue("last_name", tripData.last_name);
        setValue("first_name", tripData.first_name || "");
        setValue("paid_total", tripData.paid_total);
        setValue("brand", tripData.brand || "");
        setValue("ticket_number", tripData.ticket_number || "");
        setValue("rbd", tripData.rbd || "");
        setValue("notes", tripData.notes || "");

        if (segmentsData && segmentsData.length > 0) {
          const formattedSegments = segmentsData.map(seg => ({
            carrier: seg.carrier,
            flight_number: seg.flight_number,
            depart_airport: seg.depart_airport,
            arrive_airport: seg.arrive_airport,
            depart_datetime: seg.depart_datetime.slice(0, 16),
            arrive_datetime: seg.arrive_datetime.slice(0, 16),
          }));
          setSegments(formattedSegments);
          
          // Initialize display values for airports
          const displayValues: { [key: string]: string } = {};
          formattedSegments.forEach((seg, idx) => {
            if (seg.depart_airport) {
              const airport = AIRPORTS.find(a => a.iata === seg.depart_airport.toUpperCase());
              displayValues[`${idx}-from`] = airport 
                ? `${airport.iata} – ${airport.name}${airport.city ? ` (${airport.city})` : ""}`
                : seg.depart_airport;
            }
            if (seg.arrive_airport) {
              const airport = AIRPORTS.find(a => a.iata === seg.arrive_airport.toUpperCase());
              displayValues[`${idx}-to`] = airport 
                ? `${airport.iata} – ${airport.name}${airport.city ? ` (${airport.city})` : ""}`
                : seg.arrive_airport;
            }
          });
          setAirportDisplayValues(displayValues);
          
          setAdvancedOpen(true);
        }
      } catch (error) {
        console.error("Error loading trip:", error);
        toast({
          title: "Error",
          description: "Failed to load trip",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) loadTrip();
  }, [id, navigate, setValue, toast]);

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
        navigate("/auth");
        return;
      }

      let origin_iata = null;
      let destination_iata = null;
      let depart_date = null;
      let return_date = null;
      let flight_numbers: string[] = [];

      if (segments.length > 0) {
        const firstSeg = segments[0];
        const lastSeg = segments[segments.length - 1];
        
        origin_iata = firstSeg.depart_airport || null;
        destination_iata = lastSeg.arrive_airport || null;
        
        if (firstSeg.depart_datetime) {
          depart_date = firstSeg.depart_datetime.split('T')[0];
        }
        
        if (segments.length > 1 && lastSeg.depart_datetime) {
          return_date = lastSeg.depart_datetime.split('T')[0];
        }
        
        flight_numbers = segments
          .filter(seg => seg.flight_number)
          .map(seg => `${seg.carrier}${seg.flight_number}`);
      }

      const { error: tripError } = await supabase
        .from("trips")
        .update({
          airline: data.airline,
          confirmation_code: data.confirmation_code.toUpperCase(),
          last_name: data.last_name,
          first_name: data.first_name || null,
          paid_total: data.paid_total,
          brand: data.brand || null,
          ticket_number: data.ticket_number || null,
          rbd: data.rbd?.toUpperCase() || null,
          notes: data.notes || null,
          origin_iata,
          destination_iata,
          depart_date,
          return_date,
          flight_numbers,
          cabin: data.brand || 'ECONOMY',
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (tripError) throw tripError;

      await supabase.from("segments").delete().eq("trip_id", id);

      if (segments.length > 0) {
        const validSegments = segments.filter(
          (seg) =>
            seg.carrier &&
            seg.flight_number &&
            seg.depart_airport &&
            seg.arrive_airport &&
            seg.depart_datetime
        );

        if (validSegments.length > 0) {
          const { error: segmentsError } = await supabase.from("segments").insert(
            validSegments.map((seg) => ({
              trip_id: id!,
              carrier: seg.carrier!.toUpperCase(),
              flight_number: seg.flight_number!,
              depart_airport: seg.depart_airport!.toUpperCase(),
              arrive_airport: seg.arrive_airport!.toUpperCase(),
              depart_datetime: seg.depart_datetime!,
              arrive_datetime: seg.arrive_datetime || seg.depart_datetime!,
            }))
          );

          if (segmentsError) throw segmentsError;
        }
      }

      await logAudit("update", id!, {
        airline: data.airline,
        pnr: data.confirmation_code,
      });

      toast({
        title: "Trip updated!",
        description: "Your changes have been saved.",
      });

      navigate(`/trips/${id}`, { state: { refetch: true } });
    } catch (error) {
      console.error("Error updating trip:", error);
      toast({
        title: "Error",
        description: "Failed to update trip",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
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
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FareDrop Guide</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Edit Trip</h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          Update your trip information.
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
              </div>

              <div>
                <Label htmlFor="first_name">First Name (optional)</Label>
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
                    Helpful for {selectedAirline === "AA" ? "American" : "Delta"} (occasionally requested during repricing)
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

          {segments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flight Segments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {segments.map((seg, idx) => (
                    <Card key={idx} className="p-4 bg-muted/50">
                      <CardContent className="p-0 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Segment {idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeSegment(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Carrier</Label>
                            <Input
                              value={seg.carrier || ""}
                              onChange={(e) => updateSegment(idx, "carrier", e.target.value)}
                              placeholder="AA"
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
                            <AirportInput
                              label="From"
                              value={airportDisplayValues[`${idx}-from`] || seg.depart_airport || ""}
                              onChange={(value) => {
                                setAirportDisplayValues(prev => ({
                                  ...prev,
                                  [`${idx}-from`]: value
                                }));
                              }}
                              onSelectAirport={(airport) => {
                                updateSegment(idx, "depart_airport", airport.iata);
                                setAirportDisplayValues(prev => ({
                                  ...prev,
                                  [`${idx}-from`]: `${airport.iata} – ${airport.name}${airport.city ? ` (${airport.city})` : ""}`
                                }));
                              }}
                              placeholder="Type city or code..."
                            />
                          </div>
                          <div>
                            <AirportInput
                              label="To"
                              value={airportDisplayValues[`${idx}-to`] || seg.arrive_airport || ""}
                              onChange={(value) => {
                                setAirportDisplayValues(prev => ({
                                  ...prev,
                                  [`${idx}-to`]: value
                                }));
                              }}
                              onSelectAirport={(airport) => {
                                updateSegment(idx, "arrive_airport", airport.iata);
                                setAirportDisplayValues(prev => ({
                                  ...prev,
                                  [`${idx}-to`]: `${airport.iata} – ${airport.name}${airport.city ? ` (${airport.city})` : ""}`
                                }));
                              }}
                              placeholder="Type city or code..."
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

          {segments.length === 0 && (
            <Card className="p-4">
              <Button type="button" variant="outline" onClick={addSegment} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Flight Segments
              </Button>
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
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ticket_number">Ticket Number</Label>
                    <Controller
                      name="ticket_number"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} id="ticket_number" placeholder="0011234567890" maxLength={13} />
                      )}
                    />
                    {errors.ticket_number && (
                      <p className="text-sm text-destructive mt-1">{errors.ticket_number.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rbd">Booking Class (RBD)</Label>
                    <Controller
                      name="rbd"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} id="rbd" placeholder="Y" maxLength={1} className="uppercase" />
                      )}
                    />
                    {errors.rbd && (
                      <p className="text-sm text-destructive mt-1">{errors.rbd.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Textarea {...field} id="notes" placeholder="Optional notes" rows={3} />
                      )}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/trips/${id}`)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Update Trip"}
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
};

export default TripEdit;
