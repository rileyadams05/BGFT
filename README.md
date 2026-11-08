# BGFT

BGFT is a responsive browser interface for sending a package source supplied by the user to a BGFT installation service on their own PlayStation 4. It is a separate project from FPKG Builder: FPKG Builder creates packages from Itemzflow dumps; BGFT handles installation requests for existing packages.

BGFT is not a game store. It does not provide a catalogue, package URLs, or hosted PKG/fPKG downloads. A user supplies a direct package URL or selects a local package file. The browser sends requests to the user's console on their local network; package data is not sent to Vortex Prime.

## What this project contains

- A responsive web interface for desktop, phone, and tablet browsers.
- Saved or manually entered private IPv4 address for the PS4.
- Explicit connection and browser pairing flow.
- Direct package URL submission and local `.pkg` file upload.
- Upload byte progress and BGFT task status reporting.
- A web app manifest and scoped service worker for installable/offline app-shell support where the browser supports it.
- No native desktop, Android, or iOS application.

## Requirements and current boundary

The PS4 must already have a compatible BGFT service installed, running, and reachable on the same local network. This repository contains the browser client. **It does not contain or install a PS4-side BGFT bridge.** The client expects the console service to implement the documented `vortex-prime.ps4-catalogue-service` API v1, including pairing, `/bgft/tasks`, `/bgft/uploads`, and task-status routes. Without that companion service the interface will report that the BGFT service is unavailable; it will not fall back to a different receiver.

Serve the web app from HTTPS. Browser requests from a public website to a private PS4 address are governed by browser security controls, CORS, and local-network permission. Chrome documents a user permission prompt for local-network access from secure sites; browsers may behave differently, and an HTTPS page can be prevented from calling a console endpoint that only offers HTTP. BGFT does not use a website proxy or weaken browser security to work around those restrictions. See [Chrome's Local Network Access guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access/) and [MDN's mixed-content guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content).

The PS4 service must bind only to the console's private LAN interface, enforce pairing and package validation, and allow the exact trusted website origin through CORS. Do not expose the service to the public internet or forward its port through a router.

## Using the web app

1. Open the BGFT app over HTTPS in a supported browser, on a device connected to the same local network as the PS4.
2. Enter the PS4's private IPv4 address and choose **Connect to PS4**. A browser may ask for permission to access the local network.
3. Approve pairing on the PS4 and enter the one-time code when requested.
4. Paste a direct URL to a package or choose/drop your own `.pkg` file.
5. Review the confirmation and send. The app reports upload transfer progress separately from the console's installation-task status.

The current frontend accepts HTTP(S) URLs ending in `.pkg` without embedded credentials. The PS4 service must validate the URL, package metadata, size, and available space again before accepting an installation. The browser's upload percentage describes bytes sent to the console, not installation progress.

## Installable web app

The app includes a PWA manifest and service worker for its local application shell. In supported desktop and Android browsers, the browser may offer an install action. On iPhone or iPad, Safari provides **Share → Add to Home Screen**; exact availability and presentation depend on the OS/browser. Installing the web app does not bypass local-network permissions or make an unavailable PS4 bridge reachable. See [Apple's Add to Home Screen instructions](https://support.apple.com/guide/ipad/bookmark-a-website-ipadc602b75b/27/ipados/27).

## Testing status

Automated tests cover the browser UI contract, URL/request construction, credential handling, upload request headers, and task API references. They use mock responses and do not communicate with a PS4. **Testing against a physical PS4 and a compatible PS4-side BGFT bridge remains a separate hardware test.** A frontend build or mock test is not evidence that a console accepted or installed a package.

## Development and hosting

The deployable web application is in `web/`. It is static HTML, CSS embedded in the original interface, JavaScript, and a service worker; it has no build-time JavaScript dependencies.

Requirements: Node.js 22 or newer for the test command.

```sh
npm test
```

Deploy the contents of `web/` under the same HTTPS origin that the PS4-side service explicitly trusts. The Vortex Prime integration serves it at `https://vortex-prime-emu.com/bgft/`. The website deployment copies the app from this repository; it does not maintain a second source implementation.

## Credits and licensing

BGFT's original browser interface and integration were developed for Vortex Prime by Riley Adams (`rileyadams05`). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the API/protocol boundary and acknowledgements. The original code in this repository is licensed under the MIT License; third-party software and services retain their own terms.
