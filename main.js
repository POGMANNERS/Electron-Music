const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const dataPath = path.join(os.homedir(), 'Documents', 'Music Wall Data');
const dataFilePath = path.join(dataPath, 'state(songs).json');

if (!fs.existsSync(dataPath)) 
    {
    fs.mkdirSync(dataPath, { recursive: true });
  }

function ensureFileExists(filePath) {
    if (fs.existsSync(filePath)) {
      if (fs.lstatSync(filePath).isDirectory()) {
        throw new Error('Expected a file but found a directory.');
      }
    } else {
      fs.writeFileSync(filePath, '{}'); // Create an empty file if it does not exist
    }
  }
  
  ensureFileExists(dataFilePath);

let mainWindow;

function createWindow()
{
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 1000,
        webPreferences: 
        {
            preload: path.join(__dirname, 'preload.js'), // Preload script
            contextIsolation: true, // Important for security
            enableRemoteModule: false,
            nodeIntegration: false, // Enable Node.js integration
        },
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('filePath-to-base64', async (event, filePath) => 
    {
        console.log('Received file path:', filePath);
        if (!fs.existsSync(filePath)) 
        {
          throw new Error('Invalid file path', filePath);
        }
        const fileBuffer = fs.readFileSync(filePath);
        return fileBuffer.toString('base64');
    });
    

    

    ipcMain.handle('open-file-dialog', async () =>
    {
        const result = await dialog.showOpenDialog({
            properties: ['openFile','multiSelections'],
            filters: [
                { name: 'Audio Files', extensions: ['mp3', 'wav']}
            ]
        });
        return result.filePaths;
    });

    ipcMain.handle('load-state', () => {
        try 
        {
          const data = fs.readFileSync(dataFilePath);
          return JSON.parse(data);
        } 
        catch (err) 
        {
          console.error('Error reading or parsing JSON file:', err);
          return {}; // Return default state if an error occurs
        }
    });

    ipcMain.handle('backup-state', (event, state) => {
        try 
        {
            fs.writeFileSync(dataFilePath, JSON.stringify(state, null, 2));
        } 
        catch (err) 
        {
            console.error('Error writing JSON file:', err);
        }
    });

    app.on('activate', () => {
        if (mainWindow === null)
        {
            createWindow();
        }
    });
});
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') 
        {
          
            app.quit();
        }
  });