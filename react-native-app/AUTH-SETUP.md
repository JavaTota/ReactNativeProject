# WeTravel authentication update

This update targets the supplied Expo SDK 54, React 19.1 and Clerk Expo 4.6.5 configuration. It does not upgrade Expo or connect Supabase.

## Install the update

Back up your code and merge the four source files in this update into the existing `react-native-app` directory. Review replacements if you have edited those files. Keep your existing package.json and lockfile: the packages required here are already in the package.json you supplied.

Your `.env.local` beside package.json must contain your real `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Never put Clerk's secret key there.

In Clerk, enable email/password signup and email verification codes. For this first custom flow, email and password must be the only required signup fields. Enable the Native API to test on mobile. Browser signup includes the Clerk CAPTCHA mount point; retain Clerk's bot protection settings.

Start from PowerShell inside react-native-app:

```powershell
npx expo start --web --clear
```

SDK 54 still does not run in the SDK 57 Expo Go app on your iPhone. This update does not change that compatibility limitation.

## Behavior

- Signed-out users see the login/signup form before app navigation mounts.
- Signup sends an email code, supports verification and resend, then activates the session.
- Login uses Clerk email/password authentication.
- Profile has a logout button. Successful logout unmounts the private app screens and their in-memory store.
- Clerk's token cache handles session persistence. Password and code fields exist only in component state; they are never written to the travel store.
- Local app data is stored under the Clerk user ID. Switching accounts mounts a fresh store and reads only that account's cache.
- Existing data under `wetravel-demo-v1` remains untouched. It is not imported automatically into a new account.

## Scope and validation

The app still uses AsyncStorage for trip data. Account-specific cache keys avoid accidental display across accounts, but are not encryption or server-side authorization. Supabase database integration remains separate.

This first version supports basic email/password accounts. Password reset, MFA, additional sign-in verification challenges and pending session tasks need further screens; incomplete flows display an error and do not enter the private app. Do not disable security controls on existing accounts to bypass a challenge.

TypeScript and lint should be checked with `npm run typecheck` and `npm run lint`. Live acceptance testing needs your configured Clerk project: sign up, enter an incorrect then correct verification code, log out, log in, restart, and switch to a second account to verify that the first account's journeys are not shown.

Reference: https://clerk.com/docs/guides/development/custom-flows/authentication/email-password
