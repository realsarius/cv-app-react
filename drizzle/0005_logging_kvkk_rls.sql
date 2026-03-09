ALTER TABLE "request_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "auth_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "request_logs_no_access_select" ON "request_logs";
--> statement-breakpoint
CREATE POLICY "request_logs_no_access_select" ON "request_logs"
FOR SELECT USING (false);
--> statement-breakpoint

DROP POLICY IF EXISTS "audit_logs_select_own" ON "audit_logs";
--> statement-breakpoint
CREATE POLICY "audit_logs_select_own" ON "audit_logs"
FOR SELECT USING ("user_id" = auth.uid());
--> statement-breakpoint

DROP POLICY IF EXISTS "auth_events_select_own" ON "auth_events";
--> statement-breakpoint
CREATE POLICY "auth_events_select_own" ON "auth_events"
FOR SELECT USING ("user_id" = auth.uid());
