import { createStore, applyMiddleware } from 'redux';
import storage from '../modules/storage';
import reducers from './reducers/index.js';


const initialState = storage.store;

export default createStore(reducers, {
  user: initialState.user,
  settings: initialState.settings
});
