import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      window.location.replace(`${window.location.origin}/#/auth`);
    });
  }, []);

  return (
    <div className="p-8 text-sm text-muted-foreground">
      Finishing up your sign-in…
    </div>
  );
}
