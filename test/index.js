
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
});