const { app, BrowserWindow, ipcMain } = require("electron");
const serve = require("electron-serve");
const path = require("path");
const os = require("os");

const appServe = app.isPackaged
  ? serve({ directory: path.join(__dirname, "../out") })
  : null;

// Datos nativos del equipo (solo posible dentro de Electron, no en navegador).
ipcMain.handle("get-machine-info", () => {
  let username = "";
  try {
    username = os.userInfo().username;
  } catch {}
  return {
    hostname: os.hostname(),
    username,
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
  };
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    icon: path.join(__dirname, "../build/icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // permite CORS hacia el API en LAN
      allowRunningInsecureContent: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  if (app.isPackaged) {
    appServe(win).then(() => win.loadURL("app://-"));
  } else {
    win.loadURL("http://localhost:4000");
    win.webContents.openDevTools();
    win.webContents.on("did-fail-load", () => {
      win.webContents.reloadIgnoringCache();
    });
  }
};

app.on("ready", createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
