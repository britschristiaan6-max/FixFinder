CREATE TABLE "job_requests" (
	"id" serial PRIMARY KEY,
	"service" text NOT NULL,
	"area" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"urgency" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pro_profiles" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"trade" text NOT NULL,
	"service_area" text NOT NULL,
	"town" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"callout_fee" integer DEFAULT 0 NOT NULL,
	"qualifications" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "job_requests_created_at_idx" ON "job_requests" ("created_at");--> statement-breakpoint
CREATE INDEX "pro_profiles_trade_idx" ON "pro_profiles" ("trade");--> statement-breakpoint
CREATE INDEX "pro_profiles_published_idx" ON "pro_profiles" ("published");