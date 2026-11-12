'use strict';
const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const path=require('path');
const core=require('./core');
const PLUGIN_ID='com.cutpoint.resolve';
let bridge=null,resolve=null,win=null;
function getResolve(){
 if(resolve)return resolve;
 bridge=require('./WorkflowIntegration.node');
 if(!bridge.Initialize(PLUGIN_ID))throw Error('Resolve Workflow Integration initialization failed. Verify manifest ID and SDK version.');
 resolve=bridge.GetResolve(); if(!resolve)throw Error('Resolve API unavailable');return resolve;
}
function createWindow(){
 win=new BrowserWindow({width:850,height:760,minWidth:700,minHeight:600,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:false}});
 win.loadFile(path.join(__dirname,'index.html'));
}
app.whenReady().then(()=>{
 ipcMain.handle('pick-folder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory']});return r.canceled?null:r.filePaths[0];});
 ipcMain.handle('preview',(_,config)=>core.preview(config));
 ipcMain.handle('project',()=>{const p=getResolve().GetProjectManager().GetCurrentProject();return p?p.GetName():null;});
 ipcMain.handle('import',(_,config)=>{const r=getResolve();return core.importToResolve(r,config,(message)=>win.webContents.send('progress',message));});
 createWindow();
});
app.on('window-all-closed',()=>{try{if(bridge)bridge.CleanUp()}catch{}app.quit();});