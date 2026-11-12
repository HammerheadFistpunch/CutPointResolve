# Support and troubleshooting

## Status and scope

**v0.1 is a developer preview** with local Node unit tests using mock Resolve API objects. A live Resolve Studio compatibility test is still needed. The most useful bug reports include Resolve Studio version, Windows version, plugin version, selected import mode, sanitized console/log output, and a minimal `highlights.json` (without private media paths if preferred).

To request help or report bugs, create a GitHub Issue at: https://github.com/HammerheadFistpunch/CutPointResolve/issues

Do not post personal media, sensitive locations, personal transcripts, or proprietary camera files in a public issue.

## Plugin missing from Workspace → Workflow Integrations

1. Confirm you're using **Resolve Studio**, not the free edition.
2. Confirm the plugin folder is under `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.cutpoint.resolve`.
3. Confirm `manifest.xml`, `main.js`, `package.json`, and `WorkflowIntegration.node` exist in that folder.
4. Confirm `WorkflowIntegration.node` came from the installed **same-version Blackmagic SDK**.
5. Restart Resolve Studio and open a project. Check the menu again.

## Installation fails: WorkflowIntegration.node not found

The installer checks known locations only; Blackmagic's directory layout may vary. In Resolve, open **Help → Documentation → Developer → Workflow Integrations**, find the vendor-provided example `WorkflowIntegration.node`, and verify its version. This file is not in the repository by design. If the SDK places it elsewhere, manually copy the matching module into the installed plugin directory **after** installing the source files, or adjust the install script to point to the official location. Avoid random internet downloads.

## Scan fails / no highlights.json

- Pick a **directory**, not an individual JSON file.
- Confirm analysis completed and produced `highlights.json` with a `candidates` array.
- The plugin scans nested directories automatically.
- It reads candidate `start`, `end`, `source`, `score`, and optional descriptions; it does not require a Cutpoint MP4, FCPXML, or OTIO export.

## Missing or ambiguous source

- Confirm the media root contains the original source files.
- Paths from Cutpoint are used first. If a path is missing, relocation by filename is allowed only when exactly one match exists.
- Duplicated camera filenames (common with phones and action cameras) must be resolved by restoring source paths or renaming/organizing sources before analysis. The plugin intentionally refuses ambiguous guesses.
- Scan again after resolving paths.

## Clips in the wrong chronological order

- The current importer uses FFprobe's embedded `creation_time` (when available), plus candidate source In; fallback is the filesystem birth/modified time.
- Capture timezones may be missing or incorrect, particularly for phones, drone footage, screen recordings, and files transferred between systems.
- Use **Source order** temporarily if dates appear wrong. A per-camera timestamp correction UI is not implemented in v0.1.

## Clip boundaries or audio are wrong

- v0.1 rounds source seconds to frames using FFprobe's rate. Variable-frame-rate phone/screen captures and mixed rate projects require manual verification.
- Verify your Resolve timeline frame rate before import and review the initial selections.
- This importer does not create trimmed intermediate files: it only references existing source media.
- For a supported camera-specific issue, report the source codec, reported fps/timebase, and an example in/out point.

## Resolve import stalls or stops partway

- First try 1–2 short video files in a **new test project**.
- Confirm Resolve can manually import the same files.
- Make sure drive paths (including external/network drives) are accessible to Resolve.
- An exception midway through import can leave a partial timeline. v0.1 does not roll back the entire operation; remove that test timeline manually if needed.
- Do not rerun repeatedly against a production project without backing it up.

## Markers missing or notes not visible

- The plugin attempts to attach clip-level markers at the first frame of each selected item.
- Markers contain source range, label, score, and a JSON representation of available signals.
- The Resolve API or marker display behavior may vary by installed Resolve version. Verify that the generated clips were assembled correctly even if marker creation fails; marker warnings are surfaced in progress.

## Cutpoint errors (Whisper, GoPro GPMF telemetry, Ollama)

Those failures occur **upstream during Cutpoint analysis**. This plugin reads analysis JSON files and does not execute Cutpoint, Whisper, telemetry extraction, or Ollama. Resolve import can run after Cutpoint analysis completes. For Cutpoint-specific errors, see https://github.com/FerventOrange/cutpoint/issues.

## Development diagnostics

From the repository root, with Node.js 20+ installed:

```powershell
node --test tests/core.test.js
```

These tests validate parsing and simulated Resolve calls only; they do not prove compatibility with a particular real Resolve version. Submit an issue containing steps to reproduce and the exact error message.

## FFprobe installation and detection

The installer detects FFprobe on PATH, then the previously configured user `CUTPOINT_RESOLVE_FFPROBE`, then common Windows FFmpeg/WinGet folders. If it cannot find a working FFprobe, it attempts installation through WinGet. It fails with a clear message if WinGet is missing or cannot complete the install.

To verify after installation (open a **new** PowerShell window):

```powershell
$probe = [Environment]::GetEnvironmentVariable('CUTPOINT_RESOLVE_FFPROBE','User')
& $probe -version
```

If `winget` is unavailable, install Windows App Installer or obtain FFmpeg from a trusted publisher and rerun the plugin installer. The installer never installs unknown third-party binaries or downloads the proprietary Blackmagic SDK.

After installing, restart Resolve to inherit the configured FFprobe executable path. The plugin continues to use only completed Cutpoint analysis JSON; no Cutpoint or Ollama processes are required.