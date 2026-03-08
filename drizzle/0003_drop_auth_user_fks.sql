ALTER TABLE "profiles"
  DROP CONSTRAINT IF EXISTS "profiles_id_auth_users_id_fk";

--> statement-breakpoint
ALTER TABLE "resumes"
  DROP CONSTRAINT IF EXISTS "resumes_user_id_auth_users_id_fk";
