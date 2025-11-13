-- Add INSERT policy to audit_log table to enforce server-side validation
CREATE POLICY "Users can insert their own audit logs"
ON audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);