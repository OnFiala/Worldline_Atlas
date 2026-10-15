CREATE TABLE iss_cache (
 id TEXT PRIMARY KEY NOT NULL CHECK(id = '25544'),
 payload TEXT CHECK(payload IS NULL OR json_valid(payload)),
 fetched_at TEXT,
 next_fetch_at INTEGER NOT NULL,
 stopped INTEGER NOT NULL DEFAULT 0 CHECK(stopped IN (0,1)),
 error TEXT
);
