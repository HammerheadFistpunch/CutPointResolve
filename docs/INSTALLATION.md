# Windows installation — Cutpoint → Resolve

This document applies to **v0.1 developer preview**. The integration has automated mock-API tests but has **not yet been verified inside a live Resolve Studio installation**.

## Required Cutpoint setup

- **Cutpoint (upstream dependency for analysis):** [Official Cutpoint project / releases on PyPI](https://pypi.org/project/cutpoint/) · [Official GitHub repository and installation instructions](https://github.com/FerventOrange/cutpoint).
- Install Cutpoint separately, analyze your footage, and retain the resulting `highlights.json` files. There is **no Cutpoint export step** required for this Resolve plugin.
- Cutpoint need not be running, or even installed on the Resolve machine, **if** a completed Cutpoint analysis folder is available from another machine. The plugin installer does not install or upgrade Cutpoint.
- Ollama is optional for Cutpoint's vision features, not a dependency of this importer.

## Requirements

- Windows 10/11 and DaVinci Resolve **Studio** with Workflow Integrations support.
- A valid, currently open Resolve project for importing.
- The **official** `WorkflowIntegration.node` included with the Developer / Workflow Integrations example for your exact Resolve version. This binary is proprietary and **not** distributed in this repository.
- The original media files on an accessible drive. No separate Cutpoint export is necessary; select a folder containing its `highlights.json` output.
- FFprobe is required for reliable timestamp/frame-rate extraction. The installer detects it and, if missing, installs Gyan FFmpeg Essentials (including FFprobe) through WinGet. If WinGet is unavailable or installation fails, the installer stops with instructions. It saves `CUTPOINT_RESOLVE_FFPROBE` as a per-user environment variable for use by Resolve.

Cutpoint and Ollama do **not** need to be running while importing an already-completed analysis.

## Installation

1. Download the repository ZIP (GitHub **Code → Download ZIP**) or clone the repository. Extract to a persistent working directory.
2. Open DaVinci Resolve Studio. Find the installed Developer documentation at **Help → Documentation → Developer → Workflow Integrations**. Locate the `WorkflowIntegration.node` module in Blackmagic's supplied examples; the exact location can vary by Resolve version. Close Resolve before installation.
3. In an **Administrator** PowerShell, change to the extracted repository root (the directory containing `install.ps1`).
4. Execute:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```

5. The installer checks FFprobe, installing it through WinGet only when missing, then finds the official SDK module. The installer does not install Cutpoint, Ollama, Node.js, or Resolve Studio. The plugin uses Resolve's Electron runtime, so Node.js is only needed for optional local tests. To prevent automatic installation, run `powershell -ExecutionPolicy Bypass -File .\install.ps1 -NoAutoInstall`; if FFprobe is absent this deliberately stops.
6. The installer checks known locations and the installed SDK tree for the official SDK module. If it cannot find the file it stops **without installing the plugin**. Locate it using Blackmagic's Developer documentation; do not download unknown `.node` binaries from third-party sites. The target plugin directory is:

   ```text
   C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\com.cutpoint.resolve
   ```

7. Restart Resolve Studio. Open a project, then choose **Workspace → Workflow Integrations → Cutpoint Importer**.

The plugin is a Resolve-managed Electron workflow integration, not a permanently docked Edit-page panel. It does not require an npm install as shipped.

## First import (safe small-scale test)

1. **Back up your Resolve project or work in a new empty test project.** The importer adds a timeline and Media Pool items; it does not modify original video files.
2. In the plugin, select **Media root** (the root of the nested folders containing source files).
3. Select **Cutpoint analysis root** (a Cutpoint output/project directory containing one or more `highlights.json` files, searched recursively).
4. Choose timeline ordering: chronological capture time (default), source order, or score ranking.
5. Choose whether to mirror the media subfolders as Resolve bins, import all indexed media (or only used sources), and add clip markers.
6. Click **Scan**. Read missing-media warnings and timestamp caveats. Import is blocked if a referenced source cannot be located unambiguously.
7. Click **Import to Resolve**. The plugin creates a **new timestamped selects timeline** containing every valid Cutpoint selection, with distinct clips for repeated source-file ranges.
8. Inspect the generated timeline, source audio and clip markers. Check synchronization, cut points, and chronology before editing.

## Folder example

```text
D:\Projects\Example\
  Cameras\GoPro\GH015414.MP4
  Cameras\Phone\clip001.mov
  Audio\field.wav

S:\Cutpoint\projects\Example\
  highlights.json
  events.json
```

The analysis and media roots may be on different drives. Existing Cutpoint source paths are used first; if missing, a filename-only lookup is attempted **only if exactly one matching file exists under the media root**.

## Updates / uninstall

- To update, close Resolve and rerun `install.ps1` from the desired version of the repository. Keep a backup of any local edits to installed plugin files; the installer overwrites them.
- To uninstall, close Resolve, open **Administrator** PowerShell in the repository root, and run:

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
  ```

- Uninstall deletes the plugin directory only. It does not remove Resolve timelines, imported Media Pool clips, Cutpoint analyses, or source media.

## Notes on portability

The plugin uses **original media paths** in Resolve and does **not** render or transcode clips. Keep the media online; if you move it later, relink it in Resolve. If Cutpoint is rerun, rescan and import again; v0.1 intentionally creates a new timeline instead of updating an existing edited timeline.

## Dependency management

- **Resolve Studio:** Must be installed and licensed separately; this installer will not download or change Resolve.
- **Official WorkflowIntegration.node:** Proprietary SDK component supplied with the installed Resolve version. If not found, the installer stops before making changes; obtain the SDK through Blackmagic documentation.
- **FFprobe:** Used for source frame rate and recording timestamps. Existing working installations are reused, otherwise the installer attempts `winget install --id Gyan.FFmpeg.Essentials --exact --silent --accept-source-agreements --accept-package-agreements`. It validates `ffprobe -version` and saves an explicit path as the user environment variable `CUTPOINT_RESOLVE_FFPROBE`. Restart Resolve after installation.
- **Node.js:** Not required for normal plugin runtime; optional only for `node --test`.
- **Cutpoint/Ollama:** Not needed for import if analysis JSON already exists.

The installer does not silently downgrade or upgrade existing installations. No dependency is removed by the uninstaller. FFmpeg is third-party software distributed under its own license.