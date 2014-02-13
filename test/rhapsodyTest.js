'use strict';

var chai = require('chai'),
    http = require('http');

chai.expect();
chai.should();
var expect = chai.expect;

var http = require('http'),
    rhapsody = require('../lib')(__dirname + '/../app'),
    server;


describe('RhapsodyJS', function() {

    before(function() {
        server = rhapsody.open(4242);
    });

    after(function() {
        rhapsody.close();
    });

    // describe('Controller routing', function() {

    //     it('Server root points to mainController#mainView', function() {
    //         http.get('http://localhost:4242', function (res) {
    //             expect(res.statusCode).to.equal(200);
    //         });
    //     });
    // });
    
    // describe('Model routing', function() {

    //     it('Can access model that allowed REST', function() {
    //         http.get('http://localhost:4242/data/User', function (res) {
    //             expect(res.statusCode).to.equal(200);
    //         });
    //     });

    //     it('Can\'t access model that allowed REST', function() {
    //         http.get('http://localhost:4242/data/Comment', function (res) {
    //             expect(res.statusCode).to.equal(404);
    //         });
    //     });
    // });

});

