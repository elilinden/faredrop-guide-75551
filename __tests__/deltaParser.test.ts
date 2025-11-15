import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { parseDeltaMyTripsHTML } from "../src/lib/parsers/airlines/delta.ts";

const SAMPLE = `
<html><head>
<script src="https://smetrics.delta.com/b/ss/deltacom2/1/JS-2.22.3-LZC/s00000000000000?AQB=1&v4=LGA&v5=TQO&v10=03/31/2026&v11=03/31/2026&v91=GO7RLB&AQE=1"></script>
</head><body>DL342</body></html>
`;

Deno.test("delta parser extracts PNR, route, and dates", () => {
  const parsed = parseDeltaMyTripsHTML(SAMPLE);
  assertEquals(parsed.pnr, "GO7RLB");
  assertEquals(parsed.origin_iata, "LGA");
  assertEquals(parsed.destination_iata, "TQO");
  assertEquals(parsed.departure_date, "2026-03-31");
});
