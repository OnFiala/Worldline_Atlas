# Worldline Atlas

I'm building an atlas to see how events around the world connect. I want to follow
their effects on nature, people's lives, the economy and markets. Then come back
later and check which of those expected effects actually happened.

I talk through the ideas with Botter, my Dots assistant, and use those
conversations to steer the build. I'm experimenting with voice as a way to direct
the work. Agents write code, run tests and debug. I make corrections in text too.
More on [how I'm building it](docs/DEVELOPMENT.md).

I want to keep observations, hypotheses and forecasts separate. Each claim needs
sources and dates. Each proposed connection needs an explanation and a way to
test it. Original forecasts stay in the record when I change my mind, so I can
check what I expected before knowing the outcome. Market connections are research
hypotheses, not trading recommendations.

## What is here

I'm sharing the basic structure and a local demo here. My live research version
is private. A public website is a later step; this repository doesn't deploy one.

- A plain JavaScript/WebGL globe, relationship views and forecast/evidence UI.
- A small append-only research API and SQLite adapter with regression tests.
- Data contracts, evidence rules, forecast invariants and architecture notes.
- A local read-only demo with explicitly fictional research examples.
- Experimental imagery/orbit adapter source and tests, disconnected from the demo.

The globe uses an original schematic grid, **not a geographic basemap**. NASA
imagery and real CelesTrak orbital samples are not included or fetched by the demo.
The ISS panel explicitly reports that the live layer is disconnected.

I've kept my research data, conversations, accounts and personal automations out
of this repository. It has a new Git history and contains no credentials, live
service identities, deployment pipeline, research scheduler or automatic model
routing. Cloning it starts none of those services.

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
The shutdown test briefly starts child servers on loopback and requires local
bind/connect permission; it sends SIGINT and SIGTERM only to its own processes.
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

I've released my project contributions under the [MIT License](LICENSE),
copyright 2026 Ondřej Fiala. The vendored satellite.js library retains its own MIT notice.
Third-party data, media, names and marks are not relicensed by this project's MIT
license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This is my independent project. Dots, OpenAI and NASA do not sponsor or endorse it.
