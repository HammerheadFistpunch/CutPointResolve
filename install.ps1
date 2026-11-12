# Install a version-matched WorkflowIntegration.node from the locally installed Resolve SDK.
# Run from an elevated PowerShell terminal if ProgramData requires administrator privileges.
$ErrorActionPreference = 'Stop'
$pluginName = 'com.cutpoint.resolve'
$src = Join-Path $PSScriptRoot "plugin\$pluginName"
$destRoot = Join-Path $env:ProgramData 'Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins'
$dest = Join-Path $destRoot $pluginName
$sdkRoot = Join-Path $env:ProgramData 'Blackmagic Design\DaVinci Resolve\Support\Developer\Workflow Integrations'
$possible = @(
    (Join-Path $sdkRoot 'Examples\SamplePlugin\WorkflowIntegration.node'),
    (Join-Path $sdkRoot 'Examples\CompatibleSamplePlugin\WorkflowIntegration.node'),
    (Join-Path ${env:ProgramFiles} 'Blackmagic Design\DaVinci Resolve\Developer\Workflow Integrations\Examples\SamplePlugin\WorkflowIntegration.node')
)
$sdkNode = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sdkNode) {
    Write-Host 'Could not find WorkflowIntegration.node.' -ForegroundColor Yellow
    Write-Host 'In Resolve: Help > Documentation > Developer > Workflow Integrations.'
    Write-Host 'Locate Examples\SamplePlugin\WorkflowIntegration.node and copy it alongside the plugin files.'
    Write-Host 'Common SDK base:' $sdkRoot
    throw 'Installation stopped: compatible Resolve Workflow Integration SDK is required.'
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force
Copy-Item -Path $sdkNode -Destination (Join-Path $dest 'WorkflowIntegration.node') -Force
Write-Host "Installed $pluginName to $dest" -ForegroundColor Green
Write-Host 'Restart Resolve Studio, open a project, then Workspace > Workflow Integrations > Cutpoint Importer.'