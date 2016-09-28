import { createStore,
         combineReducers,
         applyMiddleware,
         compose }                from 'redux';
import { routerMiddleware }       from 'react-router-redux';
import promiseMiddleware          from '../middleware/promiseMiddleware';
import DevTools                   from '../containers/DevTools';
import thunk                      from 'redux-thunk';
import rootReducer                from '../reducers';

export default function configureStore(history, initialState) {


  const enhancer = compose(
    applyMiddleware(thunk, routerMiddleware(history), promiseMiddleware),
    DevTools.instrument());

  const store = createStore(rootReducer, initialState, enhancer);

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers', () => {
      const nextRootReducer = require('../reducers');
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}
