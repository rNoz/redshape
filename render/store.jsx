import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import _get from 'lodash/get';

import storage from '../common/storage';
import reducers from './reducers/index';
import notificationMiddleware from './middlewares/notification.middleware';

import { migrateSettings, migrateTracking } from '../common/migrations';

const initialState = storage.store;

const user = _get(initialState, 'user', {});
const { id, redmineEndpoint } = user;
const userSettings = _get(initialState, `settings.${redmineEndpoint}.${id}`);

export default createStore(reducers, {
  user,
  settings: migrateSettings(userSettings, user),
  projects: initialState.projects,
  tracking: migrateTracking(initialState.time_tracking, user)
},
applyMiddleware(thunk, notificationMiddleware));
