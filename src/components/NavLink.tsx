import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
} // components/Header.tsx
import React from "react";
import { NavLink } from "@/components/NavLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Brand → Home */}
        <NavLink to="/" className="flex items-center gap-2" aria-label="Go to home" end>
          {/* Keep or swap your logo img/component here */}
          {/* <img src="/logo.svg" alt="" className="h-8 w-8" /> */}
          <span className="text-xl font-semibold hover:opacity-80">FareDrop Guide</span>
        </NavLink>

        {/* Right-side nav: keep your existing items */}
        <nav className="flex items-center gap-3">
          {/* Example links; remove if you already render these elsewhere */}
          {/* <NavLink to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</NavLink> */}
          {/* <NavLink to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</NavLink> */}
          <NavLink
            to="/sign-in"
            className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
          >
            Sign In
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
