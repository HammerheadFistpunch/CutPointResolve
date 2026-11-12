$dest = Join-Path $env:ProgramData 'Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.cutpoint.resolve'
if (Test-Path $dest) {
  Remove-Item $dest -Recurse -Force
  Write-Host "Removed $dest. Restart Resolve Studio."
} else { Write-Host 'Plugin not installed.' }