
# proxy-cache

  A proxying in-memory cache for node.

## Examples

```js
var DB = require('db');
var cache = require('proxy-cache');

var db = new DB();
db.getUserById('id', function (err, user) {
  // fetches `user` from the db
});

var cached = cache(new DB(), ['getUserById']);
db.getUserById('id', function (err, user) {
  // fetches the user from the db 
  // and caches it in memory as `getUserById:id`
  db.getUserById('id', function (err, user) {
    // this lookup fetches `user` directly the from the cache
  });
});
```

## API

### .ProxyCache(instance, methods, options)
  
  Generate a proxying a cache, with all properties of `instance` fully proxied, and all instance `methods` wrapped with a cache.

  You can also optionally pass in custom options, which line up exactly with [isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache#options) options. Defaults:

```js
{
  max    : 10000,
  maxAge : ms('1m'),
  stale  : false,
  peek   : true // peek by default so maxAge is honored.
}
```