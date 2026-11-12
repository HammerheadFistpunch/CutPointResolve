# Installs Cutpoint -> Resolve and missing open-source runtime dependencies.
# Run in elevated PowerShell if writing to ProgramData requires administrator privileges.
param([switch]$NoAutoInstall)
$ErrorActionPreference = 'Stop'
$pluginName = 'com.cutpoint.resolve'
$src = Join-Path $PSScriptRoot "plugin\$pluginName"
$destRoot = Join-Path $env:ProgramData 'Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins'
$dest = Join-Path $destRoot $pluginName
$sdkRoot = Join-Path $env:ProgramData 'Blackmagic Design\DaVinci Resolve\Support\Developer\Workflow Integrations'

function Find-FFprobe {
    $cmd = Get-Command ffprobe.exe -ErrorAction SilentlyContinue
    if ($cmd -and (Test-Path $cmd.Source)) { return $cmd.Source }
    $configured = [Environment]::GetEnvironmentVariable('CUTPOINT_RESOLVE_FFPROBE', 'User')
    if ($configured -and (Test-Path $configured)) { return $configured }
    $searchRoots = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'),
        (Join-Path $env:ProgramFiles 'ffmpeg'),
        (Join-Path $env:ProgramFiles 'FFmpeg'),
        (Join-Path $env:ProgramData 'chocolatey\bin')
    )
    foreach ($folder in $searchRoots) {
        if (-not (Test-Path $folder)) { continue }
        $match = Get-ChildItem -Path $folder -Filter 'ffprobe.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) { return $match.FullName }
    }
    return $null
}

function Find-SdkNode {
    $possible = @(
        (Join-Path $sdkRoot 'Examples\SamplePlugin\WorkflowIntegration.node'),
        (Join-Path $sdkRoot 'Examples\CompatibleSamplePlugin\WorkflowIntegration.node'),
        (Join-Path ${env:ProgramFiles} 'Blackmagic Design\DaVinci Resolve\Developer\Workflow Integrations\Examples\SamplePlugin\WorkflowIntegration.node')
    )
    $sdkNode = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $sdkNode -and (Test-Path $sdkRoot)) {
        $sdkNode = Get-ChildItem -Path $sdkRoot -Filter 'WorkflowIntegration.node' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    }
    return $sdkNode
}

if (-not (Test-Path $src)) { throw "Plugin source directory missing: $src" }
$sdkNode = Find-SdkNode
if (-not $sdkNode) {
    throw "Blackmagic's version-matched WorkflowIntegration.node was not found. Install/extract the official Resolve Studio Workflow Integrations SDK using Help > Documentation > Developer > Workflow Integrations, then rerun. Never download this binary from an unofficial source."
}

Write-Host 'Checking FFprobe dependency...'
$ffprobe = Find-FFprobe
if (-not $ffprobe) {
    if ($NoAutoInstall) { throw 'FFprobe is missing. Remove -NoAutoInstall to install with WinGet, or install FFmpeg manually.' }
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw 'FFprobe missing and WinGet is unavailable. Install Microsoft App Installer / winget, or install official FFmpeg Essentials manually, then rerun.'
    }
    Write-Host 'Installing FFmpeg Essentials (includes FFprobe) using WinGet...'
    & winget.exe install --id Gyan.FFmpeg.Essentials --exact --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "WinGet failed (exit code $LASTEXITCODE). Install FFmpeg Essentials manually, then rerun." }
    $ffprobe = Find-FFprobe
    if (-not $ffprobe) { throw 'WinGet completed but FFprobe was not located. Open a new PowerShell session or check the FFmpeg install path, then rerun.' }
}
& $ffprobe -version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "FFprobe exists but does not run: $ffprobe" }

# Store an explicit path so Resolve can find FFprobe even if launched with a stale PATH.
[Environment]::SetEnvironmentVariable('CUTPOINT_RESOLVE_FFPROBE', $ffprobe, 'User')
Write-Host "FFprobe ready: $ffprobe" -ForegroundColor Green

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force
Copy-Item -Path $sdkNode -Destination (Join-Path $dest 'WorkflowIntegration.node') -Force
Write-Host "Installed $pluginName to $dest" -ForegroundColor Green
Write-Host 'Restart Resolve Studio (required to pick up plugin and FFprobe location).'
Write-Host 'Open a project, then Workspace > Workflow Integrations > Cutpoint Importer.'