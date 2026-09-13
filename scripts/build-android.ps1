param([switch]$SkipWebSync)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$jdkRoots = @(
  $env:JAVA_HOME,
  "C:\Program Files\Eclipse Adoptium"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

$jdk = $jdkRoots |
  ForEach-Object {
    if (Test-Path -LiteralPath (Join-Path $_ "bin\java.exe")) { Get-Item -LiteralPath $_ }
    else { Get-ChildItem -LiteralPath $_ -Directory -ErrorAction SilentlyContinue | Where-Object Name -Like "jdk-21*" }
  } |
  Where-Object Name -Like "*21*" |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $jdk) {
  throw "JDK 21 is required. Install EclipseAdoptium.Temurin.21.JDK before building Android."
}

$shortTemp = Join-Path $env:SystemDrive "jtmp"
New-Item -ItemType Directory -Path $shortTemp -Force | Out-Null
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$($jdk.FullName)\bin;$env:Path"
$env:TEMP = $shortTemp
$env:TMP = $shortTemp

Push-Location $projectRoot
try {
  if (-not $SkipWebSync) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Web build failed." }
    npx patch-package --check
    if ($LASTEXITCODE -ne 0) { throw "Native biometric patch check failed." }
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed." }
  }

  Push-Location (Join-Path $projectRoot "android")
  try {
    .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Android build failed." }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

$apk = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path -LiteralPath $apk)) { throw "Android build completed without the expected APK." }
Write-Output $apk
