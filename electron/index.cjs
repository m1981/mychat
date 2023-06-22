const { dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Tray, Menu } = require('electron');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

if (require('electron-squirrel-startup')) app.quit();

function createWindow() {
  let iconPath = '';
  if (isDev) {
    iconPath = path.join(__dirname, '../public/icon-rounded.png');
  } else {
    iconPath = path.join(__dirname, '../dist/icon-rounded.png');
  }
  autoUpdater.checkForUpdatesAndNotify();

  const win = new BrowserWindow({
    show: false,
    icon: iconPath,
  });

ipcMain.on('open-directory-picker', (event) => {
  dialog
    .showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const directoryPath = result.filePaths[0];
        // Load existing chat data
        const chatData = JSON.parse(fs.readFileSync('path/to/chat-data.json', 'utf-8'));

        // Update chat data with the chosen directory path
        chatData.directoryPath = directoryPath;
        fs.writeFileSync('path/to/chat-data.json', JSON.stringify(chatData, null, 2));
      }
    })
    .catch((err) => {
      console.log(err);
    });
});
  
  createTray(win);

  win.on('minimize', (event) => {
    event.preventDefault();
    win.hide();
  });

  win.maximize();
  win.show();

  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

const createTray = (window) => {
  const tray = new Tray(
    path.join(
      __dirname,
      isDev ? '../public/icon-rounded.png' : '../dist/icon-rounded.png'
    )
  );
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => window.show() },
    {
      label: 'Exit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.on('click', () => window.show());
  tray.setToolTip('Better ChatGPT');
  tray.setContextMenu(contextMenu);

  return tray;
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
