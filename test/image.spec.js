'use strict';

var rewire = require('rewire');
var img = rewire('../lib/image.js');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon');

describe('image', function() {

  var mockImage = {
      name: 'myimagename',
      src: '/my/path/1/'
    };
  var mockDockerApi = {
      buildImage: function() {},
      pull: function() {}
    };
  var mockStreamApi = {
      on: function() {}
    };
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  img.__set__('docker', mockDockerApi);

  describe('#pull()', function() {

    it('Should call Docker.pull with the correct args.', function() {
      // setup stubs
      var stubPull = sandbox.stub(mockDockerApi, 'pull', function(name, cb) {
          cb(null, mockStreamApi);
        });
      var stubOn = sandbox.stub(mockStreamApi, 'on');

      // run unit being tested
      img.pull(mockImage, function() {});

      // verify
      sinon.assert.calledWithExactly(stubPull, 'myimagename', sinon.match.func);
      sinon.assert.callCount(stubPull, 1);

      sinon.assert.calledWithExactly(stubOn, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stubOn, 'end', sinon.match.func);
      sinon.assert.callCount(stubOn, 2);
    });

    it('Should throw an error when Docker.pull returns an error.', function() {
      // setup stubs
      var stub = sandbox.stub(mockDockerApi, 'pull', function(name, cb) {
        cb(new Error('Test Error!'));
      });
      // run unit being tested
      var fn = function() {
        img.pull(mockImage, function() {});
      };
      // verify
      expect(fn).to.throw('Test Error!');
    });

    it('should complete after stream.on(end) is called.', function(done) {
      // setup stubs
      var onEnd;
      var stubPull = sandbox.stub(mockDockerApi, 'pull', function(name, cb) {
        cb(null, mockStreamApi);
        onEnd();
      });
      var stubOn = sandbox.stub(mockStreamApi, 'on', function(key, cb) {
        if (key === 'data') {
          // do nothing
        } else if (key === 'end') {
          onEnd = cb;
        } else {
          assert.notOk(key, 'should be unreachable');
        }
      });
      // run unit being testing
      img.pull(mockImage, function(err, data) {
        // verify
        expect(err).to.equal(null);
        expect(data).to.equal(undefined);
        done();
      });
    });

    it('should throw an error when dockerode streams back an error.', function() {
      // setup stubs
      var onData;
      var stubPull = sandbox.stub(mockDockerApi, 'pull', function(name, cb) {
        cb(null, mockStreamApi);
        onData('{"errorDetail":{"message":"elvis lives!"}}');
      });
      var stubOn = sandbox.stub(mockStreamApi, 'on', function(key, cb) {
        if (key === 'data') {
          onData = cb;
        } else if (key === 'end') {
          // do nothing
        } else {
          assert.notOk(key, 'should be unreachable');
        }
      });
      // run unit being tested
      var fn = function() {
        img.pull(mockImage, function() {});
      };
      // verify
      expect(fn).to.throw(Error, /elvis lives/);
    });

  });

  describe('#build()', function() {

    it('Should call Docker.buildImage with the correct args.', function() {
      // mocks
      var mockPath = {
          resolve: function() {}
        };
      var mockProcess = {
          chdir: function() {}
        };
      var mockFs = {
          createReadStream: function() {}
        };
      var mockStream = {
          on: function() {}
        };

      // setup
      var stubBuildImage = sandbox.stub(mockDockerApi, 'buildImage',
          function(data, name, cb) {
            cb(null, mockStream);
          });
      var stubResolve = sandbox.stub(mockPath, 'resolve', path.join);
      var stubChdir = sandbox.stub(mockProcess, 'chdir');
      var stubFs = sandbox.stub(mockFs, 'createReadStream');
      var stubOn = sandbox.stub(mockStream, 'on');

      // setup injected mocks
      img.__set__('path', mockPath);
      img.__set__('process', mockProcess);
      img.__set__('fs', mockFs);
      img.__set__('exec', function(cmd, cb) {
        cb(null, null, null);
      });

      // run unit being tested
      img.build(mockImage, function() {});

      // verify
      sinon.assert.calledWithExactly(stubResolve, '/my/path/1/', 'archive.tar');
      sinon.assert.callCount(stubResolve, 1);

      sinon.assert.calledWithExactly(stubChdir, '/my/path/1/');
      sinon.assert.callCount(stubChdir, 1);

      sinon.assert.calledWithExactly(stubFs, '/my/path/1/archive.tar');
      sinon.assert.callCount(stubFs, 1);

      sinon.assert.calledWithExactly(stubBuildImage,
        sinon.match.undefined, {
          t: 'myimagename'
        },
        sinon.match.func
      );
      sinon.assert.callCount(stubBuildImage, 1);

      sinon.assert.calledWithExactly(stubOn, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stubOn, 'end', sinon.match.func);
      sinon.assert.callCount(stubOn, 2);
    });

  });

});
