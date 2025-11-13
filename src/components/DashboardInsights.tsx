import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Bell, Calendar, DollarSign } from "lucide-react";
import { TrendingDown, Bell, Calendar } from "lucide-react";

interface DashboardInsightsProps {
  tripsAddedThisWeek: number;
  activeMonitors: number;
  potentialSavings: number;
}

export const DashboardInsights = ({
  tripsAddedThisWeek,
  activeMonitors,
  potentialSavings,
  avgPriceChange,
}: DashboardInsightsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
}: DashboardInsightsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{tripsAddedThisWeek}</p>
              <p className="text-xs text-muted-foreground">trips added</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Monitors</p>
              <p className="text-2xl font-bold">{activeMonitors}</p>
              <p className="text-xs text-muted-foreground">watching prices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${potentialSavings.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Change (7d)</p>
              <p className="text-2xl font-bold">
                {avgPriceChange >= 0 ? "+" : ""}
                {avgPriceChange.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">vs. previous week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
