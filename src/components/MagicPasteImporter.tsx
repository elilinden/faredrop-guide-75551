import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseFromText, ParsedTrip } from "@/lib/import/parsers";
import { Info, Sparkles } from "lucide-react";

interface MagicPasteImporterProps {
  onImport: (data: ParsedTrip) => void;
}

export const MagicPasteImporter = ({ onImport }: MagicPasteImporterProps) => {
  const [airline, setAirline] = useState<'AA' | 'DL' | 'UA' | 'AS' | 'WN' | 'B6' | ''>('');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedTrip | null>(null);

  const handleParse = () => {
    if (!airline || !rawText.trim()) return;
    
    const result = parseFromText(airline as 'AA' | 'DL' | 'UA' | 'AS' | 'WN' | 'B6', rawText);
    setParsed(result);
  };

  const handleApply = () => {
    if (parsed) {
      onImport(parsed);
      // Reset
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
        <Label htmlFor="import-airline">Airline</Label>
        <Select value={airline} onValueChange={(v) => setAirline(v as any)}>
          <SelectTrigger id="import-airline">
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
        disabled={!airline || !rawText.trim()}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Parse Text
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
              {parsed.brand && (
                <div>
                  <span className="text-muted-foreground">Fare Brand:</span>
                  <p className="font-medium">{parsed.brand}</p>
                </div>
              )}
              {parsed.ticket_number && (
                <div>
                  <span className="text-muted-foreground">Ticket #:</span>
                  <p className="font-mono text-xs">{parsed.ticket_number}</p>
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
