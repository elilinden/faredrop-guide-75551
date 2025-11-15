import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthListener(onChange?: () => void) {
  useEffect(() => {
    supabase.auth.getSession().finally(() => onChange?.());
    const { data: listener } = supabase.auth.onAuthStateChange(() => onChange?.());
    return () => listener.subscription.unsubscribe();
  }, [onChange]);
}
