
var assert = require('assert');
var clone = require('clone');
var Batch = require('batch');
var cache = require('..');


function DB () {
  this.db = {};
  this.saves = 0;
  this.queries = 0;
}

DB.prototype.save = function (obj) {
  this.db[obj.id] = obj;
  this.saves += 1;
};

DB.prototype.getAndError = function (id, callback) {
  setImmediate(function(){
    callback(new Error('DB Failure'));
  });
};

DB.prototype.getById = function (id, callback) {
  var self = this;
  setImmediate(function(){
    self.queries += 1;
    callback(null, self.db[id]);
  });
};

DB.prototype.getByType = function (type, id, callback) {
  this.getById(id, callback);
};

describe('proxy-cache', function () {
  it('should proxy all methods', function () {
    var db = cache(new DB(), ['getAndError', 'getById']);
    assert(typeof db.save === 'function');
    assert(typeof db.getAndError === 'function');
    assert(typeof db.getById === 'function');
  });

  it('should pass through non wrapped methods', function () {
    var db = cache(new DB(), ['getAndError', 'getById']);
    db.save({ id: 'id' });
    assert(db.parent.saves === 1);
  });

  it('should pass through wrapped methods', function (done) {
    var db = cache(new DB(), ['getAndError', 'getById']);
    var obj = { id: 'id' };
    db.save(obj);
    db.getById(obj.id, function (err, result) {
      assert(!err);
      assert.deepEqual(obj, result);
      assert(db.parent.queries === 1);
      done();
    });
  });

  it('should pass through errors', function (done) {
    var db = cache(new DB(), ['getAndError', 'getById']);
    db.getAndError('id', function (err, result) {
      assert(err);
      done();
    });
  });

  it('should cache results', function (done) {
    var db = cache(new DB(), ['getAndError', 'getById']);
    var obj = { id: 'id' };
    db.save(obj);
    db.getById(obj.id, function (err, result) {
      assert(!err);
      assert.deepEqual(obj, result);
      assert(db.parent.queries === 1);
      db.getById(obj.id, function (err, result) {
        assert(!err);
        assert.deepEqual(obj, result);
        assert(db.parent.queries === 1);
        done();
      });
    });
  });

  it('should cache with arity > 1', function (done) {
    var db = cache(new DB(), ['getAndError', 'getById', 'getByType']);
    var obj = { id: 'id' };
    db.save(obj);
    db.getByType('type', obj.id, function (err, result) {
      assert(!err);
      assert.deepEqual(obj, result);
      assert(db.parent.queries === 1);
      db.getByType('type', obj.id, function (err, result) {
        assert(!err);
        assert.deepEqual(obj, result);
        assert(db.parent.queries === 1);
        done();
      });
    });
  });

  it('should callback asynchronously', function (done) {
    var db = cache(new DB(), ['getById']);
    var obj = { id: 'id' };
    db.save(obj);
    db.getById(obj.id, function (err, result) {
      assert(!err);
      assert.deepEqual(obj, result);
      assert(db.parent.queries === 1);
      var async;
      db.getById(obj.id, function (err, result) {
        assert(async);
        done();
      });
      async = true;
    });
  });

  it('should cache empty entries', function (done) {
    var db = cache(new DB(), ['getById']);
    var id = 'non-existant';
    db.getById(id, function (err, result) {
      assert(!err);
      assert.equal(result, undefined);
      assert.equal(db.parent.queries, 1);
      db.getById(id, function (err, result) {
        assert(!err);
        assert.equal(result, undefined);
        assert.equal(db.parent.queries, 1);
        done()
      })
    })
  });

  it('should incr a miss', function(done){
    var stats = memstats();
    var db = cache(new DB(), ['getById'], { stats: stats });
    db.getById('miss', function(err){
      if (err) return done(err);
      assert.deepEqual(stats.counts, [
        ['proxy-cache.calls', 1, ['method:getById']],
        ['proxy-cache.miss', 1, ['method:getById']]
      ]);
      done();
    });
  })

  it('should incr a hit', function(done){
    var stats = memstats();
    var db = cache(new DB(), ['getById'], { stats: stats });
    db.save({ id: 1 });
    db.getById(1, function(err){
      if (err) return done(err);
      db.getById(1, function(err){
        if (err) return done(err);
        assert.deepEqual(stats.counts, [
          ['proxy-cache.calls', 1, ['method:getById']],
          ['proxy-cache.miss', 1, ['method:getById']],
          ['proxy-cache.calls', 1, ['method:getById']],
          ['proxy-cache.hit', 1, ['method:getById']]
        ]);
        done();
      });
    });
  })

  it('should track method durations', function(done){
    var stats = memstats();
    var db = cache(new DB(), ['getById'], { stats: stats });
    db.save({ id: 1 });
    db.getById(1, function(err){
      if (err) return done(err);
      db.getById(1, function(err){
        if (err) return done(err);
        assert.equal(1, stats.timers.length);
        assert.equal('proxy-cache.duration', stats.timers[0][0]);
        assert.equal('number', typeof stats.timers[0][1]);
        assert.deepEqual(['method:getById'], stats.timers[0][2]);
        done();
      });
    });
  })

  it('should gauge cache size', function(done){
    var stats = memstats();
    var db = cache(new DB(), ['getById'], { stats: stats });
    db.save({ id: 1 });
    db.getById(1, function(err){
      if (err) return done(err);
      db.getById(1, function(err){
        if (err) return done(err);
        assert.deepEqual(stats.gauges, [
          ['proxy-cache.size', 0, ['method:getById']],
          ['proxy-cache.size', 1, ['method:getById']]
        ]);
        done();
      });
    });
  });

  it('should shallow clone', function(done){
    var db = cache(new DB(), ['getById']);
    var item = { stuff: [], id: 1 };
    db.save(item);
    db.getById(item.id, function(err){
      if (err) return done(err);
      db.getById(item.id, function(err, res){
        if (err) return done(err);
        assert(item.stuff == res.stuff, 'expected shallow clone');
        assert(item != res);
        done();
      });
    });
  });

  it('should queue extra callbacks', function(done){
    var db = cache(new DB, ['getById']);
    var item = { stuff: [], id: 1 };
    db.save(item);

    var batch = new Batch;

    for (var i = 0; i < 10; i++) {
      batch.push(function(done){
        db.getById(1, done);
      });
    }

    batch.end(function(err, results){
      if (err) return done(err);
      assert.equal(10, results.length);
      assert.equal(1, db.parent.queries, 'expected a single query');
      done();
    });
  });
});

function memstats(){
  return {
    gauges: [],
    counts: [],
    timers: [],
    gauge: function(key, count, tags){
      this.gauges.push([key, count, tags]);
    },
    incr: function(key, count, tags){
      this.counts.push([key, count, tags]);
    },
    timer: function(key, ms, tags){
      this.timers.push([key, ms, tags]);
    }
  };
}
