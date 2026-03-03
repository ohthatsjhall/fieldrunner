CREATE TABLE "bluefolder_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bluefolder_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"user_name" text,
	"user_type" text,
	"inactive" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_org_bluefolder_user" UNIQUE("organization_id","bluefolder_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"image_url" text,
	"has_image" boolean DEFAULT false,
	"username" text,
	"password_enabled" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"banned" boolean DEFAULT false,
	"locked" boolean DEFAULT false,
	"external_id" text,
	"public_metadata" jsonb,
	"private_metadata" jsonb,
	"unsafe_metadata" jsonb,
	"last_sign_in_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"image_url" text,
	"has_image" boolean DEFAULT false,
	"created_by" text,
	"max_allowed_memberships" integer,
	"members_count" integer DEFAULT 0,
	"pending_invitations_count" integer DEFAULT 0,
	"admin_delete_enabled" boolean DEFAULT true,
	"public_metadata" jsonb,
	"private_metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"role_name" text,
	"permissions" jsonb,
	"public_metadata" jsonb,
	"private_metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_memberships_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"email_address" text NOT NULL,
	"role" text NOT NULL,
	"role_name" text,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone,
	"user_id" uuid,
	"public_metadata" jsonb,
	"private_metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_invitations_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "organization_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enrollment_mode" text,
	"affiliation_email_address" text,
	"verification" jsonb,
	"total_pending_invitations" integer DEFAULT 0,
	"total_pending_suggestions" integer DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_domains_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_creator_eligible" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "roles_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "permissions_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_clerk_event_id_unique" UNIQUE("clerk_event_id")
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bluefolder_api_key" text,
	"bluefolder_api_key_hint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bluefolder_id" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT '' NOT NULL,
	"priority_label" text DEFAULT '' NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_id" integer,
	"assignee_name" text,
	"is_open" boolean DEFAULT true NOT NULL,
	"is_overdue" boolean DEFAULT false NOT NULL,
	"billable_total" numeric(12, 2) DEFAULT '0',
	"cost_total" numeric(12, 2) DEFAULT '0',
	"date_time_created" timestamp with time zone,
	"date_time_closed" timestamp with time zone,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_org_bluefolder" UNIQUE("organization_id","bluefolder_id")
);
--> statement-breakpoint
CREATE TABLE "trade_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"search_queries" jsonb NOT NULL,
	"google_places_type" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_org_trade_category" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"phone_raw" text,
	"address" text,
	"street_address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"website" text,
	"email" text,
	"google_place_id" text,
	"rating" numeric(3, 2),
	"review_count" integer,
	"categories" jsonb,
	"source_count" integer DEFAULT 1 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_org_vendor_phone" UNIQUE("organization_id","phone")
);
--> statement-breakpoint
CREATE TABLE "vendor_source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"raw_data" jsonb,
	"name" text,
	"address" text,
	"phone" text,
	"rating" numeric(3, 2),
	"review_count" integer,
	"website" text,
	"email" text,
	"types" jsonb,
	"business_hours" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_vendor_source" UNIQUE("vendor_id","source","source_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_search_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_request_id" uuid,
	"trade_category_id" uuid,
	"search_query" text NOT NULL,
	"search_address" text NOT NULL,
	"search_latitude" numeric(10, 7),
	"search_longitude" numeric(10, 7),
	"search_radius_meters" integer DEFAULT 40000 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"sources" jsonb,
	"pending_profile_urls" jsonb,
	"error_message" text,
	"duration_ms" integer,
	"initiated_by" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_search_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_session_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"distance_score" numeric(5, 2),
	"rating_score" numeric(5, 2),
	"review_count_score" numeric(5, 2),
	"category_match_score" numeric(5, 2),
	"business_hours_score" numeric(5, 2),
	"credential_score" numeric(5, 2),
	"distance_meters" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_session_vendor" UNIQUE("search_session_id","vendor_id"),
	CONSTRAINT "uq_session_rank" UNIQUE("search_session_id","rank")
);
--> statement-breakpoint
ALTER TABLE "bluefolder_users" ADD CONSTRAINT "bluefolder_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_domains" ADD CONSTRAINT "organization_domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_categories" ADD CONSTRAINT "trade_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_source_records" ADD CONSTRAINT "vendor_source_records_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_search_sessions" ADD CONSTRAINT "vendor_search_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_search_sessions" ADD CONSTRAINT "vendor_search_sessions_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_search_sessions" ADD CONSTRAINT "vendor_search_sessions_trade_category_id_trade_categories_id_fk" FOREIGN KEY ("trade_category_id") REFERENCES "public"."trade_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_search_results" ADD CONSTRAINT "vendor_search_results_search_session_id_vendor_search_sessions_id_fk" FOREIGN KEY ("search_session_id") REFERENCES "public"."vendor_search_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_search_results" ADD CONSTRAINT "vendor_search_results_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;