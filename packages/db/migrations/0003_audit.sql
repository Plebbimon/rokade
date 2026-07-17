CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"club_id" uuid,
	"tournament_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_tournament_idx" ON "audit_log" USING btree ("tournament_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_club_idx" ON "audit_log" USING btree ("club_id","at");