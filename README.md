# Cutpoint → Resolve (v0.1 developer preview)

A free, general-purpose **DaVinci Resolve Studio Workflow Integration** that builds a source-native selects timeline from Cutpoint `highlights.json` files. It never re-encodes the source footage.

## Required upstream analyzer: Cutpoint

**[Cutpoint](https://pypi.org/project/cutpoint/)** is the required upstream application for generating the `highlights.json` analysis that CutPointResolve imports. Source code, releases, issues and official installation instructions: **[FerventOrange/cutpoint on GitHub](https://github.com/FerventOrange/cutpoint)**.

Install and run Cutpoint to analyze the original footage first; then select its completed analysis folder in this importer. You **do not** need to export or re-encode clips in Cutpoint. Cutpoint does not need to be running when you import previously generated JSON; this plugin does not automatically install or invoke Cutpoint. Ollama is optional for Cutpoint's vision analysis.

## Features

- Recursively discovers Cutpoint `highlights.json` in one analysis root.
- Recursively indexes original media, with relocation by filename **only when unambiguous**.
- Dry-run preview: counts, example ranges, missing media, timestamp uncertainty.
- Imports original files into Resolve, mirroring source-folder hierarchy as Media Pool bins.
- Creates a **new**, date-stamped timeline (never overwrites an edited one).
- Adds every selected In/Out as an independent clip, including multiple selections from one recording.
- Adds clip markers containing labels, scores, feature signals, and traceability fields.
- Orders clips by embedded capture timestamp + source In, source order, or rank.
- No Cutpoint export, cloud service, transcode, or paid API required.

## Install (Windows, Resolve Studio)

1. Open Resolve Studio, and use **Help → Documentation → Developer → Workflow Integrations** to ensure the official developer samples are installed on this machine.
2. Extract this ZIP, preserving folders.
3. Exit Resolve.
4. Open PowerShell **as Administrator**, change into the extracted folder, and run `powershell -ExecutionPolicy Bypass -File .\install.ps1`.
5. The installer checks for FFprobe and automatically installs FFmpeg Essentials using Windows Package Manager (WinGet) only if missing. It also looks for Blackmagic's **version-matched** `WorkflowIntegration.node` under the installed Resolve SDK, copies it into the plugin, and leaves your media untouched. If it cannot find the module it **stops safely**; see the printed SDK path and locate the official module.
6. Restart Resolve Studio, open an existing project, and choose **Workspace → Workflow Integrations → Cutpoint Importer**.
7. Select the media root and Cutpoint analysis folder, **Scan**, review warnings, then **Import to Resolve**.

You can opt out of automatic dependency installation with `install.ps1 -NoAutoInstall` (installation then stops if FFprobe is missing). Neither Cutpoint nor Ollama must be installed on the Resolve machine to import previously analyzed JSON. The installer never installs Resolve Studio or proprietary Blackmagic SDK components.

If the plugin does not appear in the menu, confirm the folder contains `manifest.xml`, `main.js`, `package.json`, and `WorkflowIntegration.node`, and that your SDK module matches Resolve Studio's version. The plugin installation location is `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.cutpoint.resolve`.

### Requirements

- DaVinci Resolve **Studio** with Workflow Integrations support.
- Blackmagic-supplied `WorkflowIntegration.node` for **your installed Resolve version** (not redistributed here).
- FFprobe for accurate embedded creation dates and source rates. The installer checks for it, installs FFmpeg Essentials using WinGet if needed, and records its executable path for Resolve. WinGet or a manual FFprobe install is required if automatic setup is unavailable.
- Original media available at the original paths or by unambiguous filename under the selected media root.

## Important v0.1 limitations

- This is a **developer preview tested with mocked Resolve API objects, not a live Resolve Studio installation**. Check the result using one short project first.
- A video file's `creation_time` is not always its actual capture start. Camera clocks, timezone conventions, VFR recordings, file copies and metadata edits can create wrong chronological ordering. The UI indicates timestamp sources but cannot currently adjust offsets.
- FPS conversion uses an ffprobe stream rate and rounded frame boundaries. Check frame accuracy for variable-frame-rate screen/phone recordings and mixed-frame-rate timelines.
- `AppendToTimeline` ranges currently use the file frame rate; unusual multi-stream or timecode files require validation in Resolve.
- Timeline markers are applied to clips, but marker display and API behavior may vary across Resolve versions.
- Source folders are mirrored in bins; no native compound/multicam grouping or synchronized angles yet.
- Reimport creates a new timeline. Media de-duplication relies on the Media Pool's `File Path` property.
- All media is imported by default; disable that option to import only referenced selections.
- Unexpected failures while appending selections may leave a partial new timeline. Original sources remain untouched.
- No one-click timeline B/highlights yet; ranked mode provides an alternative complete selects order.

## Development

Run `node --test tests/core.test.js` for mock-data tests. The core is intentionally separate from the Electron UI so other analysis providers and outputs can be added later.

## Uninstall

Close Resolve, then run `powershell -ExecutionPolicy Bypass -File .\uninstall.ps1` from an elevated prompt. This removes only this plugin, not source media, Resolve projects, or Cutpoint analysis.

## Documentation

- [Detailed Windows installation](docs/INSTALLATION.md)
- [Support and troubleshooting](docs/SUPPORT.md)
- [Developer guide and supported data contract](docs/DEVELOPMENT.md)

Report reproducible bugs via [GitHub Issues](https://github.com/HammerheadFistpunch/CutPointResolve/issues). **v0.1 has not been validated in a live Resolve Studio instance**; use a new test project for the first import.