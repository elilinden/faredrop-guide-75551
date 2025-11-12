import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface PriceCheck {
  id: string;
  observed_price: number;
  diff_vs_paid: number;
  confidence: string;
  created_at: string;
}

interface PriceHistoryChartProps {
  priceChecks: PriceCheck[];
  paidTotal: number;
}

export const PriceHistoryChart = ({ priceChecks, paidTotal }: PriceHistoryChartProps) => {
  if (!priceChecks || priceChecks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We'll plot prices each time the monitor runs. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = priceChecks
    .slice(-60) // Last 60 checks
    .map((check) => ({
      date: new Date(check.created_at).getTime(),
      price: check.observed_price,
      confidence: check.confidence,
      formattedDate: format(new Date(check.created_at), "MMM d, h:mm a"),
    }));

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(paidTotal, ...chartData.map((d) => d.price));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price History</CardTitle>
          <Badge variant="outline" className="text-xs">
            {priceChecks.length} {priceChecks.length === 1 ? "check" : "checks"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => format(new Date(value), "MMM d")}
              className="text-xs"
            />
            <YAxis
              domain={[minPrice * 0.95, maxPrice * 1.05]}
              tickFormatter={(value) => `$${value}`}
              className="text-xs"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1">{data.formattedDate}</p>
                    <p className="font-semibold">${data.price.toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {data.confidence === "exact-flight" ? "Exact flight" : "Route estimate"}
                    </Badge>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
              activeDot={{ r: 5 }}
            />
            {/* Reference line for paid price */}
            <Line
              type="monotone"
              data={[
                { date: chartData[0]?.date, price: paidTotal },
                { date: chartData[chartData.length - 1]?.date, price: paidTotal },
              ]}
              dataKey="price"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary" />
            <span>Observed price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-muted-foreground border-dashed" style={{ borderTop: "1px dashed" }} />
            <span>You paid (${paidTotal.toFixed(2)})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
