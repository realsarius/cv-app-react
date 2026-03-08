CREATE TYPE "public"."resume_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"content" jsonb NOT NULL,
	"ats_score" numeric(5, 2),
	"algorithm_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_versions_content_size_check" CHECK (octet_length("resume_versions"."content"::text) <= 262144)
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled Resume' NOT NULL,
	"status" "resume_status" DEFAULT 'draft' NOT NULL,
	"current_version_no" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "resume_versions_resume_id_idx" ON "resume_versions" USING btree ("resume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_versions_resume_id_version_no_unique" ON "resume_versions" USING btree ("resume_id","version_no");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_updated_at_idx" ON "resumes" USING btree ("updated_at");
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resumes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resume_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles"
FOR SELECT USING (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles"
FOR INSERT WITH CHECK (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles"
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "profiles_delete_own" ON "profiles"
FOR DELETE USING (auth.uid() = id);
--> statement-breakpoint
CREATE POLICY "resumes_select_own" ON "resumes"
FOR SELECT USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "resumes_insert_own" ON "resumes"
FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "resumes_update_own" ON "resumes"
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "resumes_delete_own" ON "resumes"
FOR DELETE USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "resume_versions_select_own" ON "resume_versions"
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_versions"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_versions_insert_own" ON "resume_versions"
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_versions"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_versions_update_own" ON "resume_versions"
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_versions"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
) WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_versions"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
CREATE POLICY "resume_versions_delete_own" ON "resume_versions"
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM "resumes"
		WHERE "resumes"."id" = "resume_versions"."resume_id"
		AND "resumes"."user_id" = auth.uid()
	)
);
