import { replaceData, noop, timeUntilStale, getAbortController } from './utils.mjs';
import { defaultLogger } from './logger.mjs';
import { notifyManager } from './notifyManager.mjs';
import { createRetryer, isCancelledError, canFetch } from './retryer.mjs';
import { Removable } from './removable.mjs';

// CLASS
class Query extends Removable {
  constructor(config) {
    super();
    this.abortSignalConsumed = false;
    this.defaultOptions = config.defaultOptions;
    this.setOptions(config.options);
    this.observers = [];
    this.cache = config.cache;
    this.logger = config.logger || defaultLogger;
    this.queryKey = config.queryKey;
    this.queryHash = config.queryHash;
    this.initialState = config.state || getDefaultState(this.options);
    this.state = this.initialState;
    this.scheduleGc();
  }

  get meta() {
    return this.options.meta;
  }

  setOptions(options) {
    this.options = { ...this.defaultOptions,
      ...options
    };
    this.updateCacheTime(this.options.cacheTime);
  }

  optionalRemove() {
    if (!this.observers.length && this.state.fetchStatus === 'idle') {
      this.cache.remove(this);
    }
  }

  setData(newData, options) {
    const data = replaceData(this.state.data, newData, this.options); // Set data and mark it as cached

    this.dispatch({
      data,
      type: 'success',
      dataUpdatedAt: options == null ? void 0 : options.updatedAt,
      manual: options == null ? void 0 : options.manual
    });
    return data;
  }

  setState(state, setStateOptions) {
    this.dispatch({
      type: 'setState',
      state,
      setStateOptions
    });
  }

  cancel(options) {
    var _this$retryer;

    const promise = this.promise;
    (_this$retryer = this.retryer) == null ? void 0 : _this$retryer.cancel(options);
    return promise ? promise.then(noop).catch(noop) : Promise.resolve();
  }

  destroy() {
    super.destroy();
    this.cancel({
      silent: true
    });
  }

  reset() {
    this.destroy();
    this.setState(this.initialState);
  }

  isActive() {
    return this.observers.some(observer => observer.options.enabled !== false);
  }

  isDisabled() {
    return this.getObserversCount() > 0 && !this.isActive();
  }

  isStale() {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || this.observers.some(observer => observer.getCurrentResult().isStale);
  }

  isStaleByTime(staleTime = 0) {
    return this.state.isInvalidated || !this.state.dataUpdatedAt || !timeUntilStale(this.state.dataUpdatedAt, staleTime);
  }

  onFocus() {
    var _this$retryer2;

    const observer = this.observers.find(x => x.shouldFetchOnWindowFocus());

    if (observer) {
      observer.refetch({
        cancelRefetch: false
      });
    } // Continue fetch if currently paused


    (_this$retryer2 = this.retryer) == null ? void 0 : _this$retryer2.continue();
  }

  onOnline() {
    var _this$retryer3;

    const observer = this.observers.find(x => x.shouldFetchOnReconnect());

    if (observer) {
      observer.refetch({
        cancelRefetch: false
      });
    } // Continue fetch if currently paused


    (_this$retryer3 = this.retryer) == null ? void 0 : _this$retryer3.continue();
  }

  addObserver(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer); // Stop the query from being garbage collected

