# Contributing

Changes to this repository must preserve the user-supplied package workflow, pairing checks, and private-network security boundary.

- Do not add hosted commercial game packages, a game catalogue, or package URLs that the project does not own.
- Do not add an unrestricted server-side proxy for user-supplied URLs.
- Do not remove validation, confirmation, pairing, CORS, or local-network security checks.
- Do not claim that a mock, browser preview, or CI test demonstrates installation on a PS4.
- Keep the BGFT receiver isolated from the separate Remote Package Installer (RPI) flow.
- Submit focused changes with tests for URL validation, request format, task state, and failure handling as appropriate.
- Preserve the license and attribution notices for Riley Adams and any additional contributors or upstream code.

The browser frontend depends on a PS4-side companion implementing the API contract. Changes to that contract require explicit compatibility review with the companion; do not invent endpoint behavior.
