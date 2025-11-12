import { supabase } from "@/integrations/supabase/client";

export const trackEvent = async (eventName: string, properties: Record<string, any>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `${eventName}:${JSON.stringify(properties)}`,
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};
