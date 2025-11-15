import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const footerLinks = [
  { label: "FAQs", to: "/faq" },
  { label: "Blog", to: "/blog" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Cookie Settings", to: "/cookies" },
];

export const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:text-left">
        <p>© {currentYear} FareDrop Guide. Track smarter, save more.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {footerLinks.map((link) => (
            <Button key={link.label} variant="ghost" size="sm" asChild>
              <Link to={link.to}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
