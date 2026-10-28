# Royal Concept Event — full current application source

This archive contains the full source of the current Royal Concept Event app plus the prepared, unpublished menu-card update. It is an export of the application built in this conversation, not a claim that every feature in the original specification is implemented.

## Included

- React and TypeScript frontend with responsive navy, dark green and gold design.
- AppDeploy sign-in, private per-user data and authenticated backend routes.
- Event, guest and table records, guest table assignments and dashboard totals.
- Random guest QR invitations, QR validation, camera scanning, manual guest search/check-in and duplicate check-in protection.
- Attendance CSV export.
- Food & Beverage, Costume, Decoration and Sound System preparation pages, with suppliers, contacts, costs, statuses, search, pagination and editing.
- Per-item preset/custom option menus.
- Prepared menu-card update: logo above the form, separate Save and Download menu card controls, branded A5 PDF download from current form details.
- Company logo, event background, configuration and workflow test specifications.

## Platform requirements

The frontend imports `@appdeploy/client`; the backend imports `@appdeploy/sdk`. These are AppDeploy-managed libraries injected by that platform. They are not ordinary dependencies included in package.json or in this ZIP. The archive includes the complete app-owned source, not AppDeploy's proprietary runtime, database contents, credentials or authentication tokens.

Use AppDeploy to deploy this source. To host it on another provider, first replace these SDK calls with that provider's authentication, database and HTTP API implementation. Running `npm install` alone does not supply those platform services.

## Deploy using AppDeploy

1. Extract the ZIP.
2. Use the existing AppDeploy app `royal-concept-event-jnbmco` with React/Vite frontend and backend.
3. Apply the included source/configuration files. Review current source before replacing files if the live app has changed since this export.
4. Upload/bind the two binary assets from `public/resources/` at their matching paths.
5. Ensure `jspdf` is installed from package.json. AppDeploy supplies its own client/server SDKs.
6. Deploy and run the scenarios in `tests/tests.json`.

The menu-card update has not been deployed or browser-tested: publishing was blocked by an AppDeploy usage limit. Restoring credits is required to publish through that service. No additional secret keys are required by this app-owned source.

## Standard frontend commands

In an environment where the AppDeploy client SDK is available:

```sh
npm install
npm run dev
npm run build
```

The backend entry point is `backend/index.ts`, which includes routes from `backend/services.ts`. Vite alone does not run that backend or its managed database.

## Important current limitations

- The events/guests/tables endpoints currently return the first 100 records. Preparation item lists support Load more in pages of 50.
- Access is private to the signed-in owner; team role sharing is not implemented.
- Interactive drag-and-drop venue planning, individual seats, seating capacity enforcement, auto-seating, guest imports and event duplication are not implemented.
- Invitation revocation/expiry management, group attendee limits, public invitation pages and invitation PDF cards are not implemented. The downloadable prepared menu card is separate from a guest QR invitation.
- Cross-device concurrency, camera behavior and the full event workflow still require practical testing before use at a live event.
- Tests/tests.json contains workflow instructions for the deployment service; it is not an executable unit-test suite.

## Snapshot

Exported 28 October 2026 from deployed source snapshot `1793179643142`, then overlaid with the prepared menu-card update. The export does not contain user event or guest data.
