# WeTravel Figma implementation

React Native implementation of the eight screens in the supplied Riber Figma file, adapted to the existing Expo SDK 54, Expo Router, and NativeWind 5 preview project.

## Run

```sh
cd react-native-app
npm ci
npm start
```

Open with Expo Go on a device, or run `npm run web` for the browser version. Native device behavior still needs a device smoke test.

## Pages

| Figma screen  | Route        | Implemented interactions                                                                               |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| Home feed     | `/`          | Stories, post details, likes, bookmarks, navigation                                                    |
| Explore       | `/explore`   | Categories, country/destination search, post selection                                                 |
| Post detail   | `/post/[id]` | Follow, itinerary, saved plans, comments                                                               |
| User profile  | `/profile`   | Edit profile, share journal text, grid/map/saved tabs                                                  |
| Create post   | `/create`    | Sample photo selection, device image picker, story/location/category/itinerary input, local publishing |
| Stories       | `/story`     | Previous/next navigation, close, local reply, destination link                                         |
| Search map    | `/map`       | Illustrated map, selectable pins, destination search                                                   |
| Notifications | `/inbox`     | Follow action, post links, locally saved story replies                                                 |

## Design and structure

The design's cream, terracotta, white cards, rounded photography, Outfit body typography, and Instrument Serif headings are retained. The displayed brand is WeTravel. Device status bars and home indicators are handled by the OS and safe-area insets rather than drawn as fake UI. Content scrolls on smaller screens and is centered at a maximum width of 600 on larger screens.

- `components/ui.tsx`: shared typography, cards, inputs, buttons, screen layout, and bottom navigation.
- `components/post-card.tsx`: reusable feed card.
- `constants/theme.ts`: shared colors and fonts.
- `constants/trips.ts`: clearly separated sample journeys and itineraries.
- `context/travel-store.tsx`: local demo state and AsyncStorage persistence.
- `constants/figma-assets.ts`: exact Figma image references.

The itinerary and Saved Plans tab extend the supplied visual design to support the WeTravel concept. The sample itinerary text is illustrative, not a verified travel guide. The accommodation discount in the mockup is replaced with an inspirational journey link because no real offer exists.

## Important unfinished asset work

The code for all eight screens is implemented, but this is **not a fully asset-complete delivery**. Figma's asset URLs could not be downloaded from the coding environment. Direct Figma exports then reached the connected Starter plan's tool-call limit.

Ten assets are bundled locally, including the main Amalfi feed image and several icons. The other 64 entries still refer to the exact temporary URLs returned by Figma. They may fail in a restricted environment and expire after approximately seven days. The app compiles, but those images will be blank wherever the URLs cannot load.

Run this from a network that can download the exports, while the URLs remain valid:

```sh
npm run assets:download
```

The script validates PNG/SVG bytes, saves successful downloads, and rewrites the source map to local files. It returns a nonzero status if any are missing. Once URLs expire, re-export matching Figma assets and replace their entries in `assets/figma/manifest.json` or place the correctly named files in `assets/figma`. Do not treat the temporary remote references as production asset hosting.

Two temporary isolated background copies could not be removed after the same Figma limit blocked cleanup. Delete only the layers named **Temporary WeTravel background export** with IDs **2020:2** and **2020:41** from the Figma file. The original nodes are **2002:531** and **2002:572**; keep those.

## Local prototype boundaries

- Posts, comments, likes, bookmarks, follows, profile edits, and replies are stored on the current device. There is no shared backend, real authentication, or delivery to other users.
- The illustrated map and distances are sample data, not a live map or geolocation service.
- The four image choices on Create select supplied sample artwork. They are not an image-processing filter engine.
- Imported photos are stored as small data URLs for this demo (roughly 1.5 MB maximum). Production media should be uploaded to object storage.
- Caption, destination, and category are retained as draft fields. The selected photo and itinerary input remain in screen state until shared.
- The existing default Expo app icon/splash assets are unchanged; final WeTravel branding assets were not supplied.
- Clerk, PostHog, EAS release configuration, and a production database are future integrations.

## Checks

```sh
npm run typecheck
npm run lint
npx expo export --platform web
```

The dependency lockfile was repaired to match the existing Lightning CSS override. SDK 54-compatible ImagePicker and AsyncStorage were added, plus the two font packages used by the design.

Validation completed: TypeScript check, Expo lint, whitespace check, and web/iOS/Android JavaScript bundle exports all passed. Native binary builds and device interaction tests were not run. Browser visual/interaction QA could not run because the browser download was unavailable; full visual fidelity also remains unverified until the missing images are downloaded.

The implementation is on local branch `feat/wetravel-figma-screens`. It has not been pushed to GitHub.
