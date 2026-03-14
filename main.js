const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    }
  })

  // Load the built index.html using a file:// URL
  win.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}`)

  // Uncomment this line to open DevTools and see any errors:
  // win.webContents.openDevTools()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
