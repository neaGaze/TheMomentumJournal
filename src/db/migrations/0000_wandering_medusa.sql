CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_type" text NOT NULL,
	"journal_entries_analyzed" uuid[] NOT NULL,
	"goals_analyzed" uuid[] NOT NULL,
	"insights" jsonb NOT NULL,
	"recommendations" jsonb,
	"progress_summary" jsonb,
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ai_analyses_analysis_type_check" CHECK ("ai_analyses"."analysis_type" IN ('on-demand', 'weekly', 'monthly'))
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"category" text,
	"target_date" date,
	"status" text DEFAULT 'active',
	"progress_percentage" integer DEFAULT 0,
	"parent_goal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "goals_type_check" CHECK ("goals"."type" IN ('long-term', 'short-term')),
	CONSTRAINT "goals_status_check" CHECK ("goals"."status" IN ('active', 'completed', 'paused', 'abandoned')),
	CONSTRAINT "goals_progress_percentage_check" CHECK ("goals"."progress_percentage" >= 0 AND "goals"."progress_percentage" <= 100),
	CONSTRAINT "chk_parent_goal_type" CHECK (("goals"."type" = 'long-term' AND "goals"."parent_goal_id" IS NULL) OR ("goals"."type" = 'short-term'))
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"entry_date" date DEFAULT CURRENT_DATE,
	"mood" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_goal_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"mentioned_explicitly" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "journal_goal_mentions_journal_entry_id_goal_id_key" UNIQUE("journal_entry_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"summary" text NOT NULL,
	"key_achievements" jsonb,
	"areas_for_improvement" jsonb,
	"goal_progress_updates" jsonb,
	"ai_analysis_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "weekly_insights_user_id_week_start_date_key" UNIQUE("user_id","week_start_date")
);
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_goal_id_goals_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_goal_mentions" ADD CONSTRAINT "journal_goal_mentions_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_goal_mentions" ADD CONSTRAINT "journal_goal_mentions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_insights" ADD CONSTRAINT "weekly_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_insights" ADD CONSTRAINT "weekly_insights_ai_analysis_id_ai_analyses_id_fk" FOREIGN KEY ("ai_analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_analyses_user_id" ON "ai_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_goals_user_id" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_goals_status" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_goals_type" ON "goals" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_goals_parent_goal_id" ON "goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_user_id" ON "journal_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_date" ON "journal_entries" USING btree ("entry_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_weekly_insights_user_id_date" ON "weekly_insights" USING btree ("user_id","week_start_date" DESC NULLS LAST);