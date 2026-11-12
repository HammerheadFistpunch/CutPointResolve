'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const MEDIA_EXT = new Set(['.mp4','.mov','.mxf','.mkv','.avi','.mts','.m2ts','.wav','.mp3','.aif','.aiff','.braw','.r3d']);
function listFiles(root, predicate) {
  const result=[];
  function visit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name); if(ent.isDirectory())visit(p); else if(ent.isFile() && predicate(p))result.push(p);
  }} visit(root); return result;
}
function sourceKey(p){return path.normalize(p).toLowerCase();}
function probe(file){
  try{
    const x=cp.execFileSync('ffprobe',['-v','error','-show_entries','format_tags=creation_time:stream=index,codec_type,r_frame_rate,avg_frame_rate:stream_tags=creation_time,timecode','-of','json',file],{encoding:'utf8',timeout:20000,windowsHide:true,maxBuffer:2e6});
    const d=JSON.parse(x); const v=(d.streams||[]).find(s=>s.codec_type==='video') || {};
    const fraction=(s)=>{if(!s)return 0;const [a,b]=s.split('/').map(Number);return a&&b?a/b:0};
    const fps=fraction(v.avg_frame_rate)||fraction(v.r_frame_rate)||30;
    const raw=(d.format&&d.format.tags&&d.format.tags.creation_time)||(v.tags&&v.tags.creation_time)||null;
    const dt=raw?new Date(raw):null;
    return {fps,captureMs:dt&&!isNaN(dt.getTime())?dt.getTime():null,captureSource:raw?'embedded creation_time':null,rawCapture:raw};
  }catch(e){return {fps:30,captureMs:null,captureSource:null,warning:`ffprobe unavailable or failed: ${e.message.slice(0,140)}`};}
}
function selectFiles(mediaRoot,analysisRoot){
  if(!fs.existsSync(mediaRoot)||!fs.statSync(mediaRoot).isDirectory())throw Error('Media root folder does not exist');
  if(!fs.existsSync(analysisRoot)||!fs.statSync(analysisRoot).isDirectory())throw Error('Cutpoint analysis folder does not exist');
  const fileList=listFiles(mediaRoot,f=>MEDIA_EXT.has(path.extname(f).toLowerCase()));
  const byName=new Map(); for(const f of fileList){const key=path.basename(f).toLowerCase();byName.set(key,[...(byName.get(key)||[]),f]);}
  const analyses=listFiles(analysisRoot,f=>path.basename(f).toLowerCase()==='highlights.json');
  if(!analyses.length)throw Error('No highlights.json found recursively in the analysis folder');
  const selected=[],missing=[],warnings=[],used=new Set();
  for(const af of analyses){let d;try{d=JSON.parse(fs.readFileSync(af,'utf8'));}catch(e){warnings.push(`Invalid ${af}: ${e.message}`);continue;}
    for(const c of (d.candidates||[])){
      if(typeof c.start!=='number'||typeof c.end!=='number'||c.end<=c.start){warnings.push(`Invalid interval ${c.id} in ${af}`);continue;}
      const original=String(c.source || (d.sources&&d.sources[c.source_index||0]&&d.sources[c.source_index||0].path)||'');
      let resolved=fs.existsSync(original)?original:null;
      if(!resolved){const candidates=byName.get(path.basename(original).toLowerCase())||[];
        if(candidates.length===1)resolved=candidates[0];
        else if(candidates.length>1){missing.push({path:original,reason:'Ambiguous filename: multiple files match'});continue;}
      }
      if(!resolved){missing.push({path:original,reason:'Source not found'});continue;}
      const id=`${sourceKey(resolved)}|${c.start}|${c.end}|${af}`;
      if(used.has(id))continue;used.add(id);
      selected.push({id:c.id||'',source:resolved,original,fromAnalysis:af,start:c.start,end:c.end,duration:c.end-c.start,score:Number(c.score)||0,label:c.vision_label||c.label||'Selected moment',vision:c.signals&&c.signals.vision,signals:c.signals||{}});
    }
  }
  const sources=[...new Set(selected.map(c=>c.source))];const metadata=new Map();
  for(const f of sources){const p=probe(f);const stat=fs.statSync(f);if(p.captureMs===null){p.captureMs=stat.birthtimeMs>0?stat.birthtimeMs:stat.mtimeMs;p.captureSource='filesystem fallback (verify)';}
    metadata.set(sourceKey(f),p); if(p.warning)warnings.push(`${path.basename(f)}: ${p.warning}`);
  }
  for(const c of selected){const m=metadata.get(sourceKey(c.source));c.fps=m.fps;c.captureMs=m.captureMs+c.start*1000;c.captureSource=m.captureSource;c.relative=path.relative(mediaRoot,c.source);}
  return {selected,missing,warnings,sources,allMedia:fileList,analyses,metadata};
}
function orderSelections(items,mode='chronological'){
  const copy=[...items];if(mode==='ranked')copy.sort((a,b)=>b.score-a.score||a.captureMs-b.captureMs);
  else if(mode==='source')copy.sort((a,b)=>a.source.localeCompare(b.source)||a.start-b.start);
  else copy.sort((a,b)=>a.captureMs-b.captureMs||a.source.localeCompare(b.source)||a.start-b.start);
  return copy;
}
function preview(config){const data=selectFiles(config.mediaRoot,config.analysisRoot);return {
  totalFiles:data.allMedia.length,matchedSources:data.sources.length,analyses:data.analyses.length,
  selections:data.selected.length,totalSelectedSeconds:Math.round(data.selected.reduce((n,c)=>n+c.duration,0)*10)/10,
  missing:data.missing,warnings:data.warnings,order:(config.order||'chronological'),
  samples:orderSelections(data.selected,config.order).slice(0,12).map(c=>({file:path.basename(c.source),start:c.start,end:c.end,label:c.label,score:c.score,captureSource:c.captureSource}))
};}
function safeArray(v){return Array.isArray(v)?v:[];}
function children(folder){return safeArray(folder.GetSubFolderList());}
function findOrCreate(mp,parent,name){let f=children(parent).find(f=>f.GetName()===name);return f || mp.AddSubFolder(parent,name);}
function existingItems(folder,map){for(const c of safeArray(folder.GetClipList())){let p;try{p=c.GetClipProperty('File Path')}catch{}if(typeof p==='string'&&p)map.set(sourceKey(p),c);}for(const sub of children(folder))existingItems(sub,map);}
function addClipMarker(item,c){
 const score=c.score.toFixed(2);const notes=[`Cutpoint selection: ${c.id}`,`Reason/label: ${c.label}`,`Score: ${score}`,`Original: ${c.source}`,`Source In/Out: ${c.start.toFixed(3)} / ${c.end.toFixed(3)} seconds`,`Capture time source: ${c.captureSource}`,`Vision rating: ${c.vision??'unavailable'}`,`Signals: ${JSON.stringify(c.signals)}`].join('\n');
 const color=c.score>=20?'Green':c.score>=12?'Yellow':'Blue';
 // Timeline item marker frame 0 anchors annotation to selected clip rather than absolute timeline.
 return item.AddMarker(0,color,c.label,notes,1,JSON.stringify({provider:'cutpoint',candidate:c.id,source:c.source,in:c.start,out:c.end}));
}
function importToResolve(resolve,config,onProgress=()=>{}){
 const d=selectFiles(config.mediaRoot,config.analysisRoot);
 if(d.missing.length&&!config.allowMissing)throw Error(`${d.missing.length} missing or ambiguous source reference(s). Fix these before import.`);
 if(!d.selected.length)throw Error('No usable Cutpoint selections found');
 const project=resolve.GetProjectManager().GetCurrentProject();if(!project)throw Error('Open or create a Resolve project first.');
 const mp=project.GetMediaPool();const root=mp.GetRootFolder();let mediaRoot=root;
 if(config.mirrorBins!==false)mediaRoot=findOrCreate(mp,root,'Media');
 const existing=new Map();existingItems(root,existing);
 const useFiles=config.importAllMedia?d.allMedia:d.sources;
 let count=0;onProgress(`Importing ${useFiles.length} original media files`);
 for(const file of useFiles){if(existing.has(sourceKey(file)))continue;
   let target=mediaRoot;
   if(config.mirrorBins!==false){const rel=path.relative(config.mediaRoot,path.dirname(file));if(rel&&!rel.startsWith('..'))for(const name of rel.split(path.sep).filter(Boolean))target=findOrCreate(mp,target,name);}
   if(!mp.SetCurrentFolder(target))throw Error(`Cannot select bin for ${file}`);
   const added=safeArray(mp.ImportMedia([file]));if(!added.length)throw Error(`Resolve could not import ${file}`);
   existing.set(sourceKey(file),added[0]);count++;
 }
 const sorted=orderSelections(d.selected,config.order);
 const timelineName=(config.timelineName||'Cutpoint Selects').trim()+' '+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
 const timelineBin=findOrCreate(mp,root,'Timelines');
 if(!mp.SetCurrentFolder(timelineBin))throw Error('Cannot set Timelines bin');
 const tl=mp.CreateEmptyTimeline(timelineName);if(!tl)throw Error('Could not create timeline');
 if(!project.SetCurrentTimeline(tl))throw Error('Could not activate new timeline');
 let created=0,markers=0;
 for(const c of sorted){const source=existing.get(sourceKey(c.source));if(!source)throw Error('Missing media pool clip for '+c.source);
  // Resolve's scripting API accepts source frame ranges; endFrame is treated as inclusive.
  const first=Math.max(0,Math.round(c.start*c.fps));const last=Math.max(first,Math.round(c.end*c.fps)-1);
  const items=safeArray(mp.AppendToTimeline([{mediaPoolItem:source,startFrame:first,endFrame:last}]));
  if(!items.length)throw Error(`AppendToTimeline failed for ${path.basename(c.source)} ${c.start}-${c.end}`);
  created++;
  if(config.markers!==false){try{if(addClipMarker(items[0],c))markers++;}catch(e){onProgress(`Marker warning: ${e.message}`);}}
  if(created%10===0)onProgress(`Added ${created}/${sorted.length} selections`);
 }
 // No changes to source files; no rendering or transcoding.
 return {timeline:timelineName,selected:created,importedMedia:count,markers,warnings:d.warnings};
}
module.exports={selectFiles,orderSelections,preview,importToResolve,sourceKey};