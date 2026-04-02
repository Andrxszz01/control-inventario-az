const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printHtmlTicket: (html) => ipcRenderer.invoke('print-html-ticket', html),
  printTextTicket: (text) => ipcRenderer.invoke('print-text-ticket', text),
});
