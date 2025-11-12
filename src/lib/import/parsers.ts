export type ParsedTrip = {
  confirmation_code?: string;
  first_name?: string;
  last_name?: string;
  paid_total?: number;
  brand?: string;
  ticket_number?: string;
  segments?: {
    carrier?: 'AA' | 'DL' | 'UA' | 'AS';
    flight_number?: string;
    depart_airport?: string;
    arrive_airport?: string;
    depart_datetime?: string;
    arrive_datetime?: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
};

const normalizeText = (raw: string): string => {
  return raw.replace(/\s+/g, ' ').trim();
};

const extractPNR = (text: string): string | undefined => {
  // Match 6-character alphanumeric codes, avoiding ticket numbers
  const pnrMatches = text.match(/\b([A-Z0-9]{6})\b/g);
  if (!pnrMatches) return undefined;
  
  // Filter out patterns that look like parts of ticket numbers
  const validPNRs = pnrMatches.filter(code => {
    const context = text.substring(
      Math.max(0, text.indexOf(code) - 20),
      text.indexOf(code) + 26
    );
    return !/(TICKET|ETKT|TKT)\s*[:\-]?\s*\d/.test(context);
  });
  
  return validPNRs[0];
};

const extractNames = (text: string, airline: string): { first?: string; last?: string } => {
  const lines = text.split('\n');
  const names: { first?: string; last?: string } = {};
  
  for (const line of lines) {
    // Look for passenger/traveler labels
    if (/passenger|traveler|name/i.test(line)) {
      // Try to extract name from formats like "Passenger: John Smith" or "Name: SMITH/JOHN"
      const colonMatch = line.match(/:\s*([A-Z][a-z]+(?:[\s'-][A-Z][a-z]+)*)/);
      if (colonMatch) {
        const parts = colonMatch[1].split(/\s+/);
        if (parts.length >= 2) {
          names.first = parts[0];
          names.last = parts.slice(1).join(' ');
        } else {
          names.last = parts[0];
        }
        break;
      }
      
      // Try LAST/FIRST format
      const slashMatch = line.match(/([A-Z'-]+)\/([A-Z'-]+)/);
      if (slashMatch) {
        names.last = slashMatch[1];
        names.first = slashMatch[2];
        break;
      }
    }
    
    // Look for all-caps words that might be names
    const capsMatch = line.match(/\b([A-Z][A-Z'' -]{1,20})\b/g);
    if (capsMatch && capsMatch.length >= 1) {
      if (capsMatch.length >= 2) {
        names.first = capsMatch[0];
        names.last = capsMatch[1];
      } else {
        names.last = capsMatch[0];
      }
    }
  }
  
  return names;
};

const extractBrand = (text: string, airline: string): string | undefined => {
  const brandPatterns = [
    'Basic Economy',
    'Main Cabin',
    'Economy',
    'Premium Economy',
    'Business',
    'First Class',
    'Saver',
    'Main',
    'First',
  ];
  
  for (const brand of brandPatterns) {
    if (new RegExp(brand, 'i').test(text)) {
      return brand;
    }
  }
  
  return undefined;
};

const extractTicketNumber = (text: string, airline: string): string | undefined => {
  // Airline-specific prefixes: AA=001, DL=006, UA=016, AS=027
  const prefixes: Record<string, string> = {
    AA: '001',
    DL: '006',
    UA: '016',
    AS: '027',
  };
  
  const prefix = prefixes[airline];
  if (!prefix) return undefined;
  
  const pattern = new RegExp(`\\b${prefix}\\d{10}\\b`);
  const match = text.match(pattern);
  return match ? match[0] : undefined;
};

const extractFlightSegments = (
  text: string,
  airline: 'AA' | 'DL' | 'UA' | 'AS'
): ParsedTrip['segments'] => {
  const segments: ParsedTrip['segments'] = [];
  const lines = text.split('\n');
  
  // Airline-specific flight number patterns
  const flightPatterns: Record<string, RegExp> = {
    AA: /AA\s?(\d{1,4}[A-Z]?)\s+([A-Z]{3})[-–]([A-Z]{3})/i,
    DL: /DL\s?(\d{1,4}[A-Z]?)\s+([A-Z]{3})[-–]([A-Z]{3})/i,
    UA: /UA\s?(\d{1,4}[A-Z]?)\s+([A-Z]{3})[-–]([A-Z]{3})/i,
    AS: /AS\s?(\d{1,4}[A-Z]?)\s+([A-Z]{3})[-–]([A-Z]{3})/i,
  };
  
  const pattern = flightPatterns[airline];
  if (!pattern) return segments;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(pattern);
    
    if (match) {
      const flightNumber = match[1];
      const departAirport = match[2];
      const arriveAirport = match[3];
      
      // Try to extract date/time from nearby lines
      let departDatetime: string | undefined;
      let arriveDatetime: string | undefined;
      
      // Look for dates in format like "Mar 31, 2025 12:38 PM"
      const datePattern = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
      
      // Check current line and next few lines
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const dateMatch = lines[j].match(datePattern);
        if (dateMatch && !departDatetime) {
          // Parse into ISO format (best effort, timezone may be incorrect)
          const month = dateMatch[1];
          const day = dateMatch[2];
          const year = dateMatch[3];
          let hour = parseInt(dateMatch[4]);
          const minute = dateMatch[5];
          const ampm = dateMatch[6];
          
          if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
          if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
          
          const monthMap: Record<string, string> = {
            Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
            Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
          };
          
          const monthNum = monthMap[month];
          if (monthNum) {
            departDatetime = `${year}-${monthNum}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute}:00`;
          }
        } else if (dateMatch && departDatetime && !arriveDatetime) {
          // Second date is arrival
          const month = dateMatch[1];
          const day = dateMatch[2];
          const year = dateMatch[3];
          let hour = parseInt(dateMatch[4]);
          const minute = dateMatch[5];
          const ampm = dateMatch[6];
          
          if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
          if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
          
          const monthMap: Record<string, string> = {
            Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
            Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
          };
          
          const monthNum = monthMap[month];
          if (monthNum) {
            arriveDatetime = `${year}-${monthNum}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute}:00`;
          }
        }
      }
      
      segments.push({
        carrier: airline,
        flight_number: flightNumber,
        depart_airport: departAirport,
        arrive_airport: arriveAirport,
        depart_datetime: departDatetime,
        arrive_datetime: arriveDatetime,
      });
    }
  }
  
  return segments;
};

export const parseFromText = (
  airline: 'AA' | 'DL' | 'UA' | 'AS',
  raw: string
): ParsedTrip => {
  const normalized = normalizeText(raw);
  
  const confirmation_code = extractPNR(normalized);
  const names = extractNames(raw, airline);
  const brand = extractBrand(normalized, airline);
  const ticket_number = extractTicketNumber(normalized, airline);
  const segments = extractFlightSegments(raw, airline);
  
  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (confirmation_code && names.last && segments && segments.length > 0) {
    confidence = 'high';
  } else if (confirmation_code && names.last) {
    confidence = 'medium';
  }
  
  return {
    confirmation_code,
    first_name: names.first,
    last_name: names.last,
    brand,
    ticket_number,
    segments: segments && segments.length > 0 ? segments : undefined,
    confidence,
    notes: confidence === 'low' ? 'Some fields could not be extracted automatically' : undefined,
  };
};
