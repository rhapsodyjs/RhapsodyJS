'use strict';

var chai = require('chai'),
    supertest = require('supertest'),
    request = require('request'),
    util = require('util'),
    http = require('https');

chai.expect();
chai.should();
var expect = chai.expect;

var server = require('./testProject/app'),
    app;


describe('RhapsodyJS HTTPS tests', function() {

    before(function() {
        server.open();
        app = server.app;
    });

    after(function() {
        server.close();
    });

    it('Index via HTTP and HTTPS must have the same result', function(done) {
      supertest(app)
      .get('/')
      .expect(200)
      .end(function(err, res) {
        expect(res.status).to.equal(200);

        request({url: 'https://localhost:4243/', rejectUnauthorized : false}, function(err, secondRes, body) {
          expect(err).to.not.exist;
          expect(res.text).to.be.eql(body);
          done();
        });
      });
    });
});

