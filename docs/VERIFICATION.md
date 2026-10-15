# Verification record

Checked on 2026-10-15 with Node.js 22.22.0 on macOS. This record covers the public
reference export and its synthetic local demonstration, not a hosted service.

## Automated checks

`node --experimental-sqlite scripts/test-all.mjs` completed successfully after
the final runtime changes. All six scripts passed:

- API: persisted append/readback, optimistic version conflicts, source origin
  and reading gates, corrections and withdrawals, time consistency, forecast
  and baseline immutability, evaluation timing, scoring and rejection audits.
- Explanation UI: safe plain-text rendering, HTML escaping, legacy fallbacks,
  uncertain effects, coverage and API round-trip.
- Imagery: projection bounds and round-trips, fixed upstream, credential
  exclusion and cache/error handling with mocked network responses.
- Imagery visibility: hidden/zero-size globe, pause/resume, canceled requests,
  invalid coordinates and retained cache behavior.
- Orbit: invented fixture propagation, trail and occlusion, stale/invalid data
  suppression, shared fetch reservation, concurrent-request exclusion and
  persistent stop after mocked errors. No real orbital dataset was requested.
- Local demo: seven synthetic records; document views render from that snapshot;
  routes/assets; mutation, foreign-origin and traversal rejection; server-only
  write authorization; absent NASA texture; disconnected orbit. An unexpected
  external fetch makes this test fail.

## Actual HTTP smoke check

A server bound to 127.0.0.1:8798 served the five UI routes, JavaScript and the two
linked method documents with the expected security headers. Snapshot returned
one fictional event and two fictional sources. HEAD returned no body. A mutation
and a foreign-origin request returned 403. The orbital endpoint returned
`disabled`. The shell needed local-network permission to reach this loopback
server; no external provider was contacted by this check.

## Export review

The export contains only text source, documents and synthetic fixtures, with no
symlinks, bundled images, private dataset, deployment identity or old Git
history. A targeted scan found no private path, service-identity or recognizable
credential patterns. The unchanged satellite.js file matches the SHA-256 in
[third-party notices](../THIRD_PARTY_NOTICES.md), and its license is retained.
The original private checkout remained clean at its existing commit throughout
preparation. No hosted service or personal automation was changed.

## Limits

The in-app browser was unavailable, so this export has not received a fresh
visual browser review. Script and HTTP checks do not prove WebGL rendering,
responsive layout or accessibility in every browser. The synthetic orbit test
is not an independent numerical accuracy certification of SGP4. Mocked provider
tests do not establish live-provider availability, data truth or redistribution
rights. Node's SQLite API emits an experimental-feature warning on the tested
runtime. The documented generic orbital-adapter diagnostic limitation remains.

The repository provides an understandable local reference. It does not claim
production readiness, real research verification or calibrated forecast skill.
