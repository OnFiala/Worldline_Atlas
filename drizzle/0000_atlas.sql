CREATE TABLE records (
 kind TEXT NOT NULL CHECK(kind IN ('event','source','relation','prediction','node')),
 id TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version > 0),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 recorded_at TEXT NOT NULL,
 run_id TEXT NOT NULL,
 PRIMARY KEY(kind,id,version)
);
--> statement-breakpoint
CREATE INDEX records_lookup ON records(kind,id,version DESC);
--> statement-breakpoint
CREATE TABLE runs (
 id TEXT PRIMARY KEY NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('succeeded','failed')),
 started_at TEXT NOT NULL,
 recorded_at TEXT NOT NULL,
 duration_ms INTEGER,
 usage_json TEXT,
 summary TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 record_count INTEGER NOT NULL
);
