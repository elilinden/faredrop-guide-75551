import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthDebug() {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    (async () => {
      const url =
        (supabase as any).supabaseUrl ||
        import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
        (typeof window !== "undefined" ? (window as any).__SUPABASE_URL__ : "");

      let authPreflight = 0;
      if (url) {
        const ping = await fetch(
          `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
            `${window.location.origin}/auth/callback`,
          )}`,
          { redirect: "manual" },
        );
        authPreflight = ping.status;
      }

      const { data } = await supabase.auth.getUser();
      setInfo({
        supabaseUrl: url,
        authPreflight,
        signedInAs: data.user?.email || null,
      });
    })();
  }, []);

  return <pre className="p-4 text-xs bg-muted/30 rounded">{JSON.stringify(info, null, 2)}</pre>;
}
