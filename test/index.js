
var assert = require('assert');
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
  return callback(new Error('DB Failure'));
};

DB.prototype.getById = function (id, callback) {
  this.queries += 1;
  return callback(null, this.db[id]);
};

DB.prototype.getByType = function (type, id, callback) {
  this.queries += 1;
  return callback(null, this.db[id]);
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
        ['calls', 1, ['method:getById']],
        ['miss', 1, ['method:getById']]
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
          ['calls', 1, ['method:getById']],
          ['miss', 1, ['method:getById']],
          ['calls', 1, ['method:getById']],
          ['hit', 1, ['method:getById']]
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
        assert.equal('duration', stats.timers[0][0]);
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
          ['size', 0, ['method:getById']],
          ['size', 1, ['method:getById']]
        ]);
        done();
      });
    });
  })
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
