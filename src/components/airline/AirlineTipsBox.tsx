import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AirlineBadge } from "@/components/AirlineBadge";
import { ChevronDown, ExternalLink } from "lucide-react";
import { airlineTips } from "@/lib/airline-tips";
import { type AirlineKey, isBasicEconomy } from "@/lib/airlines";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface AirlineTipsBoxProps {
  airline: AirlineKey;
  brand?: string | null;
}

export const AirlineTipsBox = ({ airline, brand }: AirlineTipsBoxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const tips = airlineTips[airline];

  if (!tips) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Tips not available for this airline yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleLinkClick = (linkType: 'manage' | 'help') => {
    trackEvent('tips_link_click', { airline, link_type: linkType });
  };

  const isBasicEcon = isBasicEconomy(brand);

  const content = (
    <>
      {isBasicEcon && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive">
            Likely ineligible
          </span>
        </div>
      )}

      <ul className="space-y-2 mb-4">
        {tips.bullets.map((bullet, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground mb-4 pb-4 border-b">
        {tips.footnote}
      </p>

      <p className="text-xs text-muted-foreground mb-4 pb-4 border-b">
        <strong>Name fields vary by airline:</strong> AA & Delta usually ask for first + last; United & Alaska typically ask for last only. Enter names exactly as on the ticket.
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <a
            href={tips.manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleLinkClick('manage')}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Manage trip
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-muted-foreground">|</span>
          <a
            href={tips.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleLinkClick('help')}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Official help
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className="text-xs text-muted-foreground">
          Last reviewed {new Date(tips.lastReviewed).toLocaleDateString()}
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: Always visible */}
      <Card className="hidden md:block" role="region" aria-label="Airline tips">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AirlineBadge airline={airline} />
            <CardTitle className="text-base">Airline tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>

      {/* Mobile: Collapsible, closed by default */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden">
        <Card role="region" aria-label="Airline tips">
          <CollapsibleTrigger asChild>
            <button
              className="w-full"
              aria-expanded={isOpen}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AirlineBadge airline={airline} />
                    <CardTitle className="text-base">Airline tips</CardTitle>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform",
                      isOpen && "transform rotate-180"
                    )}
                  />
                </div>
              </CardHeader>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">{content}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
};
