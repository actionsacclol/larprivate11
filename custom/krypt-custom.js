/* ============================================================
   krypt-custom.js — one interface to your imported dashboards,
   whichever way you happen to be looking at them.

   There are three, and they are not interchangeable:

     desktop   the Electron app. Talks to the main process over the
               named channels in preload.js. Can import, rename,
               delete and export, because it can reach the disk.

     server    a phone (or any browser) on the Wi-Fi server. Reads
               the same folder over HTTP — /api/custom for the list,
               /custom/<id>/ for the files — so a dashboard imported
               on the PC is there too. Read-only: the phone is not
               where the .html file is.

     none      index.html opened straight off the filesystem, no
               Electron, no server. There is nothing to read from,
               so the collection is honestly reported as empty
               rather than half-working.

   Everything returns a promise, including in the modes where the
   answer is immediate, so callers don't have to care which one they
   got.
   ============================================================ */

(function () {
  'use strict';

  var IPC = (window.krypt && window.krypt.custom) || null;
  var HTTP = /^https?:$/.test(location.protocol);
  var MODE = IPC ? 'desktop' : (HTTP ? 'server' : 'none');

  /* Where custom/ sits relative to the page asking. The manager and the
     viewer both live in custom/, so this is "." for them; the gallery
     passes its own prefix. */
  function base() {
    var m = location.pathname.match(/^(.*\/)custom\/[^/]*$/);
    return m ? m[1] + 'custom/' : '/custom/';
  }

  function readOnly() {
    return Promise.reject(new Error(
      MODE === 'server'
        ? 'Importing happens on the computer running Krypt LARP. This page can open your dashboards but not change them.'
        : 'Open Krypt LARP on your computer to import a dashboard.'));
  }

  var api = {
    mode: MODE,
    canWrite: MODE === 'desktop',

    /** [{ id, name, tag, added, updated, bytes, theme }], newest first. */
    list: function () {
      if (IPC) return IPC.list();
      if (HTTP) {
        return fetch('/api/custom', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : []; })
          .catch(function () { return []; });
      }
      return Promise.resolve([]);
    },

    get: function (id) {
      return api.list().then(function (items) {
        for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
        return null;
      });
    },

    /** The dashboard's own HTML, as text. */
    read: function (id) {
      if (IPC) return IPC.read(id);
      if (HTTP) {
        return fetch('/custom/' + encodeURIComponent(id) + '/index.html', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.text() : null; })
          .catch(function () { return null; });
      }
      return Promise.resolve(null);
    },

    /** Open a file picker. Desktop only. */
    import: function () { return IPC ? IPC.import() : readOnly(); },

    /** Store HTML the page already has — a drop, or a paste. */
    importHtml: function (name, html) {
      return IPC ? IPC.importHtml({ name: name, html: html }) : readOnly();
    },

    /** Files dropped onto the window, by path. Electron hands a real
        path on a native drop, which saves reading the whole file into
        the renderer just to send it back. Falls back to importHtml when
        the drop has no path (a drag out of a browser, for one). */
    importPaths: function (files) { return IPC ? IPC.importPaths(files) : readOnly(); },

    rename: function (id, name) { return IPC ? IPC.rename(id, name) : readOnly(); },
    replace: function (id, html) { return IPC ? IPC.replace(id, html) : readOnly(); },
    remove: function (id) { return IPC ? IPC.remove(id) : readOnly(); },
    export: function (id) { return IPC ? IPC.export(id) : readOnly(); },
    reveal: function () { return IPC ? IPC.reveal() : readOnly(); },

    /** Where this dashboard's icon lives, for previews and <link> tags.
        Only meaningful over HTTP — in Electron the icons are in userData,
        outside anything the page can address. */
    iconUrl: function (id) {
      return HTTP ? '/custom/' + encodeURIComponent(id) + '/icon-180.png' : null;
    },
    manifestUrl: function (id) {
      return HTTP ? '/custom/' + encodeURIComponent(id) + '/app.webmanifest' : null;
    },
    viewUrl: function (id) {
      return base() + 'view.html?id=' + encodeURIComponent(id);
    },
  };

  window.kryptCustom = api;
})();
