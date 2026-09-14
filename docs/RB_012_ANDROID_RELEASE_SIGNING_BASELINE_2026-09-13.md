# RB-012 — Android release signing baseline (2026-09-13)

The Android project defines a `release` build type but no `signingConfigs` or protected keystore reference in `android/app/build.gradle`. The debug artifact was previously built and installed for engineering verification; it is not a production distribution artifact.

An unsigned release build attempt after `npm run build` and `npx cap sync android` was blocked by the local Gradle runtime: `java.io.IOException: Unable to establish loopback connection` (Java 21 / Gradle 8.14.3). No APK was installed and no signing material was accessed or created.

Production signing identity, keystore custody/recovery, versioning, release artifact digest, store declarations and rollout/rollback record remain unassigned. RB-012 is **In Progress** pending a Release/Security owner and protected signing setup.

## 2026-09-14 verification

The release variant was rechecked without creating or reading any production signing material:

| Check | Result |
| --- | --- |
| Gradle/Android toolchain | Gradle 8.14.3, Android Gradle Plugin 8.13.0, OpenJDK 21.0.12.1; `:app:signingReport` completed successfully |
| Release signing report | `Variant: release`, `Config: null`, `Store: null`, `Alias: null` |
| Release APK build | `:app:assembleRelease --no-daemon` **PASS** (1m 22s, 446 actionable tasks); output is `app-release-unsigned.apk` |
| Release APK SHA-256 | `79052A7280D9E70C9BB7FA941C6738AD46DE9F7A450397920FA5BE8C0D146018` |
| Signature verification | Android Build Tools 36 `apksigner verify --verbose` **FAIL AS EXPECTED**: missing `META-INF/MANIFEST.MF` |
| Repository keystore search | No project `.jks`, `.keystore` or `.p12` file found outside generated/dependency directories |

This confirms that the local release build path is reproducible, but it is intentionally unsigned and cannot be installed as a production upgrade or uploaded to Google Play. The debug APK remains the only signed engineering artifact. A protected signing configuration, owner/custody decision, version policy and release artifact record are still required before distribution.
