const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  login: data => ipcRenderer.invoke('auth:login', data),
  changeCode: data => ipcRenderer.invoke('auth:changeCode', data),
  list: table => ipcRenderer.invoke('data:list', table),
  add: data => ipcRenderer.invoke('data:add', data),
  remove: data => ipcRenderer.invoke('data:delete', data),
  createUser: data => ipcRenderer.invoke('users:create', data),
  setUserStatus: data => ipcRenderer.invoke('users:setStatus', data),
  resetCode: data => ipcRenderer.invoke('users:resetCode', data),
  backup: () => ipcRenderer.invoke('backup:create'),
  restore: () => ipcRenderer.invoke('backup:restore'),
  info: () => ipcRenderer.invoke('app:info')
});
