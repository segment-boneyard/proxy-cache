# proxy-cache

  A proxying in-memory cache for node.

## Installation

    $ npm install segmentio/proxy-cache

## Examples

```js
var DB = require('db');
var cache = require('proxy-cache');

var db = new DB();
db.getUserById('id', function (err, user) {
  // fetches `user` from the db
});

db = cache(new DB(), ['getUserById']);
db.getUserById('id', function (err, user) {
  // fetches the user from the db 
  // and caches it in memory as `getUserById:id`
  db.getUserById('id', function (err, user) {
    // this lookup fetches `user` directly the from the cache
  });
});
```

## API

### .cache(instance, methods, options)
  
  Generate a proxying cache, with all properties of `instance` fully proxied, and all instance `methods` wrapped with a cache. You can also pass in optional `options`, which line up exactly with [isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache#options) options. Here are the defaults:

```js
{
  max: 10000,
  maxAge: ms('1m'),
  stale: false,
  peek: true, // peek by default so maxAge is honored
  tombstone: true // save undefined values returned as well
}
```

## License

```
WWWWWW||WWWWWW
 W W W||W W W
      ||
    ( OO )__________
     /  |           \
    /o o|    MIT     \
    \___/||_||__||_|| *
         || ||  || ||
        _||_|| _||_||
       (__|__|(__|__|
```
