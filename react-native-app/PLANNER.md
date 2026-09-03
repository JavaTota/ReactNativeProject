# WeTravel journey planner

Open the **Create** tab to see **Your journeys**, then choose **Plan a journey**. The previous quick travel log is still available at the bottom of that page.

## Planning and booking

Choose a title, destination, departure and return date using the calendar. Each date becomes a day in the itinerary. Add hotels, restaurants and activities to a day. Hotels have check-in and check-out dates and count as one booking across their whole stay; check-out must fall within the journey.

Booking status is independent from whether you visited a place. The four options are Not booked, Booked, No booking needed and Cancelled. The booking summary excludes places needing no reservation; cancelled reservations count as outstanding. The outstanding filter shows stops across every day.

Each stop can hold an optional confirmation number, booking URL, cost/currency and cancellation deadline. These fields are excluded from published posts. Tracking is manual: the app does not make reservations, import confirmations or send deadline reminders.

Editing journey dates keeps stops on their original day numbers. Shortening a journey is rejected if a stop or hotel checkout would fall outside the new range. Move or remove those stops first.

## Journal and publication

Mark a stop visited to add an optional rating, review and photo. The current prototype accepts one small photo per stop, up to roughly 450 KB, stored with the local data. Save the stop to retain edits.

Set the journey to Completed after traveling, then choose Review & publish. Publication is allowed only on or after the return date and requires at least one visited stop. Confirming creates a snapshot of visited places, their day offsets, hotel stay lengths, reviews and photos. Days without visited stops are shown as free time. A neutral illustrated cover is used if there is no journal photo.

Later private edits do not change that snapshot until you explicitly update the published post. Booking status, confirmation numbers, booking URLs, costs and cancellation deadlines are never copied into the post.

## Save versus reuse

**Save this travel plan** bookmarks the original post.

**Use this itinerary** creates an independent private journey with a new departure date. It retains the day order, hotel stay lengths and creator credit. Booking status resets to Not booked and stops reset to unvisited. Reservation details, photos, reviews and ratings are not copied. Legacy sample posts with text itineraries can also be reused as activity stops.

## Current scope

This is a local prototype using the existing AsyncStorage provider, with migration for earlier saved data. There are no new dependencies. Publication, bookmarks and journeys exist only on this device; there is no shared backend or account isolation. Reservation details are excluded from public projections but are not encrypted in local storage. Use sample booking details while evaluating the prototype. Storage errors are displayed in the app; many photos may exceed device storage limits. Production photo storage and secure account-backed reservation storage remain future work.

Existing Figma asset limitations described in IMPLEMENTATION.md still apply. This update adds no new remote image dependencies.

## Windows update

The incremental ZIP contains the changed files inside a `react-native-app` folder. Back up your working project, then merge that folder into your existing `ReactNativeProject/react-native-app` folder, reviewing replacements if you have local edits. Do not put a second `react-native-app` folder inside the existing one.

Close the running Expo server first. In PowerShell, from your existing `react-native-app` folder, run:

```powershell
npx expo start --clear
```

No new packages were added, so an already working installation does not need another `npm ci` for this update.

## Verification

- `npm run test:planner`: date boundaries, hotel duration validation, booking counts, publication guards, private-field exclusion, snapshot isolation and safe reuse.
- `npm run typecheck`: TypeScript.
- `npm run lint`: lint checks.
- Expo export for Android, iOS and web checks bundling; this does not replace testing on an actual device.

Manual device walkthrough: create a multi-day journey; add a hotel and restaurant; mark one booked and one needing no booking; restart the app and reopen; edit a stop and add a small journal photo; use past dates and mark completed; publish; save the post; reuse it with new dates and confirm all personal entries are reset.

Validation for this update: all five domain test groups, TypeScript and repository-wide ESLint passed. Expo exported Android, iOS and web successfully. Interactive browser and physical-device checks were not performed in this environment.
