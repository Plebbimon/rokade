CREATE TABLE "signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"rating" integer,
	"club" text,
	"federation" text,
	"fide_id" text,
	"registry_source" text,
	"registry_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirm_token_hash" text NOT NULL,
	"confirm_expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signups_confirm_token_hash_unique" UNIQUE("confirm_token_hash")
);
--> statement-breakpoint
ALTER TABLE "signups" ADD CONSTRAINT "signups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signups_tournament_idx" ON "signups" USING btree ("tournament_id","created_at");