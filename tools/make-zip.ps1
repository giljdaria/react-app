$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$zip = Join-Path $root "ai-feedback-analyzer.zip"

if (Test-Path $zip) {
  Remove-Item $zip -Force
}

$exclude = @("node_modules", "dist", ".wrangler", ".git", "ai-feedback-analyzer.zip")
$items = Get-ChildItem -LiteralPath $root -Force | Where-Object { $exclude -notcontains $_.Name }

Compress-Archive -Path $items.FullName -DestinationPath $zip -Force

Write-Host "Created $zip"
Get-Item $zip | Format-List Name, Length, LastWriteTime, FullName

