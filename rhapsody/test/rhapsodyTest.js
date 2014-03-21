'use strict';

var chai = require('chai'),
    request = require('supertest'),
    util = require('util');

chai.expect();
chai.should();
var expect = chai.expect;

var server = require('./testProject/app'),
    app;


describe('RhapsodyJS common tests', function() {

    before(function() {
        server.open();
        app = server.app;
    });

    after(function() {
        server.close();
    });

    it('Main controller should not need to be named and responses must be equivalent', function(done) {
      request(app)
      .get('/login')
      .expect(200)
      .end(function(err, res) {
        request(app)
        .get('/main/login')
        .expect(function(secondRes) {
          expect(res.text).to.be.eql(secondRes.text);
        })
        .end(done);
      });
    });


});

