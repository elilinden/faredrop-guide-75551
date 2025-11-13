import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles } from "lucide-react";

interface MagicPasteImporterProps {
  onImport: (data: ParsedTrip) => void;
}

type ParsedTrip = {
  confirmation_code?: string;
  airline?: string;
  first_name?: string;
  last_name?: string;
  paid_total?: number;
  currency?: string;
  segments?: Array<{
    carrier?: string;
    flight_number?: string;
    depart_airport?: string;
    arrive_airport?: string;
    depart_datetime?: string | null;
    arrive_datetime?: string | null;
  }>;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
};

export const MagicPasteImporter = ({ onImport }: MagicPasteImporterProps) => {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-magic-paste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await response.json();
      
      if (data.ok && data.trip) {
        const mappedTrip: ParsedTrip = {
          confirmation_code: data.trip.pnr,
          airline: data.trip.airline_code,
          first_name: data.trip.passenger_names?.[0]?.split(' ')[0],
          last_name: data.trip.passenger_names?.[0]?.split(' ').slice(1).join(' '),
          paid_total: data.trip.ticket_amount,
          currency: data.trip.currency,
          segments: data.trip.flight_numbers?.map((fn: string, idx: number) => ({
            carrier: data.trip.airline_code || '',
            flight_number: fn,
            depart_airport: idx === 0 ? data.trip.origin_iata : data.trip.destination_iata,
            arrive_airport: idx === 0 ? data.trip.destination_iata : data.trip.origin_iata,
            depart_datetime: data.trip.departure_date,
            arrive_datetime: null,
          })) || [],
          confidence: data.message ? 'low' : 'high',
          notes: data.message || 'Successfully extracted flight details',
        };
        
        setParsed(mappedTrip);
      } else {
        setParsed({
          confidence: 'low',
          notes: data.message || 'Could not extract flight details from the provided text.',
        });
      }
    } catch (error) {
      console.error('Parse error:', error);
      setParsed({
        confidence: 'low',
        notes: 'Error parsing confirmation email. Please try again or enter details manually.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (parsed) {
      onImport(parsed);
      setRawText('');
      setParsed(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Paste the text from your airline confirmation email or booking page. We'll extract flight details automatically.
          No scraping or logins—just copy and paste.
        </p>
      </div>


      <div>
        <Label htmlFor="import-text">Confirmation Text</Label>
        <Textarea
          id="import-text"
          placeholder="Paste your confirmation email or booking details here..."
          rows={8}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <Button
        onClick={handleParse}
        disabled={!rawText.trim() || isLoading}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isLoading ? 'Parsing...' : 'Parse Text'}
      </Button>

      {parsed && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Extracted Data</CardTitle>
              <Badge variant={
                parsed.confidence === 'high' ? 'default' :
                parsed.confidence === 'medium' ? 'secondary' : 'outline'
              }>
                {parsed.confidence} confidence
              </Badge>
            </div>
            <CardDescription>
              Review the extracted data below. You can edit after applying.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {parsed.confirmation_code && (
                <div>
                  <span className="text-muted-foreground">PNR:</span>
                  <p className="font-medium">{parsed.confirmation_code}</p>
                </div>
              )}
              {parsed.airline && (
                <div>
                  <span className="text-muted-foreground">Airline:</span>
                  <p className="font-medium">{parsed.airline}</p>
                </div>
              )}
              {parsed.last_name && (
                <div>
                  <span className="text-muted-foreground">Last Name:</span>
                  <p className="font-medium">{parsed.last_name}</p>
                </div>
              )}
              {parsed.first_name && (
                <div>
                  <span className="text-muted-foreground">First Name:</span>
                  <p className="font-medium">{parsed.first_name}</p>
                </div>
              )}
              {parsed.paid_total && (
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-medium">${parsed.paid_total} {parsed.currency}</p>
                </div>
              )}
            </div>

            {parsed.segments && parsed.segments.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Segments:</span>
                <div className="mt-2 space-y-2">
                  {parsed.segments.map((seg, idx) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium">
                        {seg.carrier} {seg.flight_number}: {seg.depart_airport} → {seg.arrive_airport}
                      </p>
                      {seg.depart_datetime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Departs: {new Date(seg.depart_datetime).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.notes && (
              <p className="text-xs text-muted-foreground italic">{parsed.notes}</p>
            )}

            <Button onClick={handleApply} className="w-full" variant="default">
              Apply to Form
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
