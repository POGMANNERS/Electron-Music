const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const dataPath = path.join(os.homedir(), 'Documents', 'Music Wall Data');
const dataFilePath = path.join(dataPath, 'Settings.json');

if (!fs.existsSync(dataPath)) 
{
  fs.mkdirSync(dataPath, { recursive: true });
}

let mainWindow;

function createWindow()
{
    const mainWindow = new BrowserWindow({
        width: 1500,
        height: 1200,
        //autoHideMenuBar: true,
        //menuBarVisible: false,
        icon: path.join(__dirname, 'favicon.ico'),
        webPreferences: 
        {
            preload: path.join(__dirname, 'preload.js'), 
            contextIsolation: true, 
            enableRemoteModule: false,
            nodeIntegration: false, 
        },
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => 
  {
    createWindow();

    ipcMain.handle('filePath-to-file', async (event, filePaths) => 
    {
        const fileBuffers = [];
        for (const filePath of filePaths)
        {
            console.log('Received file path: ', filePath);
            if (!fs.existsSync(filePath)) 
            {
            throw new Error('Invalid file path: ', filePath);
            }
            fileBuffers.push(fs.readFileSync(filePath));
        }
        return fileBuffers;
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

    ipcMain.handle('load-state', () => 
    {
        try 
        {
          const data = fs.readFileSync(dataFilePath);
          return JSON.parse(data);
        } 
        catch (err) 
        {
          console.error('Error reading or parsing JSON file: ', err);
          return {};
        }
    });

    ipcMain.handle('backup-state', (event, state) => 
    {
        try 
        {
            fs.writeFileSync(dataFilePath, JSON.stringify(state, null, 2));
        } 
        catch (err) 
        {
            console.error('Error writing JSON file: ', err);
        }
    });

    ipcMain.handle('load-playlist', (event, playlist_name) => 
        {
            try 
            {
                playlistFilePath = path.join(dataPath, playlist_name + '-playlist.json');
                const data = fs.readFileSync(playlistFilePath);
                return JSON.parse(data);
            } 
            catch (err) 
            {
                console.error('Error reading or parsing JSON file: ', err);
                return {};
            }
        });

    ipcMain.handle('backup-playlist', (event, playlist, playlist_name) => 
    {
        try 
        {
            const playlistFilePath = path.join(dataPath, playlist_name + '-playlist.json');
            fs.writeFileSync(playlistFilePath, JSON.stringify(playlist, null, 2));
        } 
        catch (err) 
        {
            console.error('Error writing JSON file: ', err);
        }
    });

    ipcMain.handle('get-playlists', () => 
    {
        try 
        {
            const files = fs.readdirSync(dataPath);
            const playlists = files.filter(file => file.endsWith('-playlist.json'));
            for (let i = 0; i<playlists.length;i++)
            {
                playlists[i] = playlists[i].slice(0,-14);
                //console.log(i + ": " + playlists[i] + " from " + playlists.length)
            }
            return playlists;
        }
        catch (err) 
        {
            console.error('Error reading or parsing JSON files: ', err);
            return;
        }
    });

    app.on('activate', () => 
    {
        if (mainWindow === null)
        {
            createWindow();
        }
    });
  });
  app.on('window-all-closed', () => 
  {
    if (process.platform !== 'darwin') 
        {
            app.quit();
        }
  });