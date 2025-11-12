import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plane, Plus, Trash2 } from "lucide-react";
import { BRAND_OPTIONS, type AirlineKey } from "@/lib/airlines";

interface Segment {
  carrier: AirlineKey;
  flight_number: string;
  depart_airport: string;
  arrive_airport: string;
  depart_datetime: string;
  arrive_datetime: string;
}

const TripNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [airline, setAirline] = useState<AirlineKey>("AA");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [lastName, setLastName] = useState("");
  const [brand, setBrand] = useState<string>("");
  const [paidTotal, setPaidTotal] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [rbd, setRbd] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [segments, setSegments] = useState<Segment[]>([
    {
      carrier: "AA",
      flight_number: "",
      depart_airport: "",
      arrive_airport: "",
      depart_datetime: "",
      arrive_datetime: "",
    },
  ]);

  const addSegment = () => {
    setSegments([
      ...segments,
      {
        carrier: airline,
        flight_number: "",
        depart_airport: "",
        arrive_airport: "",
        depart_datetime: "",
        arrive_datetime: "",
      },
    ]);
  };

  const removeSegment = (index: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter((_, i) => i !== index));
    }
  };

  const updateSegment = (index: number, field: keyof Segment, value: string) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setSegments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate confirmation code
      if (confirmationCode.length !== 6) {
        throw new Error("Confirmation code must be 6 characters");
      }

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          airline,
          confirmation_code: confirmationCode.toUpperCase(),
          last_name: lastName,
          brand: brand || null,
          rbd: rbd || null,
          paid_total: parseFloat(paidTotal),
          ticket_number: ticketNumber || null,
          depart_date: departDate,
          return_date: returnDate || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create segments
      const segmentInserts = segments.map((seg) => ({
        trip_id: trip.id,
        carrier: seg.carrier,
        flight_number: seg.flight_number,
        depart_airport: seg.depart_airport.toUpperCase(),
        arrive_airport: seg.arrive_airport.toUpperCase(),
        depart_datetime: seg.depart_datetime,
        arrive_datetime: seg.arrive_datetime,
      }));

      const { error: segmentsError } = await supabase
        .from("segments")
        .insert(segmentInserts);

      if (segmentsError) throw segmentsError;

      toast({
        title: "Trip saved!",
        description: "Open Guided Reprice to preview credit",
      });

      navigate(`/trips/${trip.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save trip",
        description: error.message,
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Add Trip</h1>
          <p className="text-muted-foreground">Enter your existing booking details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="airline">Airline *</Label>
                  <Select value={airline} onValueChange={(v) => setAirline(v as AirlineKey)}>
                    <SelectTrigger id="airline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AA">American (AA)</SelectItem>
                      <SelectItem value="DL">Delta (DL)</SelectItem>
                      <SelectItem value="UA">United (UA)</SelectItem>
                      <SelectItem value="AS">Alaska (AS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">Confirmation Code (6 chars) *</Label>
                  <Input
                    id="confirmation"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    pattern="[A-Z0-9]{6}"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidTotal">Paid Total (USD) *</Label>
                  <Input
                    id="paidTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidTotal}
                    onChange={(e) => setPaidTotal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Fare Brand</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger id="brand">
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
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketNumber">Ticket Number</Label>
                  <Input
                    id="ticketNumber"
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    placeholder="13 digits"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rbd">Booking Class</Label>
                  <Input
                    id="rbd"
                    value={rbd}
                    onChange={(e) => setRbd(e.target.value)}
                    maxLength={2}
                    placeholder="Y, J, F..."
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departDate">Departure Date *</Label>
                  <Input
                    id="departDate"
                    type="date"
                    value={departDate}
                    onChange={(e) => setDepartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnDate">Return Date (if roundtrip)</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this booking"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Flight Segments</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {segments.map((seg, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                  {segments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSegment(i)}
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Carrier</Label>
                      <Select
                        value={seg.carrier}
                        onValueChange={(v) => updateSegment(i, "carrier", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AA">AA</SelectItem>
                          <SelectItem value="DL">DL</SelectItem>
                          <SelectItem value="UA">UA</SelectItem>
                          <SelectItem value="AS">AS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Flight #</Label>
                      <Input
                        value={seg.flight_number}
                        onChange={(e) => updateSegment(i, "flight_number", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>From (airport code)</Label>
                      <Input
                        value={seg.depart_airport}
                        onChange={(e) =>
                          updateSegment(i, "depart_airport", e.target.value.toUpperCase())
                        }
                        maxLength={3}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>To (airport code)</Label>
                      <Input
                        value={seg.arrive_airport}
                        onChange={(e) =>
                          updateSegment(i, "arrive_airport", e.target.value.toUpperCase())
                        }
                        maxLength={3}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Depart Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={seg.depart_datetime}
                        onChange={(e) => updateSegment(i, "depart_datetime", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Arrive Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={seg.arrive_datetime}
                        onChange={(e) => updateSegment(i, "arrive_datetime", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Trip"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default TripNew;
