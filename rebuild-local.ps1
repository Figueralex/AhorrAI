$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Cerrando procesos de Java para evitar conflictos (EBUSY)..."
Stop-Process -Name java -Force

Write-Host "Realizando limpieza profunda..."
Remove-Item -Path "android" -Recurse -Force
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path ".expo" -Recurse -Force
Remove-Item -Path "package-lock.json" -Force

$ErrorActionPreference = 'Continue'
Write-Host "Instalando dependencias desde cero (npm install)..."
npm install

Write-Host "Regenerando rutas nativas de Expo..."
npx expo prebuild -p android --clean

Write-Host "Verificando y configurando rutas del SDK..."
$env:ANDROID_HOME="C:\Users\noctu\AppData\Local\Android\Sdk"
Set-Content -Path "android\local.properties" -Value "sdk.dir=C\:/Users/noctu/AppData/Local/Android/Sdk" -Force -Encoding UTF8

Write-Host "Inyectando certificado de Release (ahorrai.keystore)..."
Copy-Item "ahorrai.keystore" -Destination "android\app\ahorrai.keystore" -Force

Write-Host "Configurando Gradle para usar el Keystore..."
$buildGradlePath = "android\app\build.gradle"
$buildGradle = Get-Content $buildGradlePath -Raw
$newSigningConfig = "    signingConfigs {`r`n        debug {`r`n            storeFile file('debug.keystore')`r`n            storePassword 'android'`r`n            keyAlias 'androiddebugkey'`r`n            keyPassword 'android'`r`n        }`r`n        release {`r`n            storeFile file('ahorrai.keystore')`r`n            storePassword 'ahorrai123'`r`n            keyAlias 'ahorraikey'`r`n            keyPassword 'ahorrai123'`r`n        }`r`n    }"
$buildGradle = $buildGradle -replace 'signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\}', $newSigningConfig
$buildGradle = $buildGradle -replace '(?s)(release\s*\{.*?)signingConfig signingConfigs\.debug', "`$1signingConfig signingConfigs.release"
[IO.File]::WriteAllText((Get-Item $buildGradlePath).FullName, $buildGradle)

Write-Host "Compilando nueva APK nativa oficial firmada..."
Set-Location android
.\gradlew assembleRelease
Set-Location ..
