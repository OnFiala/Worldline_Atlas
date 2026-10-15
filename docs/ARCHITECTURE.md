# Architecture

This is a public reference and a local demonstration, not a production hosting template.

## Runtime

The browser loads plain JavaScript modules and a WebGL schematic globe. The Node server in scripts/local-server.mjs binds only to 127.0.0.1, serves frontend files, and exposes read-only research routes. A fresh in-memory SQLite database is populated with seven fictional records at startup; shutdown discards it. scripts/local-db.mjs adapts a small D1-shaped interface to Node SQLite. No package installation or remote service is needed.

The flow is: original synthetic examples → validated startup import → in-memory versions → read-only API → browser. The source review gate exists to demonstrate recorded evidence rules; the synthetic sources are not real evidence.

## Authorization

worker/api.mjs is a reusable research core, not an authentication layer. Writes require WRITE_AUTHORIZED === true in the server environment. A trusted adapter may set it only after authenticating the caller. Never copy a client header or JSON value into this flag. The demo uses it only for its internal startup import and rejects all HTTP mutation methods. Caller-declared writerRole narrows a validated import; it does not authenticate anyone.

A future public host must supply independent authentication and storage, or retain read-only behavior. Root-relative routes currently assume the application is served at the origin root. Subdirectory hosting requires an explicit routing change. There is no deployment configuration, cloud identity or automatic migration service in this repository.

## Optional adapter source

worker/imagery.mjs and worker/iss.mjs show bounded provider adapters. They are not mounted by the local server. frontend/imagery.js is not instantiated by the demo globe. The orbital panel receives an explicit disabled response. Tests use mocked responses and an invented orbital fixture. Nothing here enables live research, provider access or personal schedules by default.

## Limits

API validation can enforce record versions, shapes and declared evidence metadata; it cannot establish semantic truth. Append-only behavior is implemented by the API, not by SQL triggers that constrain a database administrator. The role names in documentation are collaboration conventions, not independent security identities. The local demo is not a multi-user application.
