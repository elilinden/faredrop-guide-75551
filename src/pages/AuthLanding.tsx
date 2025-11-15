import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthLanding() {
  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      window.location.hash = "#/";
    });
  }, []);

  return <div className="p-8 text-sm text-muted-foreground">Signing you in…</div>;
}
