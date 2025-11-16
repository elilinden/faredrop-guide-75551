import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";

function getCallbackUrl() {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}/#/auth/callback`;
}

async function preflightGoogle(): Promise<number> {
  if (typeof window === "undefined") {
    return 0;
  }

  const baseUrl =
    (supabase as any).supabaseUrl ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== "undefined" ? (window as any).__SUPABASE_URL__ : "");

  if (!baseUrl) {
    return 0;
  }

  const callbackUrl = getCallbackUrl();
  const authorizeUrl = `${baseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    callbackUrl,
  )}`;

  try {
    const res = await fetch(authorizeUrl, { redirect: "manual" });
    return res.status;
  } catch (error) {
    console.error("Google auth preflight failed:", error);
    return 0;
  }
}

export interface SignInButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

export const SignInButton = React.forwardRef<HTMLButtonElement, SignInButtonProps>(
  ({ children = "Sign in with Google", onClick, type = "button", ...props }, ref) => {
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      const status = await preflightGoogle();
      if (status && status !== 302 && status !== 200) {
        alert(
          "Google provider appears disabled or misconfigured on your Supabase project. Double-check: Auth → Providers → Google is ENABLED, and env URL points to the right project.",
        );
        console.error("Preflight status:", status);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getCallbackUrl(),
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        console.error("Google sign-in failed:", error);
        alert(error.message || "Google sign-in failed");
      }
    };

    return (
      <Button ref={ref} onClick={handleClick} type={type} {...props}>
        {children}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
