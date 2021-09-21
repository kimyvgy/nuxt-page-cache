const path = require('path');
const {serialize, deserialize} = require('./serializer');
const makeCache = require('./cache-builders');

function cleanIfNewVersion(cache, version) {
    if (!version) return;
    return cache.getAsync('appVersion')
        .then(function (oldVersion) {
            if (oldVersion !== version) {
                console.log(`Cache updated from ${oldVersion} to ${version}`);
                return cache.resetAsync();
                // unfortunately multi cache doesn't return a promise
                // and we can't await for it so as to store new version
                // immediately after reset.
            }
        });
}

function tryStoreVersion(cache, version) {
    if (!version || cache.versionSaved) return;
    return cache.setAsync('appVersion', version, {ttl: null})
        .then(() => { cache.versionSaved = true; });
}

module.exports = function pageCache(_nuxt, _options) {
    // used as a nuxt module, only config is provided as argument
    // and nuxt instance will be provided as this context
    const isNuxtModule = arguments.length < 2 && this.nuxt

    const nuxt = isNuxtModule ? this.nuxt : _nuxt
    const config = isNuxtModule
        ? Object.assign({}, this.options && this.options.cache, _nuxt)
        : _options

    if (config.enabled === false || !nuxt || !nuxt.renderer) {
        return;
    }

    if (!Object.keys(config) || !Array.isArray(config.pages) || !config.pages.length) {
        console.warn('nuxt-page-cache\'s configuration is missing.')
        return;
    }

    function isCacheFriendly(path, context) {
        if (typeof (config.isCacheable) === 'function') {
            return config.isCacheable(path, context);
        }

        return !context.res.spa &&
            config.pages.some(pat =>
                pat instanceof RegExp
                    ? pat.test(path)
                    : path.startsWith(pat)
        );
    }

    function defaultCacheKeyBuilder(route, context) {
        const hostname = context.req && context.req.hostname
            || context.req && context.req.host
            || context.req && context.req.headers && context.req.headers.host;

        if(!hostname) return;

        const cacheKey = config.useHostPrefix === true && hostname
            ? path.join(hostname, route)
            : route;

        return cacheKey;
    }

    function buildCacheKey(route, context) {
        if (!isCacheFriendly(route, context)) return { key: null }

        const keyConfig = (config.key || defaultCacheKeyBuilder)(route, context);

        return {
            key: typeof keyConfig === 'object' ? keyConfig.key : `${keyConfig}`,
            ttl: typeof keyConfig === 'object' ? keyConfig.ttl : config.store.ttl,
        }
    }

    const currentVersion = config.version || this.options && this.options.version;
    const cache = makeCache(config.store);
    cleanIfNewVersion(cache, currentVersion);

    const renderer = nuxt.renderer;
    const renderRoute = renderer.renderRoute.bind(renderer);
    renderer.renderRoute = function(route, context) {
        // hopefully cache reset is finished up to this point.
        tryStoreVersion(cache, currentVersion);

        const { key: cacheKey, ttl } = buildCacheKey(route, context)

        if (!cacheKey || !renderer.renderer.isReady) return renderRoute(route, context);

        function renderSetCache(){
            return renderRoute(route, context)
                .then(function(result) {
                    if (!result.error && !result.redirected) {
                        cache.setAsync(cacheKey, serialize(result), { ttl });
                    }
                    return result;
                });
        }

        return cache.getAsync(cacheKey)
            .then(function (cachedResult) {
                if (cachedResult) {
                    return deserialize(cachedResult);
                }

                return renderSetCache();
            })
            .catch(renderSetCache);
    };

    return cache;
};
