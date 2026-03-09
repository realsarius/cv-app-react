CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"metadata" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" text NOT NULL,
	"user_id" uuid,
	"email_hash" text,
	"event" text NOT NULL,
	"provider" text,
	"ip" text,
	"user_agent" text,
	"success" boolean DEFAULT true NOT NULL,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" text NOT NULL,
	"user_id" uuid,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"duration_ms" integer,
	"ip" text,
	"user_agent" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_trace_id_idx" ON "audit_logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "auth_events_user_id_created_at_idx" ON "auth_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_events_event_created_at_idx" ON "auth_events" USING btree ("event","created_at");--> statement-breakpoint
CREATE INDEX "auth_events_trace_id_idx" ON "auth_events" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "request_logs_created_at_idx" ON "request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "request_logs_trace_id_idx" ON "request_logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "request_logs_user_id_idx" ON "request_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_logs_path_idx" ON "request_logs" USING btree ("path");