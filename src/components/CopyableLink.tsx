import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface CopyableLinkProps {
  url: string;
  label?: string;
}

export const CopyableLink = ({ url, label = "Open Manage Trip" }: CopyableLinkProps) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      <div className="flex-1 truncate">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {label}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="shrink-0"
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
};
