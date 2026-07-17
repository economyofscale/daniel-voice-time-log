const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

const DEV_URL = 'http://localhost:5173';
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Voice Time Log',
    autoHideMenuBar: true,
    backgroundColor: '#f5f6f4',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // External links (if any ever appear) open in the system browser,
  // not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Electron denies media permission prompts by default — allow microphone
  // access, but only for this app's own pages (packaged file:// build or
  // the Vite dev server).
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const url = webContents.getURL();
      const isOwnPage = url.startsWith('file://') || url.startsWith(DEV_URL);
      callback(permission === 'media' && isOwnPage);
    }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
