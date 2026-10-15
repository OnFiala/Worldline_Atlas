# Orbital layer

The public demo does not show a real or synthetic ISS position. Its panel explicitly reports that live orbital data is disconnected. The server never calls the provider adapter.

The reusable code validates a single catalog-25544 OMM-style record and propagates orbital elements with satellite.js 6.0.1. The original library and MIT license are retained. Source code for an experimental CelesTrak adapter demonstrates a shared two-hour fetch reservation, fixed HTTPS origin, no forwarded browser credentials, a bounded response, and persistent pause after errors. Element age above 24 hours hides position and trail. It is a calculated visualization, not live telemetry or operational navigation.

The adapter retains a known diagnostic limitation: most fetch/validation failures collapse to a generic message. Its recovery work is separate from this public export. Do not silently reset a paused cache or retry a failing provider. Enabling the adapter requires a separate rights, service-policy and operational review.

scripts/fixtures/iss-demo.json contains invented test values, marked synthetic. It is not a CelesTrak sample, real ISS orbit or UI fallback. Its catalog identifiers only exercise validation. The suite checks integration, plausible ranges, stale suppression and mocked failure/rate behavior; it is not an independent accuracy certification of SGP4. No external reference dataset is bundled by these tests.
