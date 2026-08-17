/* ============================================================
   preload — the only bridge between the pages and the main process.

   contextIsolation is on, so the dashboards get exactly this object
   on `window.krypt` and nothing else. Everything is a named channel;
   there is no generic "invoke anything" escape hatch.
   ============================================================ */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('krypt', {
  isDesktop: true,

  app: {
    version: () => ipcRenderer.invoke('app:version'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
    quit: () => ipcRenderer.invoke('app:quit'),
  },

  /* The Wi-Fi server that puts the gallery on your phone. */
  phone: {
    // `chosen` optionally pins which of the PC's addresses the QR encodes,
    // for when the automatic pick isn't the one the phone can reach.
    status: (chosen) => ipcRenderer.invoke('phone:status', chosen),
    start: () => ipcRenderer.invoke('phone:start'),
    stop: () => ipcRenderer.invoke('phone:stop'),
    allowFirewall: () => ipcRenderer.invoke('phone:allowFirewall'),
    // Fired when the menu, the tray or a shortcut asks for the panel.
    onShow: (cb) => {
      const h = () => cb();
      ipcRenderer.on('krypt:showPhone', h);
      return () => ipcRenderer.off('krypt:showPhone', h);
    },
    onChange: (cb) => {
      const h = (_e, s) => cb(s);
      ipcRenderer.on('krypt:phoneState', h);
      return () => ipcRenderer.off('krypt:phoneState', h);
    },
  },

  /* Dashboards the user imported. Reads and writes go to userData via
     the main process — the renderer never touches the filesystem, and
     an imported dashboard never sees any of this: it renders inside a
     sandboxed iframe with no same-origin access to the page that
     holds these functions. */
  custom: {
    list: () => ipcRenderer.invoke('custom:list'),
    read: (id) => ipcRenderer.invoke('custom:read', id),
    import: () => ipcRenderer.invoke('custom:import'),
    importHtml: (payload) => ipcRenderer.invoke('custom:importHtml', payload),
    importPaths: (files) => ipcRenderer.invoke('custom:importPaths', files),
    rename: (id, name) => ipcRenderer.invoke('custom:rename', id, name),
    replace: (id, html) => ipcRenderer.invoke('custom:replace', id, html),
    remove: (id) => ipcRenderer.invoke('custom:remove', id),
    export: (id) => ipcRenderer.invoke('custom:export', id),
    reveal: () => ipcRenderer.invoke('custom:reveal'),
  },

  onboarding: {
    seen: () => ipcRenderer.invoke('onboarding:seen'),
    markSeen: () => ipcRenderer.invoke('onboarding:markSeen'),
    reset: () => ipcRenderer.invoke('onboarding:reset'),
    onShow: (cb) => {
      const h = () => cb();
      ipcRenderer.on('krypt:showOnboarding', h);
      return () => ipcRenderer.off('krypt:showOnboarding', h);
    },
  },

  /* Discord Rich Presence follows whatever dashboard is open. */
  rpc: {
    setPage: (label) => ipcRenderer.send('rpc:setPage', label),
    status: () => ipcRenderer.invoke('rpc:status'),
  },
});
