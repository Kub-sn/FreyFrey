# Android Internal Testing

This is the preferred Android distribution path if you want the app to stay non-public but avoid manually sending APK files around.

Google Play Internal Testing means:

- the app is not publicly discoverable in the Play Store
- only explicitly invited testers can install it
- updates are distributed through Play like normal app updates
- you do not need to manually send a new APK file for every change

For your current use case with only two people, this is a good middle ground between direct APK sideloading and a public release.

## How Internal Testing fits this project

Your web deployment stays unchanged:

```text
push to main -> Cloudflare deploys web production
```

Android remains a separate release path:

```text
code changes -> tests -> web build -> Capacitor sync -> signed AAB -> Play Console internal testing -> invited testers update through Play Store
```

Important: the Android app still does not update automatically from Cloudflare. A new Android release is still required for Android users.

## Why this is better than direct APK sharing

- installation is easier for the second person
- updates arrive through the Play Store
- no repeated sideload permissions are needed
- version management is cleaner
- you stay private because only invited testers get access

## What stays private

Internal testing is not public publishing.

- random users cannot discover the app in the Play Store
- only testers you add can access it
- the app is effectively private to your tester group

## Important repository facts

- Capacitor config: [capacitor.config.ts](/home/kubi/Documents/FamilyPlanner/capacitor.config.ts)
- Android build config: [android/app/build.gradle](/home/kubi/Documents/FamilyPlanner/android/app/build.gradle)
- Current Android app id: `com.familyplanner.app`
- Web assets bundled into Android come from `dist`

Current version values:

- `versionCode 1`
- `versionName "1.0"`

## One-time setup overview

1. Create a Google Play Console account.
2. Create the app entry there.
3. Create a release signing keystore and keep it safe.
4. Generate a signed release App Bundle (`.aab`).
5. Upload it to the `Internal testing` track.
6. Add your tester accounts.
7. Share the opt-in link with them.

## Daily Android preparation

Before opening Android Studio or building release artifacts:

```bash
npm run android:prepare
```

This does:

1. `npm run build`
2. `npx cap sync android`

If you want Android Studio right after that:

```bash
npm run android:open
```

## Release artifact commands

This repository includes helper commands for release artifacts:

```bash
npm run android:bundle:release
npm run android:apk:release
```

Notes:

- `android:bundle:release` is the relevant one for Play Store Internal Testing
- `android:apk:release` is useful for local release sanity checks
- for an uploadable Play Store release, you need proper release signing

## The artifact you want for Internal Testing

Use a signed Android App Bundle (`.aab`).

Expected output path after a release bundle build:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Signing

This repository does not store keystore passwords or release signing secrets.

That is intentional.

For Play Store Internal Testing you should:

1. create your own keystore
2. store it outside the repo or in a secure local path
3. keep the passwords safe
4. always sign future Android releases with the same key

Without the same release key, future updates cannot replace the installed app cleanly.

### Local signing file for this repo

This project now supports a local-only signing file at:

```text
android/keystore.properties
```

That file is ignored by git. Start from:

```text
android/keystore.properties.example
```

Expected keys:

```properties
storeFile=/absolute/path/to/your-release-keystore.jks
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

Notes:

- `storeFile` should be an absolute path on your machine
- do not commit `android/keystore.properties`
- do not commit the keystore itself into the repo
- once this file exists, the release scripts can build signed artifacts from the command line

### Create a release keystore

If you do not already have a release keystore, you can create one with `keytool`:

```bash
keytool -genkeypair \
	-v \
	-keystore "$HOME/.android/familyplanner-release.jks" \
	-alias familyplanner \
	-keyalg RSA \
	-keysize 2048 \
	-validity 10000
```

Then create `android/keystore.properties` and point `storeFile` to that keystore path.

## Versioning rules

Every Android update uploaded to Play must have a higher `versionCode` than the previous one.

File:

- [android/app/build.gradle](/home/kubi/Documents/FamilyPlanner/android/app/build.gradle)

Example:

- first internal test release: `versionCode 1`, `versionName "1.0"`
- second internal test release: `versionCode 2`, `versionName "1.1"`
- third internal test release: `versionCode 3`, `versionName "1.2"`

## First internal testing release

Suggested first run:

1. Verify tests:

```bash
npm run test:unit && npm run test:e2e
```

2. Prepare Android assets:

```bash
npm run android:prepare
```

If Gradle says the Android SDK location is missing, open Android Studio once and let it install/configure the SDK, or create:

```text
android/local.properties
```

with:

```properties
sdk.dir=/absolute/path/to/your/Android/Sdk
```

3. Open Android Studio:

```bash
npm run android:open
```

4. In Android Studio, generate a signed App Bundle.

Recommended menu path:

```text
Build -> Generate Signed Bundle / APK -> Android App Bundle
```

5. Use your release keystore.
6. Build the signed `.aab`.
7. Upload it in Google Play Console to the `Internal testing` track.
8. Add the two tester Google accounts.
9. Share the tester opt-in link.

### Optional command-line release build

Once both of these local files exist:

- `android/local.properties`
- `android/keystore.properties`

you can also build the Play artifact from the terminal:

```bash
npm run android:bundle:release
```

Expected output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Later updates

For every Android app update:

1. Make your code changes.
2. Push to `main` as usual for the web app.
3. Run:

```bash
npm run test:unit && npm run test:e2e
```

4. Increase `versionCode` in [android/app/build.gradle](/home/kubi/Documents/FamilyPlanner/android/app/build.gradle).
5. Optionally update `versionName`.
6. Generate a new signed `.aab`.
7. Upload it to Play Console Internal testing.
8. Testers receive the new version through Play.

## What testers need

Your testers need:

- a Google account that you add to Internal testing
- the opt-in link from Play Console
- Play Store access on their Android phone

Once they opt in, they can install and update the app through Play like a normal private test app.

## Recommended workflow for this project now

Preferred route:

1. Keep Cloudflare for web production.
2. Use Play Store Internal Testing for Android.
3. Only move to a public store track if you later want open distribution.

## Comparison to direct APK sharing

Direct APK sharing is still possible and documented in [ANDROID_PRIVATE_DISTRIBUTION.md](/home/kubi/Documents/FamilyPlanner/ANDROID_PRIVATE_DISTRIBUTION.md).

Internal testing is usually better if:

- you already know the app will be used repeatedly
- you want easier updates
- you want the second person to install from Play instead of sideloading files

## Notes

- If `android/capacitor-cordova-android-plugins/cordova.variables.gradle` is missing, run `npx cap sync android` again.
- Generated Android outputs under `android/app/build/` only update after a fresh build.
- The provided release scripts can prepare and build release artifacts, but signing setup still has to be provided on your machine or via Android Studio.