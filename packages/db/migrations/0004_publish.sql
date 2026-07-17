ALTER TABLE "tournaments" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;