# Starts the Firestore + Auth emulators with the portable Java 17 in tools/java (no install, no admin rights).
$root = Split-Path -Parent $PSScriptRoot
$jdk = Get-ChildItem (Join-Path $PSScriptRoot 'java') -Directory | Where-Object Name -like 'jdk-17*' | Select-Object -First 1
if (-not $jdk) { Write-Error 'Portable Java 17 not found in tools/java'; exit 1 }
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$($jdk.FullName)\bin;$env:Path"
Set-Location $root
# firebase-tools 13 accepts Java 17; newer releases require Java 21.
npx -y firebase-tools@13.35.1 emulators:start --only firestore,auth --project demo-church-volunteers
