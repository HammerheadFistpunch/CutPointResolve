'use strict';
const $=(id)=>document.getElementById(id);let scanned=false;
function config(){return {mediaRoot:$('mediaRoot').value.trim(),analysisRoot:$('analysisRoot').value.trim(),order:$('order').value,mirrorBins:$('mirrorBins').checked,importAllMedia:$('importAllMedia').checked,markers:$('markers').checked,createHighlights:$('createHighlights').checked,highlightPercent:Number($('highlightPercent').value),timelineName:$('timelineName').value.trim()};}
async function scan(){scanned=false;$('import').disabled=true;$('status').textContent='Scanning files and reading Cutpoint JSON…';try{
 const p=await window.cutpointBridge.preview(config());
 $('files').textContent=p.totalFiles;$('sources').textContent=p.matchedSources;$('selects').textContent=p.selections;$('highlightCount').textContent=`Highlights: ${p.highlights} (top ${p.highlightPercent}%)`;$('duration').textContent=(p.totalSelectedSeconds/60).toFixed(1)+' min';
 $('issues').textContent=[...p.missing.map(m=>`Missing: ${m.path} (${m.reason})`),...p.warnings].slice(0,20).join('\n');
 $('examples').textContent=p.samples.slice(0,5).map(c=>`${c.file}  ${c.start.toFixed(1)}–${c.end.toFixed(1)}s  · ${c.label} · ${c.captureSource}`).join('\n');
 scanned=p.selections>0&&p.missing.length===0;$('import').disabled=!scanned;
 $('status').textContent=scanned?`Ready: ${p.selections} selections, ${p.analyses} analyses.`:'Resolve import blocked: no selections or missing media.';
 }catch(e){$('status').textContent='Scan failed: '+e.message;}}
for(const el of document.querySelectorAll('[data-pick]'))el.addEventListener('click',async()=>{const p=await window.cutpointBridge.pickFolder();if(p){$(el.dataset.pick).value=p;scanned=false;$('import').disabled=true;}});
$('scan').addEventListener('click',scan);
$('import').addEventListener('click',async()=>{if(!scanned)return;$('import').disabled=true;$('status').textContent='Importing…';try{const result=await window.cutpointBridge.run(config());$('status').textContent=`Created:\n${(result.timelines||[]).map(t=>`${t.name} (${t.clips} clips)`).join('\n')}\n${result.importedMedia} new media items · ${result.markers} markers`; }catch(e){$('status').textContent='Import stopped: '+e.message;}finally{$('import').disabled=false;}});
window.cutpointBridge.onProgress(s=>$('status').textContent=s);
window.cutpointBridge.project().then(p=>$('connected').textContent=p?'Resolve: '+p:'Open a Resolve project first').catch(e=>$('connected').textContent='Resolve connection unavailable: '+e.message);
for(const id of ['order','highlightPercent','createHighlights','timelineName','mirrorBins','importAllMedia','markers'])$(id).addEventListener('change',()=>{scanned=false;$('import').disabled=true;$('status').textContent='Settings changed. Scan again to preview.';});
