-- The visit_signals table

CREATE SEQUENCE IF NOT EXISTS visit_signals_id_seq;

CREATE TABLE "public"."visit_signals" (
    "id" int4 NOT NULL DEFAULT nextval('visit_signals_id_seq'::regclass),
    "visit_id" int4 NOT NULL,
    "key" varchar(50) NOT NULL,
    "value" varchar(250) NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visit_signals_visit_id_and_key" ON "public"."visit_signals" ("visit_id", "key");
CREATE INDEX "visit_signals_visit_id" ON "public"."visit_signals" ("visit_id");
CREATE INDEX "visit_signals_key_and_value" ON "public"."visit_signals" ("key", "value");
CREATE INDEX "visit_signals_key" ON "public"."visit_signals" ("key");

COMMENT ON COLUMN "public"."visit_signals"."key" IS 'The signal key that matches a signal source from the application''s code';
COMMENT ON COLUMN "public"."visit_signals"."value" IS 'The signal value';
COMMENT ON COLUMN "public"."visit_signals"."created_at" IS 'When the signal was received';

COMMENT ON INDEX "visit_signals_visit_id_and_key" IS 'To check if a visit has a signal';
COMMENT ON INDEX "visit_signals_visit_id" IS 'To request all the signals of a visit';
COMMENT ON INDEX "visit_signals_key_and_value" IS 'To analyze the values of a key';
COMMENT ON INDEX "visit_signals_key" IS 'To analyze the values of a key';


-- The visits table

CREATE SEQUENCE IF NOT EXISTS visits_id_seq;

CREATE TABLE "public"."visits" (
    "id" int4 NOT NULL DEFAULT nextval('visits_id_seq'::regclass),
    "public_id" varchar(32) NOT NULL,
    "fingerprint" varchar(50),
    "visitor_ip" varchar(50) NOT NULL,
    "visitor_user_agent" varchar(300) NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "finalized_at" timestamptz,
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visits_public_id" ON "public"."visits" ("public_id");
CREATE INDEX "visits_fingerprint" ON "public"."visits" ("fingerprint");
CREATE INDEX "visits_visitor_ip" ON "public"."visits" ("visitor_ip");
CREATE INDEX "visits_visitor_user_agent" ON "public"."visits" ("visitor_user_agent");

ALTER TABLE "public"."visit_signals" ADD FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMENT ON COLUMN "public"."visits"."public_id" IS 'The identifier used in the URLs to connect data together without cookies';
COMMENT ON COLUMN "public"."visits"."fingerprint" IS 'The fingerprint is calculated basing on the signals during the finalization';
COMMENT ON COLUMN "public"."visits"."visitor_ip" IS 'The IP address of the visitor';
COMMENT ON COLUMN "public"."visits"."visitor_user_agent" IS 'The user-agent of the visitor''s browser';
COMMENT ON COLUMN "public"."visits"."created_at" IS 'When the visit happened';
COMMENT ON COLUMN "public"."visits"."finalized_at" IS 'When the visit was finalized, i.e. the fingerprint was calculated and the result was first shown';

COMMENT ON INDEX "visits_public_id" IS 'To request visits by ids from URLs';
COMMENT ON INDEX "visits_fingerprint" IS 'To count individual fingerprints';
COMMENT ON INDEX "visits_visitor_ip" IS 'To analyze visitors'' IPs';
COMMENT ON INDEX "visits_visitor_user_agent" IS 'To analyze visitors'' user-agents';