      this.clearGcTimeout();
      this.cache.notify({
        type: 'observerAdded',
        query: this,
        observer
      });
    }
  }

  removeObserver(observer) {
    if (this.observers.includes(observer)) {
      this.observers = this.observers.filter(x => x !== observer);

      if (!this.observers.length) {
        // If the transport layer does not support cancellation
        // we'll let the query continue so the result can be cached
        if (this.retryer) {
          if (this.abortSignalConsumed) {
            this.retryer.cancel({
              revert: true
            });
          } else {
            this.retryer.cancelRetry();
          }
        }

        this.scheduleGc();
      }

      this.cache.notify({
        type: 'observerRemoved',
        query: this,
        observer
      });
    }
  }

  getObserversCount() {
    return this.observers.length;
  }

  invalidate() {
    if (!this.state.isInvalidated) {
      this.dispatch({
        type: 'invalidate'
      });
    }
  }

  fetch(options, fetchOptions) {
    var _this$options$behavio, _context$fetchOptions;

    if (this.state.fetchStatus !== 'idle') {
      if (this.state.dataUpdatedAt && fetchOptions != null && fetchOptions.cancelRefetch) {
        // Silently cancel current fetch if the user wants to cancel refetches
        this.cancel({
          silent: true
        });
      } else if (this.promise) {
        var _this$retryer4;

        // make sure that retries that were potentially cancelled due to unmounts can continue
        (_this$retryer4 = this.retryer) == null ? void 0 : _this$retryer4.continueRetry(); // Return current promise if we are already fetching

        return this.promise;
      }
    } // Update config if passed, otherwise the config from the last execution is used


    if (options) {
      this.setOptions(options);
    } // Use the options from the first observer with a query function if no function is found.
    // This can happen when the query is hydrated or created with setQueryData.


    if (!this.options.queryFn) {
      const observer = this.observers.find(x => x.options.queryFn);

      if (observer) {
        this.setOptions(observer.options);
      }
    }

    if (!Array.isArray(this.options.queryKey)) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error("As of v4, queryKey needs to be an Array. If you are using a string like 'repoData', please change it to an Array, e.g. ['repoData']");
      }
    }

    const abortController = getAbortController(); // Create query function context

    const queryFnContext = {
      queryKey: this.queryKey,
      pageParam: undefined,
      meta: this.meta
    }; // Adds an enumerable signal property to the object that
    // which sets abortSignalConsumed to true when the signal
    // is read.

    const addSignalProperty = object => {
      Object.defineProperty(object, 'signal', {
        enumerable: true,
        get: () => {
          if (abortController) {
            this.abortSignalConsumed = true;
            return abortController.signal;
          }

          return undefined;
        }
      });
    };

    addSignalProperty(queryFnContext); // Create fetch function

    const fetchFn = () => {
      if (!this.options.queryFn) {
        return Promise.reject("Missing queryFn for queryKey '" + this.options.queryHash + "'");
      }

      this.abortSignalConsumed = false;
      return this.options.queryFn(queryFnContext);
    }; // Trigger behavior hook


    const context = {
      fetchOptions,
      options: this.options,
      queryKey: this.queryKey,
      state: this.state,
      fetchFn
    };
    addSignalProperty(context);
    (_this$options$behavio = this.options.behavior) == null ? void 0 : _this$options$behavio.onFetch(context); // Store state in case the current fetch needs to be reverted

    this.revertState = this.state; // Set to fetching state if not already in it

    if (this.state.fetchStatus === 'idle' || this.state.fetchMeta !== ((_context$fetchOptions = context.fetchOptions) == null ? void 0 : _context$fetchOptions.meta)) {
      var _context$fetchOptions2;

      this.dispatch({
        type: 'fetch',
        meta: (_context$fetchOptions2 = context.fetchOptions) == null ? void 0 : _context$fetchOptions2.meta
      });
    }

    const onError = error => {
      // Optimistically update state if needed
      if (!(isCancelledError(error) && error.silent)) {
        this.dispatch({
          type: 'error',
          error: error
        });
      }

      if (!isCancelledError(error)) {
        var _this$cache$config$on, _this$cache$config, _this$cache$config$on2, _this$cache$config2;

        // Notify cache callback
        (_this$cache$config$on = (_this$cache$config = this.cache.config).onError) == null ? void 0 : _this$cache$config$on.call(_this$cache$config, error, this);
        (_this$cache$config$on2 = (_this$cache$config2 = this.cache.config).onSettled) == null ? void 0 : _this$cache$config$on2.call(_this$cache$config2, this.state.data, error, this);

        if (process.env.NODE_ENV !== 'production') {
          this.logger.error(error);
        }
      }

      if (!this.isFetchingOptimistic) {
        // Schedule query gc after fetching
        this.scheduleGc();
      }

      this.isFetchingOptimistic = false;
    }; // Try to fetch the data


    this.retryer = createRetryer({
      fn: context.fetchFn,
      abort: abortController == null ? void 0 : abortController.abort.bind(abortController),
      onSuccess: data => {
        var _this$cache$config$on3, _this$cache$config3, _this$cache$config$on4, _this$cache$config4;

        if (typeof data === 'undefined') {
          if (process.env.NODE_ENV !== 'production') {
            this.logger.error("Query data cannot be undefined. Please make sure to return a value other than undefined from your query function. Affected query key: " + this.queryHash);
          }

          onError(new Error(this.queryHash + " data is undefined"));
          return;
        }

        this.setData(data); // Notify cache callback

        (_this$cache$config$on3 = (_this$cache$config3 = this.cache.config).onSuccess) == null ? void 0 : _this$cache$config$on3.call(_this$cache$config3, data, this);
        (_this$cache$config$on4 = (_this$cache$config4 = this.cache.config).onSettled) == null ? void 0 : _this$cache$config$on4.call(_this$cache$config4, data, this.state.error, this);

        if (!this.isFetchingOptimistic) {
          // Schedule query gc after fetching
          this.scheduleGc();
        }

        this.isFetchingOptimistic = false;
      },
      onError,
      onFail: (failureCount, error) => {
        this.dispatch({
          type: 'failed',
          failureCount,
          error
        });
      },
      onPause: () => {
        this.dispatch({
          type: 'pause'
        });
      },
      onContinue: () => {
        this.dispatch({
          type: 'continue'
        });
      },
      retry: context.options.retry,
      retryDelay: context.options.retryDelay,
      networkMode: context.options.networkMode
    });
    this.promise = this.retryer.promise;
    return this.promise;
  }

  dispatch(action) {
    const reducer = state => {
      var _action$meta, _action$dataUpdatedAt;

      switch (action.type) {
        case 'failed':
          return { ...state,
            fetchFailureCount: action.failureCount,
            fetchFailureReason: action.error
          };

        case 'pause':
          return { ...state,
            fetchStatus: 'paused'
          };

        case 'continue':
          return { ...state,
            fetchStatus: 'fetching'
          };

        case 'fetch':
          return { ...state,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: (_action$meta = action.meta) != null ? _action$meta : null,
            fetchStatus: canFetch(this.options.networkMode) ? 'fetching' : 'paused',
            ...(!state.dataUpdatedAt && {
              error: null,
              status: 'loading'
            })
          };

        case 'success':
          return { ...state,
            data: action.data,
            dataUpdateCount: state.dataUpdateCount + 1,
            dataUpdatedAt: (_action$dataUpdatedAt = action.dataUpdatedAt) != null ? _action$dataUpdatedAt : Date.now(),
            error: null,
            isInvalidated: false,
            status: 'success',
            ...(!action.manual && {
              fetchStatus: 'idle',
              fetchFailureCount: 0,
              fetchFailureReason: null
            })
          };

        case 'error':
          const error = action.error;

          if (isCancelledError(error) && error.revert && this.revertState) {
            return { ...this.revertState
            };
          }

          return { ...state,
            error: error,
            errorUpdateCount: state.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: state.fetchFailureCount + 1,
            fetchFailureReason: error,
            fetchStatus: 'idle',
            status: 'error'
          };

        case 'invalidate':
          return { ...state,
            isInvalidated: true
          };

        case 'setState':
          return { ...state,
            ...action.state
          };
      }
    };

    this.state = reducer(this.state);
    notifyManager.batch(() => {
      this.observers.forEach(observer => {
        observer.onQueryUpdate(action);
      });
      this.cache.notify({
        query: this,
        type: 'updated',
        action
      });
    });
  }

}

function getDefaultState(options) {
  const data = typeof options.initialData === 'function' ? options.initialData() : options.initialData;
  const hasData = typeof data !== 'undefined';
  const initialDataUpdatedAt = hasData ? typeof options.initialDataUpdatedAt === 'function' ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt : 0;
  return {
    data,
    dataUpdateCount: 0,
    dataUpdatedAt: hasData ? initialDataUpdatedAt != null ? initialDataUpdatedAt : Date.now() : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: false,
    status: hasData ? 'success' : 'loading',
    fetchStatus: 'idle'
  };
}

export { Query };
//# sourceMappingURL=query.mjs.map
