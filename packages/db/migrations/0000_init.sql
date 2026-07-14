CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"tournament" jsonb NOT NULL
);
