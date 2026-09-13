# RB-012 — Android release signing baseline (2026-09-13)

The Android project defines a `release` build type but no `signingConfigs` or protected keystore reference in `android/app/build.gradle`. The debug artifact was previously built and installed for engineering verification; it is not a production distribution artifact.

An unsigned release build attempt after `npm run build` and `npx cap sync android` was blocked by the local Gradle runtime: `java.io.IOException: Unable to establish loopback connection` (Java 21 / Gradle 8.14.3). No APK was installed and no signing material was accessed or created.

Production signing identity, keystore custody/recovery, versioning, release artifact digest, store declarations and rollout/rollback record remain unassigned. RB-012 is **In Progress** pending a Release/Security owner and protected signing setup.
