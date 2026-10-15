# Worldline Atlas

A public reference for connecting world events with conditional effects across
nature, society, economics and markets, then checking whether those effects occur.

The project explores a simple discipline: record what was observed, explain a
possible mechanism, freeze a forecast before its outcome, and preserve subsequent
corrections and evaluations. Market links are research hypotheses, not trading
recommendations.

## Built through voice-led direction

“Stavěno hlasem s Dots” — built through voice-led direction with Dots.

Ondřej describes the original experiment as directing Botter through spoken
instructions while AI agents implemented, tested and debugged using development
tools. This is a description of the development approach, not a verified claim
that every interaction, repair or publication was voice-only. This independent
project does not imply sponsorship or endorsement by Dots, OpenAI or NASA.
See [the development account](docs/DEVELOPMENT.md).

## What is here

- A plain JavaScript/WebGL globe, relationship views and forecast/evidence UI.
- A small append-only research API and SQLite adapter with regression tests.
- Data contracts, evidence rules, forecast invariants and architecture notes.
- A local read-only demo with explicitly fictional research examples.
- Experimental imagery/orbit adapter source and tests, disconnected from the demo.

The globe uses an original schematic grid, **not a geographic basemap**. NASA
imagery and real CelesTrak orbital samples are not included or fetched by the demo.
The ISS panel explicitly reports that the live layer is disconnected.

## What is not here

There is no private research dataset or old Git history, live service identity,
credential, personal conversation, account integration, deployment pipeline,
research scheduler or automatic model-routing system. Cloning this repository
does not start or transfer the author's personal automations. A public live
portfolio deployment is a separate project step; this repository does not deploy
or configure it.

## Run locally

Use Node.js **22.22.0 or newer with `node:sqlite` support**. The reference was
verified on 22.22.0. No npm installation, API key, account or build step is needed.

```sh
node --experimental-sqlite scripts/local-server.mjs
```

Open **http://127.0.0.1:8797**. Stop with Ctrl+C. A port override is available:

```sh
node --experimental-sqlite scripts/local-server.mjs --port=8798
```

The server always binds to loopback. Its database is in memory and is recreated
from synthetic examples on every start. HTTP writes are disabled. All seven demo
records are fictional; the displayed source reviews exercise the UI and do not
attest real events. The browser makes only same-origin requests during normal use.
Following an explicit documentation/source link may open an external website.

## Verify

```sh
node --experimental-sqlite scripts/test-all.mjs
```

Tests use isolated in-memory databases, synthetic data and mocked provider calls.
They do not query NASA or CelesTrak or mutate a hosted service. See the
[verification record](docs/VERIFICATION.md) for the tested scope and limitations.

## Understand the system

- [Architecture and the authorization boundary](docs/ARCHITECTURE.md)
- [Evidence, versions and forecast contracts](docs/DATA_CONTRACTS.md)
- [Bounded research procedure](docs/OPERATIONS.md)
- [Design decisions](docs/DECISIONS.md)
- [Imagery](docs/IMAGERY.md) and [orbital layer](docs/ISS.md)
- [Third-party notices and omitted materials](THIRD_PARTY_NOTICES.md)

The reusable API requires a trusted server authorization flag for writes. It is
not a standalone authentication system. A future public host must authenticate
writers independently or keep all writes disabled. No turnkey production hosting
or database migration setup is included.

## License

Original project contributions are under the [MIT License](LICENSE), copyright
2026 Ondřej Fiala. The vendored satellite.js library retains its own MIT notice.
Third-party data, media, names and marks are not relicensed by this project's MIT
license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
