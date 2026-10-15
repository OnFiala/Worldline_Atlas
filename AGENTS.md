# Public reference project

Keep this repository a small, understandable reference with a local synthetic demo.
Read README.md and docs/ARCHITECTURE.md before changing the runtime.

- All product copy, source comments and documentation are in English.
- Preserve the distinction between observations, hypotheses and forecasts.
- Never overwrite an original forecast or report a synthetic result as real evidence.
- Do not import personal datasets, conversations, service credentials, private Git
  history, deployment identities or automation settings.
- The demo is loopback-only and read-only over HTTP. It must make no external
  provider requests. Do not add a public writer or deployment as an incidental fix.
- A trusted adapter must authenticate a caller before setting WRITE_AUTHORIZED.
  A request header or caller-declared writerRole is not authentication.
- New third-party code, images or data need recorded provenance, applicable terms
  and retained notices. Unresolved materials stay out of the release.
- Changes must preserve third-party license files. MIT covers the project's own
  contributions; it does not relicense third-party material or trademarks.
- Run the relevant tests and report observed results and remaining limits.

This repository does not configure or transfer the author's personal automations.
