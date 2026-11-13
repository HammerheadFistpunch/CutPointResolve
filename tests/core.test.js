'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const os=require('os');const path=require('path');const core=require('../plugin/com.cutpoint.resolve/core');
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cutpoint-resolve-'));const media=path.join(dir,'media');const ana=path.join(dir,'cutpoint');fs.mkdirSync(path.join(media,'Phone'),{recursive:true});fs.mkdirSync(ana);const f=path.join(media,'Phone','clip.mp4');fs.writeFileSync(f,'not actual video');fs.writeFileSync(path.join(ana,'highlights.json'),JSON.stringify({sources:[{path:f,duration:60,fps:30}],candidates:[{id:'h001',source:f,start:1.1,end:3.3,score:15,label:'speech'},{id:'h002',source:f,start:11,end:15,score:20,vision_label:'action'}]}));return {dir,media,ana,f};}
test('recovers all subclips referencing the same original media',()=>{const x=fixture();try{const d=core.selectFiles(x.media,x.ana);assert.equal(d.selected.length,2);assert.equal(d.sources.length,1);assert.equal(d.missing.length,0);assert.deepEqual(core.orderSelections(d.selected,'source').map(c=>c.id),['h001','h002']);}finally{fs.rmSync(x.dir,{recursive:true,force:true});}});
test('fails before importing if sources cannot be found',()=>{const x=fixture();fs.unlinkSync(x.f);try{const p=core.preview({mediaRoot:x.media,analysisRoot:x.ana});assert.equal(p.missing.length,2);assert.equal(p.selections,0);}finally{fs.rmSync(x.dir,{recursive:true,force:true});}});
test('non-destructive Resolve operations append original source ranges and notes',()=>{const x=fixture();try{
 const folders=[];const makeFolder=(name)=>({GetName:()=>name,GetClipList:()=>[],GetSubFolderList:()=>folders.filter(k=>k.parent===name)});
 const root=makeFolder('root'); const items=[];const clip={GetClipProperty:()=>x.f};
 let timeline=null, imported=0;
 const appended=[],links=[],progress=[];
 const mp={GetRootFolder:()=>root,AddSubFolder:(parent,name)=>{const o={parent:parent.GetName(),...makeFolder(name)};folders.push(o);return o;},SetCurrentFolder:()=>true,ImportMedia:(files)=>{imported++;return [clip]},CreateEmptyTimeline:(name)=>{
   timeline={name,SetClipsLinked:(group,linked)=>{links.push({name,group,linked});return links.length!==2;}};
   return timeline;
 },AppendToTimeline:(c)=>{
   items.push(c[0]);
   const group=[{AddMarker:()=>true},{},{}];
   appended.push(group);
   return group;
 }};
 const project={GetMediaPool:()=>mp,SetCurrentTimeline:()=>true};const resolve={GetProjectManager:()=>({GetCurrentProject:()=>project})};
 const result=core.importToResolve(resolve,{mediaRoot:x.media,analysisRoot:x.ana,order:'source',mirrorBins:true,markers:true,importAllMedia:true},message=>progress.push(message));
 assert.equal(result.selected,2);assert.equal(result.markers,3);assert.equal(imported,1);assert.equal(items.length,3);assert.equal(result.timelines.length,2);assert.equal(result.timelines[0].clips,2);assert.equal(result.timelines[1].clips,1);assert.equal(items[0].mediaPoolItem,clip);assert(items[0].endFrame>=items[0].startFrame);assert(timeline.name.includes('Cutpoint - Highlights'));
 assert.deepEqual(links.map(link=>link.name),[result.timelines[0].name,result.timelines[0].name,result.timelines[1].name]);
 links.forEach((link,index)=>{
   assert.equal(link.linked,true);
   assert.deepEqual(link.group,appended[index]);
   link.group.forEach((item,itemIndex)=>assert.equal(item,appended[index][itemIndex]));
 });
 assert.deepEqual(result.timelines.map(t=>t.linkWarnings),[1,0]);
 assert(progress.some(message=>message.includes('Resolve rejected the link')));
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}});
test('highlight selection keeps top scores with chronological ordering',()=>{
 const c=(id,score,time)=>({id,score,captureMs:time,source:'video.mp4',start:0});
 const input=[c('low',2,90),c('top',99,300),c('middle',20,200),c('high',50,100)];
 assert.deepEqual(core.highlightsFor(input,50).map(x=>x.id),['high','top']);
 assert.deepEqual(core.highlightsFor(input,25).map(x=>x.id),['top']);
 assert.deepEqual(core.highlightsFor(input,100).map(x=>x.id),['low','high','middle','top']);
 assert.throws(()=>core.highlightsFor(input,0),/percentage/);
});
test('optional highlights may be disabled without affecting complete selects',()=>{
 const x=fixture();try{
  let timelines=0,appended=0;
  const root={GetName:()=> 'root',GetClipList:()=>[],GetSubFolderList:()=>[]};
  const folder={GetName:()=> 'Timelines',GetClipList:()=>[],GetSubFolderList:()=>[]};
  const mp={GetRootFolder:()=>root,AddSubFolder:()=>folder,SetCurrentFolder:()=>true,ImportMedia:()=>[{GetClipProperty:()=>x.f}],CreateEmptyTimeline:()=>{timelines++;return {};},AppendToTimeline:()=>{appended++;return [{AddMarker:()=>true}]}};
  const project={GetMediaPool:()=>mp,SetCurrentTimeline:()=>true};
  const resolve={GetProjectManager:()=>({GetCurrentProject:()=>project})};
  const result=core.importToResolve(resolve,{mediaRoot:x.media,analysisRoot:x.ana,createHighlights:false,mirrorBins:false});
  assert.equal(timelines,1);assert.equal(appended,2);assert.equal(result.timelines.length,1);
  assert.equal(result.timelines[0].linkWarnings,0);
 }finally{fs.rmSync(x.dir,{recursive:true,force:true});}
});
