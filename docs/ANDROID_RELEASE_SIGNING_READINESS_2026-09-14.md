# Android release signing readiness — 2026-09-14

## Decision

**NO-GO for production distribution.** Nexus can assemble the Android `release` variant, but it has no production signing configuration or protected keystore. The generated artifact is unsigned and is suitable only for inspecting build output.

## Evidence

- `android/app/build.gradle` defines `release` but no `signingConfigs` block or protected keystore reference.
- `:app:signingReport` reports `Config: null`, `Store: null`, and `Alias: null` for release.
- `:app:assembleRelease --no-daemon` passes with Gradle 8.14.3 / AGP 8.13.0 / OpenJDK 21.0.12.1.
- Output: `android/app/build/outputs/apk/release/app-release-unsigned.apk` (16,578,205 bytes), SHA-256 `79052A7280D9E70C9BB7FA941C6738AD46DE9F7A450397920FA5BE8C0D146018`.
- Build Tools 36 `apksigner verify --verbose` reports missing `META-INF/MANIFEST.MF`, confirming that the APK has no usable signature.
- No project `.jks`, `.keystore`, or `.p12` file was found outside generated/dependency directories. No key was created, exported, or inspected.

## Required before release

1. Assign a release/security owner and choose protected custody (for example, a CI secret store or a controlled local vault).
2. Create or import the production keystore outside the repository; keep passwords and files out of chat, source control, and build logs.
3. Wire the release signing configuration through protected environment/CI inputs and verify `signingReport`, `apksigner`, and Play App Signing enrollment.
4. Set a versionCode/versionName policy and record the signed AAB/APK digest, review result, rollout and rollback evidence.

RB-012 remains **In Progress**. This review does not authorize public, paid, or real-data distribution.
