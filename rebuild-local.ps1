$ErrorActionPreference = 'SilentlyContinue'

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

Write-Host "Compilando nueva APK nativa..."
Set-Location android
.\gradlew assembleRelease
