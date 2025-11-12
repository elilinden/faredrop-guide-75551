import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'create' | 'update' | 'delete' | 'undo' | 'import' | 'view';

export const logAudit = async (
  action: AuditAction,
  tripId?: string,
  meta?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_log').insert({
      user_id: user.id,
      trip_id: tripId,
      action,
      meta: meta || null,
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit failures shouldn't break user flows
  }
};
