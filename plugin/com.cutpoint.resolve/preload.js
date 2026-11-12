'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cutpointBridge',{
 pickFolder:()=>ipcRenderer.invoke('pick-folder'),
 preview:(config)=>ipcRenderer.invoke('preview',config),
 project:()=>ipcRenderer.invoke('project'),
 run:(config)=>ipcRenderer.invoke('import',config),
 onProgress:(fn)=>ipcRenderer.on('progress',(_,text)=>fn(text))
});