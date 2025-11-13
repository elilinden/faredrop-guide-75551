import { useState, useMemo, useRef, useEffect } from "react";
import { AIRPORTS, type Airport } from "@/data/airports";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AirportInputProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onSelectAirport?: (airport: Airport) => void;
  placeholder?: string;
}

export const AirportInput = ({
  label,
  value,
  onChange,
  onSelectAirport,
  placeholder = "Type city, airport, or code...",
}: AirportInputProps) => {
  const [internalValue, setInternalValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayValue = value ?? internalValue;

  const filteredAirports = useMemo(() => {
    const searchTerm = displayValue.toLowerCase().trim();
    if (!searchTerm || searchTerm.length < 2) return [];

    return AIRPORTS
      .filter(airport => {
        const iataMatch = airport.iata.toLowerCase().includes(searchTerm);
        const nameMatch = airport.name?.toLowerCase().includes(searchTerm);
        const cityMatch = airport.city?.toLowerCase().includes(searchTerm);
        return iataMatch || nameMatch || cityMatch;
      })
      .slice(0, 10);
  }, [displayValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
    setShowDropdown(true);
  };

  const handleSelectAirport = (airport: Airport) => {
    const formattedText = `${airport.iata} – ${airport.name}${airport.city ? ` (${airport.city})` : ""}`;
    if (onChange) {
      onChange(formattedText);
    } else {
      setInternalValue(formattedText);
    }
    if (onSelectAirport) {
      onSelectAirport(airport);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && filteredAirports.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg"
        >
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {filteredAirports.map((airport) => (
                <button
                  key={airport.iata}
                  type="button"
                  onClick={() => handleSelectAirport(airport)}
                  className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm transition-colors"
                >
                  <div className="font-medium text-sm">
                    {airport.iata} – {airport.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {airport.city}
                    {airport.city && airport.country && ", "}
                    {airport.country}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
