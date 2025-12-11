# Script to clear EAS CLI temporary files
# Run this script as Administrator if needed

Write-Host "Clearing EAS CLI temporary files..." -ForegroundColor Yellow

$tempPath = "$env:LOCALAPPDATA\Temp\eas-cli-nodejs"
$altTempPath = "$env:TEMP\eas-cli-nodejs"

# Close any running Node/EAS processes
Write-Host "Checking for running processes..." -ForegroundColor Cyan
Get-Process | Where-Object {
    $_.ProcessName -like "*node*" -or 
    $_.ProcessName -like "*eas*"
} | ForEach-Object {
    Write-Host "Stopping process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Remove EAS CLI temp directories
if (Test-Path $tempPath) {
    Write-Host "Removing: $tempPath" -ForegroundColor Cyan
    try {
        Remove-Item -Recurse -Force $tempPath -ErrorAction Stop
        Write-Host "✓ Successfully removed EAS CLI temp folder" -ForegroundColor Green
    } catch {
        Write-Host "✗ Error removing folder: $_" -ForegroundColor Red
        Write-Host "Try running PowerShell as Administrator" -ForegroundColor Yellow
    }
} else {
    Write-Host "EAS CLI temp folder not found (already clean)" -ForegroundColor Green
}

if (Test-Path $altTempPath) {
    Write-Host "Removing: $altTempPath" -ForegroundColor Cyan
    try {
        Remove-Item -Recurse -Force $altTempPath -ErrorAction Stop
        Write-Host "✓ Successfully removed alternate temp folder" -ForegroundColor Green
    } catch {
        Write-Host "✗ Error removing folder: $_" -ForegroundColor Red
    }
}

Write-Host "`nDone! Try running 'pnpm build:android' again." -ForegroundColor Green

