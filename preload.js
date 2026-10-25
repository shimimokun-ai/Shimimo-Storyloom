const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    quitGame: () => ipcRenderer.send('quit-game'),
    getDevelopmentMode: () => ipcRenderer.invoke('development:is-enabled'),
    returnToTitle: () => ipcRenderer.invoke('window:return-to-title'),
    openBilibiliProfile: (url) => ipcRenderer.invoke('gallery:open-bilibili', url),
    getChatStatus: () => ipcRenderer.invoke('chat:status'),
    getChatConfig: () => ipcRenderer.invoke('chat:config:get'),
    saveChatConfig: config => ipcRenderer.invoke('chat:config:save', config),
    clearChatConfig: () => ipcRenderer.invoke('chat:config:clear'),
    requestChatCompletion: (messages, requestId) => ipcRenderer.invoke('chat-completion', messages, requestId),
    cancelChatRequest: requestId => ipcRenderer.invoke('chat:cancel', requestId),
    getFullscreen: () => ipcRenderer.invoke('window:get-fullscreen'),
    setFullscreen: (isFullscreen) => ipcRenderer.invoke('window:set-fullscreen', isFullscreen),
    getAchievements: () => ipcRenderer.invoke('achievements:get'),
    recordAchievement: (event) => ipcRenderer.invoke('achievements:record', event)
});
