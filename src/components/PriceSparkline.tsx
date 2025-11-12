import { Line, LineChart, ResponsiveContainer } from "recharts";

interface PriceSparklineProps {
  priceChecks: Array<{ observed_price: number; created_at: string }>;
  paidTotal: number;
}

export const PriceSparkline = ({ priceChecks, paidTotal }: PriceSparklineProps) => {
  if (!priceChecks || priceChecks.length === 0) return null;

  const data = priceChecks.slice(-10).map((check) => ({
    price: check.observed_price,
  }));

  const hasSignificantDrop = priceChecks.some(
    (check) => check.observed_price < paidTotal * 0.95
  );

  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={hasSignificantDrop ? "hsl(var(--green-600))" : "hsl(var(--primary))"}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
