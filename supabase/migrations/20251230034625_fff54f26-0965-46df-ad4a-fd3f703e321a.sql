-- Permitir que admins atualizem notification_logs (marcar como lida)
CREATE POLICY "Admins can update notification_logs" 
ON notification_logs
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));