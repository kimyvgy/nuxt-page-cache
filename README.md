# @kimyvgy/nuxt-page-cache
[![NPM version](https://img.shields.io/npm/v/@kimyvgy/nuxt-page-cache.svg)](https://www.npmjs.com/package/@kimyvgy/nuxt-page-cache)

Page-level caching module for Nuxt.js (multi-stores).

This module is based on [arash16/nuxt-ssr-cache](https://github.com/arash16/nuxt-ssr-cache) with more features added.

## Supported Stores

- [Memory](#page-cache-options)
- [Redis](#redis-store)
- [Memcached](#memcached-store)
- [IORedis](#ioredis-store)
- [Multi cache layered](#multi-cache-layered)

## Installation

Install via NPM/Yarn:

```bash
# yarn
yarn add @kimyvgy/nuxt-page-cache

# or npm
npm install @kimyvgy/nuxt-page-cache
```

## Setup

### Configuration

Please activate this module in `nuxt.config.js`:
1. Passing options directly
```javascript
module.exports = {
    modules: [
        ['@kimyvgy/nuxt-page-cache', options],
        // ...
    ]
}
```
2. Or you can provide `cache` property in `nuxt.config.js`:
```javascript
module.exports = {
    modules: [
        '@kimyvgy/nuxt-page-cache',
        // ...
    ],

    cache: {
        // ...
    },
}
```

### Page Cache Options

```javascript
module.exports = {
  // ....

  modules: [
    '@kimyvgy/nuxt-page-cache',
  ],

  cache: {
    // enable page-cache module for the production only
    enabled: process.env.NODE_ENV === 'production',

    // add x-cache-status header into response:
    // MISS: The page was not found in Cache Storage
    // HIT: The page was found in Cache Storage
    // NONE: The page is not eligible for caching
    cacheStatusHeader: 'x-cache-status',

    // If you provide a version, it will be stored inside cache.
    // Later when you deploy a new version, old cache will be
    // automatically purged.
    // EX: `myapp.v${pkg.version}-build-${process.env.CI_BUILD_NUMBER}`
    version: pkg.version,

    // if you're serving multiple host names (with differing
    // results) from the same server, set this option to true.
    // (cache keys will be prefixed by your host name)
    // if your server is behind a reverse-proxy, please use
    // express or whatever else that uses 'X-Forwarded-Host'
    // header field to provide req.hostname (actual host name)
    useHostPrefix: false,

    pages: [
      // these are prefixes of pages that need to be cached
      // if you want to cache all pages, just include '/'
      '/page1', // will cache all pages: /page1*
      '/page2', // will cache all pages: /page2*

      // you can also pass a regular expression to test a path
      /^\/page3\/\d+$/,

      // to cache only root route, use a regular expression
      /^\/$/, // will cache only for homepage: /
    ],

    key(route, context) {
      // custom function to return cache key, when used previous
      // properties (useHostPrefix, pages) are ignored.
      // - return falsy value to bypass the cache
      // - return string value to cache this page with default TTL value.
      // - return { key: "your_cache_key", ttl: 84600 }
      //    to return cache key with customized TTL value.
      if (/\/articles\/.+/.test(context.req.url)) {
        return { key: context.req.url, ttl: 84600 } // 1 day for page: /articles/*
      }
    },

    // if you don't use `pages` property, you can define `isCacheable` instead
    /*
    isCacheable(route, context) {
        // custom function to decide this page that need to be cached,
        // when used the "pages" property will be ignored.
        // return falsy to bypass the cache.
    },
    */

    // cache storage configuration
    store: {
      type: 'memory',

      // maximum number of pages to store in memory
      // if limit is reached, least recently used page
      // is removed.
      max: 100,

      // number of seconds to store this page in cache,
      // default TTL value for all pages.
      ttl: 60,
    },
  },

  // ...
};
```

### `redis` store

```javascript
module.exports = {
  // ....
  cache: {
    // ....
    store: {
      type: 'redis',
      host: 'localhost',
      ttl: 10 * 60,
      configure: [
        // these values are configured
        // on redis upon initialization
        ['maxmemory', '200mb'],
        ['maxmemory-policy', 'allkeys-lru'],
      ],
    },
  },
}
```
Uses [cache-manager-redis](https://www.npmjs.com/package/cache-manager-redis) under the hood.

### `memcached` store

```javascript
module.exports = {
  // ....
  cache: {
    // ....
    store: {
      type: 'memcached',
      options: {
        hosts: ['127.0.0.1:11211'],
      },
    },
  },
}
```
Uses [cache-manager-memcached-store](https://www.npmjs.com/package/cache-manager-memcached-store) under the hood.

### `ioredis` store

```javascript
module.exports = {
  // ....
  cache: {
    // ....
    store: {
      type: 'ioredis',
      options: {
        hosts: ['localhost:6379'],
      },
    },
  },
}
```
Uses [cache-manager-ioredis](https://www.npmjs.com/package/cache-manager-ioredis) under the hood.

### `multi` cache (layered)

```javascript
module.exports = {
  // ....
  cache: {
    // ....
    store: {
      // multi cache stores pages in all caches
      // later tries to read them in sequential order
      // in this example it first tries to read from memory
      // if not found, it tries to read from redis
      type: 'multi',
      stores: [
        { type: 'memory', /* ... */ },
        { type: 'redis', /* ... */ },
      ],
    },
  },
}
```

## Notes

- `version` property can define at root-level of `nuxt.config.js` or inside module options.
- `version` value must be uniqued for each release to make sure the cached pages are pured after deploying to production. Your code changed -> content hash changed -> assets URL changed. I recommend to use CI build number if you are using CI/CD.

## License
MIT
