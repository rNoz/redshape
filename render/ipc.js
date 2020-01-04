import { ipcRenderer } from 'electron';
import store from './store';
import actions from './actions';

let currentTimer;

ipcRenderer.on('settings', (event, {key, value}) => {
  switch(key){
    case 'ADVANCED_TIMER_CONTROLS':
      store.dispatch(actions.settings.setAdvancedTimerControls(value));
      break;
    case 'DISCARD_IDLE_TIME':
      store.dispatch(actions.settings.setDiscardIdleTime(value));
      break;
    case 'IDLE_BEHAVIOR':
      store.dispatch(actions.settings.setIdleBehavior(value));
      if (currentTimer){
        currentTimer.resetIntervalIdle();
      }
      break;
  }
});

ipcRenderer.on('window', (event, {action}) => {
  if (!currentTimer){ return; }
  switch(action){
    case 'show':
      currentTimer.restoreFromTimestamp();
      break;
    case 'hide':
      currentTimer.storeToTimestamp();
      break;
    case 'quit':
      currentTimer.restoreFromTimestamp(false);
      break;
  }
});

ipcRenderer.on('timer', (ev, {action, mainWindowHidden}) => {
  if (!currentTimer){ return; }
  if (mainWindowHidden) {
    currentTimer.restoreFromTimestamp(false);
  }
  if (action === 'resume'){
    currentTimer.onContinue();
  }else if (action === 'pause'){
    currentTimer.onPause();
  }
  if (mainWindowHidden){
    currentTimer.storeToTimestamp();
  }
});

const IPC = {
  setupTimer(timer) {
    currentTimer = timer;
  },
  send(channel, ...args) {
    ipcRenderer.send(channel, ...args);
  }
};

export default IPC;