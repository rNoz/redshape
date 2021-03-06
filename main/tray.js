const {
  Tray, Menu, ipcMain, nativeImage
} = require('electron');

let NAME;

let mainWindow;
let windowConfig;

let tray;
let contextMenu;

let icons;

let hideWhenClose = true;

let mainWindowHidden = false;
let statusLabel;
let timerEnabled;
let timerLabel;
let timerPaused;

const showMenuItem = { label: 'Show window', click: () => mainWindow.show() };
const pauseTimerMenuItem = { label: 'Pause timer', click: () => mainWindow.webContents.send('timer', { action: 'pause' }) };
const resumeTimerMenuItem = { label: 'Resume timer', click: () => mainWindow.webContents.send('timer', { action: 'resume' }) };
const hideMenuItem = { label: 'Hide in tray', role: 'close' };
const quitMenuItem = { role: 'quit' };
const sepMenuItem = { type: 'separator' };

const updateTrayMenu = () => {
  const template = [];
  if (timerEnabled) {
    if (timerPaused) {
      resumeTimerMenuItem.label = timerLabel;
      template.push(resumeTimerMenuItem);
      tray.setImage(icons.pause);
    } else {
      pauseTimerMenuItem.label = timerLabel;
      template.push(pauseTimerMenuItem);
      tray.setImage(icons.play);
    }
    template.push(sepMenuItem);
  } else {
    tray.setImage(icons.default);
  }
  if (mainWindowHidden) {
    template.push(showMenuItem);
  } else {
    template.push(hideMenuItem);
  }
  template.push(quitMenuItem);
  contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
  tray.setToolTip(statusLabel);
};


ipcMain.on('timer-info', (ev, {
  isEnabled, isPaused, issue, actionDate
}) => {
  statusLabel = NAME;
  timerEnabled = false;
  if (isEnabled && issue) {
    let { id, subject } = issue;
    if (id) {
      const subjectLength = 21;
      subject = subject ? ` ${subject}` : '';
      if (subject.length > (subjectLength + 3)) {
        subject = `${subject.substr(0, subjectLength)}...`;
      }
      timerEnabled = true;
      timerPaused = isPaused;
      timerLabel = `${isPaused ? 'Resume' : 'Pause'} #${id} ${subject}`;
      let status = isPaused ? 'paused' : 'running';
      if (actionDate) {
        status = `${status} ${isPaused ? 'on' : 'since'} ${actionDate.replace(' ', ' at ')}`;
      }
      statusLabel = `${NAME} #${id}${subject} \n(${status})`;
    }
  }
  updateTrayMenu();
});

module.exports = {
  setupTray({
    app, mainWindow: window, NAME: appName, statusLabel: label, windowConfig: config
  }) {
    mainWindow = window;
    windowConfig = config;

    NAME = appName;
    statusLabel = NAME;

    app.on('before-quit', () => {
      hideWhenClose = false; // other apps/OS can quit it
    });

    icons = {
      default: nativeImage.createFromPath(windowConfig.icon),
      pause: nativeImage.createFromPath(windowConfig.iconPause),
      play: nativeImage.createFromPath(windowConfig.iconPlay),
    };

    tray = new Tray(icons.default);
    contextMenu = Menu.buildFromTemplate([hideMenuItem, quitMenuItem]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(statusLabel);

    mainWindow.on('close', (ev) => {
      if (hideWhenClose) {
        ev.preventDefault();
        mainWindow.hide();
        ev.returnValue = false;
      } else {
        mainWindow.webContents.send('window', { action: 'quit' });
      }
    });

    mainWindow.on('show', (ev) => {
      mainWindowHidden = false;
      mainWindow.webContents.send('window', { action: 'show' });
      updateTrayMenu();
    });

    mainWindow.on('hide', (ev) => {
      mainWindowHidden = true;
      mainWindow.webContents.send('window', { action: 'hide' });
      updateTrayMenu();
    });

    mainWindow.on('blur', (ev) => {
      mainWindow.webContents.send('window', { action: 'blur' });
    });

    mainWindow.on('focus', (ev) => {
      mainWindow.webContents.send('window', { action: 'focus' });
    });

    tray.on('click', () => {
      if (mainWindowHidden) {
        mainWindow.show();
      } else {
        mainWindow.hide();
      }
    });
  }
};
