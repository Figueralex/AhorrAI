$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Realizando limpieza profunda..."
Remove-Item -Path "android" -Recurse -Force
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path ".expo" -Recurse -Force
Remove-Item -Path "package-lock.json" -Force

$ErrorActionPreference = 'Continue'
Write-Host "Instalando dependencias desde cero (npm install)..."
npm install

Write-Host "Iniciando proceso de firmado y compilación oficial con EAS Local..."
# Si eas pide confirmar la creación de credenciales, el usuario lo vera e interactuará aquí.
cmd /c npx eas build --platform android --local --profile production
