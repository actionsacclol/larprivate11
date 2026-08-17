/* ============================================================
   custom.js — the Electron side of "dashboards you made yourself".

   tools/custom-store.js does the actual filing. This binds it to the
   app's userData folder and adds the two things only the desktop can
   do: open a file picker, and write an export back out to disk.

   Everything here is main-process. The renderer reaches it through the
   named channels in preload.js — there is no path from an imported
   dashboard to any of this, because imported HTML never runs in a
   window that has the preload attached (see custom/view.html).
   ============================================================ */

const { app, dialog, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const { createStore } = require('../tools/custom-store.js');

let store = null;

/** Created lazily: app.getPath('userData') is not reliable until ready. */
function get() {
  if (!store) store = createStore(path.join(app.getPath('userData'), 'custom'));
  return store;
}

/* A name to suggest when the file itself doesn't say. Falls back to the
   filename, which is usually what the user called it when they saved. */
function nameFrom(html, file) {
  const title = /<title[^>]*>([^<]{1,80})<\/title>/i.exec(html || '');
  if (title) {
    const t = title[1].trim().replace(/\s*[·\-—|]\s*(learning demo|demo|krypt larp).*$/i, '');
    if (t) return t.slice(0, 48);
  }
  return path.basename(file || '', '.html').replace(/[-_]+/g, ' ').trim() || 'Untitled dashboard';
}

/**
 * Import one or more .html files through a picker.
 * Returns { added: [rec], errors: [{ file, message }] } — partial
 * success is normal when someone multi-selects a folder of exports.
 */
async function importFiles(win) {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import a dashboard',
    buttonLabel: 'Import',
    filters: [{ name: 'HTML pages', extensions: ['html', 'htm'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled || !res.filePaths.length) return { added: [], errors: [], canceled: true };
  return importPaths(res.filePaths);
}

function importPaths(files) {
  const added = [];
  const errors = [];
  for (const file of files) {
    try {
      const html = fs.readFileSync(file, 'utf8');
      added.push(get().add({ name: nameFrom(html, file), html }));
    } catch (err) {
      errors.push({ file: path.basename(file), message: err.message });
    }
  }
  return { added, errors, canceled: false };
}

/** Import HTML the renderer already has — a drag-drop, or a paste. */
function importHtml({ name, html }) {
  return get().add({ name: name || nameFrom(html, ''), html });
}

async function exportOne(win, id) {
  const rec = get().get(id);
  if (!rec) throw new Error('That dashboard is no longer here.');
  const res = await dialog.showSaveDialog(win, {
    title: 'Export dashboard',
    defaultPath: `${rec.id}.html`,
    filters: [{ name: 'HTML page', extensions: ['html'] }],
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  fs.writeFileSync(res.filePath, get().html(id) || '', 'utf8');
  return { canceled: false, path: res.filePath };
}

/** Confirm before deleting: it removes the file, and there is no undo. */
async function removeOne(win, id) {
  const rec = get().get(id);
  if (!rec) return { removed: false };
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Delete dashboard',
    message: `Delete “${rec.name}”?`,
    detail: 'The imported file is removed from your collection. ' +
      'Whatever you imported it from is untouched.',
  });
  if (response !== 0) return { removed: false };
  return { removed: get().remove(id) };
}

function reveal() {
  const dir = get().root;
  fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
  return dir;
}

module.exports = {
  get, importFiles, importPaths, importHtml, exportOne, removeOne, reveal,
};
