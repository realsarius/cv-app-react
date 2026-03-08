CREATE TABLE "job_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"job_title" text,
	"company" text,
	"job_description" text NOT NULL,
	"last_score" numeric(5, 2),
	"matched_keywords" jsonb,
	"missing_keywords" jsonb,
	"suggestions" jsonb,
	"algorithm_version" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_targets" ADD CONSTRAINT "job_targets_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_targets_resume_id_idx" ON "job_targets" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "job_targets_updated_at_idx" ON "job_targets" USING btree ("updated_at");
--> statement-breakpoint
ALTER TABLE "job_targets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "job_targets_select_own" ON "job_targets"
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "job_targets"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "job_targets_insert_own" ON "job_targets"
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "job_targets"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "job_targets_update_own" ON "job_targets"
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "job_targets"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
) WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "job_targets"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "job_targets_delete_own" ON "job_targets"
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "job_targets"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
