# Android Private Distribution

This project is already prepared for Capacitor Android builds. The current goal is private use on two Android devices without publishing to the Play Store.

## What this means

- The website and the Android app are released separately.
- A push to `main` still deploys the web version through Cloudflare.
- The Android app only changes when you build a new Android package and install it on the phones.
- For private use, you do not need the Play Store.

## Recommended path right now

Use direct APK distribution.

- Build the app locally.
- Install it on your own phone.
- Send the APK to the second person.
- Repeat that process for later updates.

This keeps the app private. Nobody else can download it unless you give them the APK file.

## One-time requirements

1. Node.js and npm installed.
2. Android Studio installed.
3. Android SDK available through Android Studio.
4. For direct installation from your computer: USB debugging enabled on the Android phone.
5. For manual APK installation: the phone must allow installing apps from that source.

## Important project facts

- Capacitor config: [capacitor.config.ts](/home/kubi/Documents/FamilyPlanner/capacitor.config.ts)
- Android app id: `com.familyplanner.app`
- Android version fields: [android/app/build.gradle](/home/kubi/Documents/FamilyPlanner/android/app/build.gradle)
- Web assets are bundled from `dist`

Current Android version values:

- `versionCode 1`
- `versionName "1.0"`

## Daily development flow

When you want to test the latest code in Android Studio:

```bash
npm run android:open
```

This does three things:

1. builds the web app
2. syncs the Android Capacitor project
3. opens the Android project in Android Studio

## Build only and sync only

If you only want to prepare the Android project without opening Android Studio:

```bash
npm run android:prepare
```

Use this after frontend changes when you want the native Android project to contain the latest web build.

## Fast private APK build

To create a debug APK for direct installation:

```bash
npm run android:apk:debug
```

Output path:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

This is the easiest way to get a private installable APK for your two devices.

## Install directly to a connected phone

If your Android phone is connected via USB and USB debugging is enabled:

```bash
npm run android:install:debug
```

This will build the latest debug APK and install it to the connected device through Gradle/ADB.

## How to share the app with the second person

Option 1: send the APK file.

- Build with `npm run android:apk:debug`
- Send `android/app/build/outputs/apk/debug/app-debug.apk`
- The other person opens the APK on their phone and installs it

Option 2: install it directly from your machine if their phone is connected and allowed for USB debugging.

## How updates work later

Your current web deployment flow stays the same for the browser version:

```text
push to main -> Cloudflare deploys web production
```

Android is separate:

```text
change code -> test -> build -> sync -> create APK -> install/send APK
```

For every Android update, do this:

1. Push or merge your changes as usual.
2. Run tests:

```bash
npm run test:unit && npm run test:e2e
```

3. Build a new APK:

```bash
npm run android:apk:debug
```

4. Install it on your device and send it to the second person.

## Versioning rule for updates

If you want Android to update cleanly over an already installed build, keep these stable:

- same `applicationId`
- same signing key

And increase at least:

- `versionCode`

File:

- [android/app/build.gradle](/home/kubi/Documents/FamilyPlanner/android/app/build.gradle)

Example progression:

- first build: `versionCode 1`
- second update: `versionCode 2`
- third update: `versionCode 3`

`versionName` is the user-facing label and can be something like `1.0`, `1.1`, `1.2`.

## Debug APK vs signed release APK

For now, debug APK is fine for private testing on two devices.

Later, for a more stable update path, you should create your own signing keystore and build signed release APKs. That matters because:

- release signing is the proper long-term setup
- updates must be signed with the same key
- if you ever move to Play Store later, keeping control over your release key is important

## Recommended practical workflow right now

For local development:

```bash
npm run android:open
```

For a private installable build:

```bash
npm run android:apk:debug
```

For direct installation on your connected phone:

```bash
npm run android:install:debug
```

## Publishing summary

Current web publishing:

- push to `main`
- Cloudflare deploys automatically

Current Android publishing for private use:

- create APK locally
- install on your own device
- send APK to the second person

No Play Store is involved.

## When to change this approach

Stay on direct APK distribution while:

- only two people use the app
- manual updates are acceptable
- you do not want public visibility

Consider a different setup later if:

- you want automatic app updates
- you want more testers
- you want easier release management

At that point, the next step would usually be either:

1. Play Store internal testing
2. a Capacitor live-update solution for web assets

## Notes

- If `android/capacitor-cordova-android-plugins/cordova.variables.gradle` is missing, run `npx cap sync android` again.
- Generated Android build output under `android/app/build/` can lag behind source changes until you rebuild.