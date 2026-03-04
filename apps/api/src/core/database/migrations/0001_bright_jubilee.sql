CREATE TABLE "service_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"duration_in_status_ms" bigint,
	"source" text,
	"bluefolder_history_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sr_event_bf_history" UNIQUE("service_request_id","bluefolder_history_id")
);
--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;