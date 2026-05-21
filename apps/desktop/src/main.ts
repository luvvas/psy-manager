import { app, BrowserWindow, protocol, net, dialog, session } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs";
import { autoUpdater } from "electron-updater";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadURL("app://localhost/");
  } else {
    win.loadURL("http://localhost:5173");
  }

  return win;
}

function setupAutoUpdater(win: BrowserWindow): void {
  if (!app.isPackaged) return;

  autoUpdater.checkForUpdates().catch(() => {});

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Atualização disponível",
        message: "Uma nova versão foi baixada. Reinicie o aplicativo para aplicar a atualização.",
        buttons: ["Reiniciar agora", "Depois"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("Erro no auto-update:", err.message);
  });
}

app.whenReady().then(() => {
  // Rewrite Set-Cookie headers from the cloud API so cookies are stored and sent
  // cross-origin from app://localhost. Chromium won't send SameSite=Lax cookies
  // for cross-site requests; forcing SameSite=None;Secure fixes session persistence.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    const key = Object.keys(headers).find((k) => k.toLowerCase() === "set-cookie");
    if (key) {
      headers[key] = headers[key].map((cookie) => {
        let c = cookie.replace(/;\s*SameSite=\w+/gi, "");
        c += "; SameSite=None";
        if (!/;\s*Secure/i.test(c)) c += "; Secure";
        return c;
      });
    }
    callback({ responseHeaders: headers });
  });

  if (app.isPackaged) {
    const webDistPath = path.join(process.resourcesPath, "web-dist");

    protocol.handle("app", (request) => {
      const url = new URL(request.url);
      const requestedPath =
        url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const filePath = path.join(webDistPath, requestedPath);

      // SPA fallback: serve index.html for client-side routes
      const resolvedPath = fs.existsSync(filePath)
        ? filePath
        : path.join(webDistPath, "index.html");

      return net.fetch(pathToFileURL(resolvedPath).toString());
    });
  }

  const win = createWindow();
  setupAutoUpdater(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
