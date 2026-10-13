---
_provenance:
  writtenBy: stardust:replica
  writtenAt: 2026-10-07T09:58:46Z
  againstInput: https://www.saudia.com
  readArtifacts:
    - stardust/current/pages/explore-destination.json
    - stardust/current/pages/book-manage-flight-pass.json
    - stardust/current/pages/experience-classes.json
    - stardust/replica/tokens.json
---

# Direction — preserve mode (same-design migration)

Mode: PRESERVE. The target spec is the captured current state of https://www.saudia.com,
synthesized for a bounded three-archetype pilot (no direct invocation, no creative decisions).

Synthesized (bounded-single): current/pages/{explore-destination,book-manage-flight-pass,experience-classes}.json
+ Phase-3 CSS lift (stardust/replica/tokens.json) → PRODUCT.md · DESIGN.md · DESIGN.json (at 2026-10-07T09:58:46Z).

Permitted deltas: ONLY the entries of stardust/replica/inconsistency-register.md
(3 entries, all deferred — nothing changed; pure replica).

Fidelity: ia verbatim · design verbatim · content verbatim.

Capture channel: saudia.com serves an Imperva challenge (HTTP 200, iframe) to the headless
crawler and gate scripts. With the user's approval, every live capture (DOM, computed styles,
stitched screenshots) and every prototype capture used for the gate was taken through the same
interactive browser session with the same routine (stardust/replica/live-capture.js), so the
pixel and parity probes stay symmetric.
