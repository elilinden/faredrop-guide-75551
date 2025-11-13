import { Line, LineChart, ResponsiveContainer } from "recharts";

interface PriceSparklineProps {
  priceChecks: Array<{ observed_price: number | null; created_at: string }>;
  paidTotal: number;
}

export const PriceSparkline = ({ priceChecks, paidTotal }: PriceSparklineProps) => {
  if (!priceChecks || priceChecks.length === 0) return null;

  const validPriceChecks = priceChecks.filter(
    (check): check is { observed_price: number; created_at: string } =>
      typeof check.observed_price === "number" &&
      Number.isFinite(check.observed_price)
  );

  if (validPriceChecks.length === 0) return null;

  const data = validPriceChecks.slice(-10).map((check) => ({
    price: check.observed_price,
  }));

  const hasSignificantDrop =
    paidTotal > 0 &&
    validPriceChecks.some((check) => check.observed_price < paidTotal * 0.95);

  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={
              hasSignificantDrop
                ? "hsl(var(--success))"
                : "hsl(var(--primary))"
            }
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
