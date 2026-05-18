/**
 * Lightweight client-side cache registry.
 *
 * Usage in a thunk:
 *   condition: (arg) => arg?.force || !cache.isFresh(CACHE_KEYS.FACTORIES)
 *
 * Invalidate after a mutation:
 *   cache.invalidate(CACHE_KEYS.FACTORIES)
 *
 * Force refresh from a component:
 *   dispatch(fetchFactories({ force: true }))
 */

const registry = new Map();

export const CACHE_TTL = {
  SHORT:   2 * 60 * 1000,   //  2 minutes
  DEFAULT: 5 * 60 * 1000,   //  5 minutes
  LONG:   15 * 60 * 1000,   // 15 minutes
};

export const cache = {
  set: (key) => registry.set(key, Date.now()),

  isFresh: (key, ttl = CACHE_TTL.DEFAULT) => {
    const ts = registry.get(key);
    return ts !== undefined && (Date.now() - ts) < ttl;
  },

  invalidate: (...keys) => keys.forEach((k) => registry.delete(k)),

  invalidatePrefix: (prefix) => {
    for (const key of registry.keys()) {
      if (key.startsWith(prefix)) registry.delete(key);
    }
  },

  clear: () => registry.clear(),
};

export const CACHE_KEYS = {
  FACTORIES:       'factories',
  FACTORY:         (id) => `factory:${id}`,
  USERS:           (factoryId) => factoryId ? `users:factory:${factoryId}` : 'users:all',
  SUPPLIERS:       'suppliers',
  CUSTOMERS:       'customers',
  PRODUCTS:        'products',
  INTAKES:         'intakes',
  BATCHES:         'batches',
  SHIPMENTS:       'shipments',
  CREDITS:         'credits',
  FLAGS:           'flags',
};
