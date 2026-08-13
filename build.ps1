# build.ps1 — Build Next.js sans conflit OneDrive
# Arrête OneDrive le temps du build, puis le redémarre
# Usage: .\build.ps1

Write-Host "⏸  Pause de la synchronisation OneDrive..." -ForegroundColor Yellow
Stop-Process -Name "OneDrive" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Nettoyer l'ancien .next (jonction ou dossier)
if (Test-Path ".next") {
    $item = Get-Item ".next" -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -eq "Junction") {
        Remove-Item ".next" -Force
    } else {
        Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "▶  Lancement du build..." -ForegroundColor Cyan
npm run build
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "▶  Redémarrage de OneDrive..." -ForegroundColor Yellow
Start-Process "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"

if ($exitCode -eq 0) {
    Write-Host "✅ Build terminé avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour démarrer le serveur : npm start" -ForegroundColor White
} else {
    Write-Host "❌ Le build a échoué (code $exitCode)" -ForegroundColor Red
}

exit $exitCode
