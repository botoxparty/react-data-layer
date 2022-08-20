import React, {
  createContext,
  ReactElement,
  ReactNode,
  startTransition,
  useContext,
  useEffect,
  useState,
} from 'react';

// Context for providing the data cache
const Context = createContext<Map<string, DataState>>(null as never);

// Root global cache
const globalCache = new Map<string, DataState>();

interface CacheProviderProps {
  cache?: Map<string, DataState>;
  children: ReactNode;
}

enum CacheState {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
}

// Cache provider component
export function CacheProvider({
  cache,
  children,
}: CacheProviderProps): ReactElement {
  const _cache =
    cache ?? // Use the cache provided from props if it exists
    (typeof window !== 'undefined'
      ? globalCache // Or use the global cache if it's a browser
      : new Map<string, DataState>()); // Or create a new cache if it's server

  return <Context.Provider value={_cache}>{children}</Context.Provider>;
}

// Type for representing the state of the (simulated) data fetching
export type DataState =
  | {
      state: CacheState.PENDING;
      promise: Promise<any>;
    }
  | {
      state: CacheState.FULFILLED;
      value: any;
    };

declare global {
  interface Window {
    globalCache?: Map<string, DataState>;
    dataCaches?: { key: string; value: string }[];
    putCache?: (key: string, value: string) => void;
  }
}

// Declare globals if it's browser
if (typeof window !== 'undefined') {
  window.globalCache = globalCache;
  // Fill cache if there's any data that are already provided from the DOM content
  if (window.dataCaches) {
    for (const { key, value } of window.dataCaches) {
      globalCache.set(key, { state: CacheState.FULFILLED, value });
    }
  }
  // Declare a global way to put content in the cache
  window.putCache = (k, v): void => {
    globalCache.set(k, { state: CacheState.FULFILLED, value: v });
  };
  delete window.dataCaches;
}

// Hook for loading the data in React components
export function useData<T>(
  id: string,
  fetch: () => Promise<T>
): {
  value: T;
  loadScript: ReactElement | null;
} {
  const cache = useContext(Context);
  const [initialRender, setInitialRender] = useState(true);
  let cacheData = cache.get(id);

  // Initialize cache if there's no state with the id
  if (!cacheData) {
    cache.set(
      id,
      (cacheData = {
        state: CacheState.PENDING,
        // Simulated network request
        promise: fetch().then(async (value) => {
          cache.set(id, {
            state: CacheState.FULFILLED,
            value,
          });
          return value;
        }),
      })
    );
    cacheData = cacheData as DataState;
  }

  // Throw if it's still pending
  if (cacheData.state === CacheState.PENDING) {
    throw cacheData.promise;
  }

  useEffect(() => {
    startTransition(() => setInitialRender(false));
  }, [setInitialRender]);

  const cacheValue = JSON.stringify(cacheData.value);

  return {
    // Return the value
    value: cacheData.value,
    // And a load script that injects the data that it depends to the global cache on browser
    loadScript: initialRender ? (
      <script
        dangerouslySetInnerHTML={{
          __html: `
              window.putCache ? 
              window.putCache("${id}", ${cacheValue}) : 
              (window.dataCaches = [...(window.dataCaches ?? []), { key: "${id}", value: ${cacheValue} }])
            `,
        }}
      />
    ) : null,
  };
}

interface DataConsumerProps<T> {
  id: string;
  children: (data: T) => JSX.Element;
  fetch: () => Promise<T>;
}
export function DataConsumer<T>({
  id,
  children,
  fetch,
}: DataConsumerProps<T>): ReactElement {
  const { value, loadScript } = useData<T>(id, fetch);
  return (
    <>
      {loadScript}
      {children(value)}
    </>
  );
}
