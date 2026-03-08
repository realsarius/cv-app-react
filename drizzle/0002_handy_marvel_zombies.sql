CREATE TABLE "resume_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"template_key" text DEFAULT 'ats-classic' NOT NULL,
	"font_scale" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"spacing_scale" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"color_scheme" text DEFAULT 'neutral' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resume_settings" ADD CONSTRAINT "resume_settings_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resume_settings_resume_id_unique" ON "resume_settings" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_settings_updated_at_idx" ON "resume_settings" USING btree ("updated_at");
--> statement-breakpoint
ALTER TABLE "resume_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "resume_settings_select_own" ON "resume_settings"
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_settings"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_settings_insert_own" ON "resume_settings"
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_settings"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_settings_update_own" ON "resume_settings"
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_settings"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
) WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_settings"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_settings_delete_own" ON "resume_settings"
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_settings"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
