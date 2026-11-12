# Developer guide

## Structure

```text
plugin/com.cutpoint.resolve/
  manifest.xml      Resolve Workflow Integration registration
  main.js           Electron main process and Resolve bridge
  preload.js        Narrow renderer IPC bridge
  renderer.js       User interface logic
  index.html        UI markup
  styles.css        UI styles
  core.js           Cutpoint analysis, media indexing and Resolve importer
install.ps1         Installs plugin and finds vendor-provided Resolve SDK module
uninstall.ps1       Removes installed plugin directory
tests/core.test.js  Mocked Resolve API tests
```

## Architectural boundaries

- Keep media/analysis parsing in `core.js` and avoid tying it to any particular footage subject or camera manufacturer.
- This is an **importer**, not a transcoder or a Cutpoint analysis engine.
- The Resolve Media Pool should reference original source files exactly once where possible. Every valid Cutpoint in/out becomes a separate timeline item.
- Repeated imports create a **new** timeline. Do not overwrite editorial changes in existing timelines.
- Keep source metadata and candidate scores in clip markers wherever Resolve supports them.

## Test

```powershell
node --test tests/core.test.js
node --check plugin/com.cutpoint.resolve/core.js
node --check plugin/com.cutpoint.resolve/main.js
node --check plugin/com.cutpoint.resolve/renderer.js
```

The tests mock Resolve API responses. For a release, also test against an actual Resolve Studio installation, including multiple selections from one source, mixed source rates, audio, and annotations.

## Analysis data contract

`selectFiles(mediaRoot, analysisRoot)` recursively finds files called `highlights.json`. Expected minimal form:

```json
{
  "sources": [{"path": "D:/Media/clip.mp4", "fps": 29.97}],
  "candidates": [
    {"id": "h001", "source": "D:/Media/clip.mp4", "start": 12.1, "end": 18.5, "score": 17.8, "vision_label": "Interview answer"}
  ]
}
```

The candidate start and end values are **seconds from the source beginning**. Optional scores, names, and signals are stored as annotation metadata. Other analyzers can use the same normalized intermediate shape in a future adapter.

## Resolve integration notes

`main.js` initializes the locally provided `WorkflowIntegration.node` for plugin ID `com.cutpoint.resolve`, then obtains the active project through Resolve's API. `core.js` creates Media Pool folders, imports source media, calls `CreateEmptyTimeline` and `AppendToTimeline` with explicit source-frame ranges, and adds clip markers through `AddMarker`.

Confirm methods and signatures against the **Developer / Scripting** documentation shipped with the installed Resolve version. Version-dependent API calls, file-rate conversions, and chronology fallbacks need production validation.

## Future development

Potential next steps: native metadata normalization (including GoPro, phone and camera timezone quirks), adjustable clock offsets, timeline update/diff mode, multi-cam alignment, second highlights timeline, other analysis adapters, and richer review UI. These are **not** implemented in v0.1.