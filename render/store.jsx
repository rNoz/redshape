import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import _get from 'lodash/get';

import storage from '../common/storage';
import reducers from './reducers/index';
import notificationMiddleware from './middlewares/notification.middleware';

const initialState = storage.store;

const user = _get(initialState, 'user', {});
const { id, redmineEndpoint } = user;
const userSettings = _get(initialState, `settings.${redmineEndpoint}.${id}`);

import { migrateSettings, migrateTracking } from '../common/migrations';

export default createStore(reducers, {
  user,
  settings: migrateSettings(userSettings),
  projects: initialState.projects,
  tracking: migrateTracking(initialState.time_tracking)
},
applyMiddleware(thunk, notificationMiddleware));
