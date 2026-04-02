const { app, BrowserWindow, dialog, session, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');

let mainWindow;
let backendProcess;

// Use a stable writable app data location and avoid GPU cache issues on some Windows setups.
app.setPath('userData', path.join(app.getPath('appData'), 'ControlInventarioAZ'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false, // Show only when ready-to-show fires, preventing blank flash
  });

  // Show loading screen immediately so the user sees feedback right away
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  // Reveal the window as soon as the loading screen is painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`Renderer failed to load (${code}): ${description} - ${url}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Navigate the existing window to the real app (called after backend is ready)
function loadApp() {
  if (!mainWindow) return;
  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

// Poll the backend health endpoint until it responds (max ~15 seconds)
function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Backend respondió con código ' + res.statusCode));
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Backend no respondió después de ' + maxAttempts + ' intentos'));
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Backend timeout'));
        }
      });
    };
    check();
  });
}

function startBackend() {
  const backendRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '../backend');
  const backendEntry = path.join(backendRoot, 'src', 'server.js');

  // Use Electron's bundled Node.js so it works on PCs without Node installed
  const nodeExe = app.isPackaged ? process.execPath : 'node';
  const spawnArgs = app.isPackaged
    ? ['--no-warnings', backendEntry]
    : [backendEntry];

  // For packaged Electron, we must set ELECTRON_RUN_AS_NODE=1
  const envVars = {
    ...process.env,
    PORT: '3000',
    HOST: '127.0.0.1',
    DB_PATH: path.join(app.getPath('userData'), 'inventario.db')
  };
  if (app.isPackaged) {
    envVars.ELECTRON_RUN_AS_NODE = '1';
  }

  backendProcess = spawn(nodeExe, spawnArgs, {
    cwd: backendRoot,
    windowsHide: true,
    env: envVars
  });

  let backendErrors = '';

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    backendErrors += msg;
    backendProcess._stderrData = backendErrors;
    console.error(`Backend Error: ${msg}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    // If backend dies unexpectedly while app is running, show error
    if (code !== 0 && code !== null && mainWindow) {
      dialog.showErrorBox(
        'Error del Servidor',
        'El servidor backend se detuvo inesperadamente (código ' + code + ').\n\n' + (backendErrors || 'Sin detalles') + '\n\nLa aplicación se cerrará.'
      );
      app.quit();
    }
  });
}

app.on('ready', async () => {
  // Grant camera permission for barcode scanning
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Show window immediately with loading screen — user sees feedback at once
  createWindow();
  startBackend();

  try {
    await waitForBackend(3000);
    // Backend ready — swap the loading screen for the actual app
    loadApp();
  } catch (error) {
    console.error('Backend failed to start:', error);
    const errDetail = backendProcess && backendProcess._stderrData
      ? backendProcess._stderrData
      : error.message;
    dialog.showErrorBox(
      'Error de Inicio',
      'No se pudo iniciar el servidor backend.\n\n' + errDetail + '\n\nLa aplicación se cerrará.'
    );
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

ipcMain.handle('print-html-ticket', async (_event, html) => {
  let printWindow;
  try {
    printWindow = new BrowserWindow({
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html || ''))}`);

    const result = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
        },
        (success, failureReason) => {
          resolve({ success, message: failureReason || null });
        }
      );
    });

    printWindow.close();
    return result;
  } catch (error) {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.close();
    }
    return { success: false, message: error.message || 'Error de impresion' };
  }
});

ipcMain.handle('print-text-ticket', async (_event, text) => {
  try {
    const sanitized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    if (process.platform !== 'win32') {
      return { success: false, message: 'Impresion texto directo disponible solo en Windows.' };
    }

    const tempDir = path.join(os.tmpdir(), 'control-inventario-az');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `ticket-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, sanitized, { encoding: 'utf8' });

    const psScript = [
      '$ErrorActionPreference = "Stop"',
      `$content = Get-Content -LiteralPath '${tempFile.replace(/'/g, "''")}' -Raw`,
      '$content | Out-Printer',
    ].join('; ');

    const result = await new Promise((resolve) => {
      const printer = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
        windowsHide: true,
      });

      let stderr = '';
      printer.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      printer.on('close', (code) => {
        resolve({ code, stderr });
      });
    });

    try {
      fs.unlinkSync(tempFile);
    } catch (_err) {
      // ignore cleanup errors
    }

    if (result.code !== 0) {
      return {
        success: false,
        message: result.stderr || 'No se pudo enviar el ticket a la impresora predeterminada.',
      };
    }

    return { success: true, message: null };
  } catch (error) {
    return { success: false, message: error.message || 'Error de impresion en texto' };
  }
});
