'use strict';

var chai = require('chai'),
    request = require('supertest'),
    util = require('util');

chai.expect();
chai.should();
var expect = chai.expect;

var server = require('./testProject/app'),
    app,
    models = [];


describe('Model tests', function() {

    before(function() {
        server.open();
        app = server.app;

        models['Group'] = server.requireModel('Group');

        // models['Group'].remove({}, function(err) {
        //   if(err) {
        //     server.log.warn('Empty database', 'All groups deleted.')
        //   }
        // });
    });

    after(function(done) {
        var Group = models['Group'];
        Group.remove({}, function(err) {
          if(!err) {
            server.log.warn('Empty database', 'All groups deleted.');
          }
          done();
        });

        server.close();
    });

    describe('Tests directly with the Model itself', function() {

      it('Sucessfully insert an item in the database', function() {
        var Group = models['Group'];

        var newGroup = new Group({
          name: 'Test Group',
          registry: 10
        });

        newGroup.save(function(err) {
          expect(err).to.not.exist;
        });
      });

      it('Sucessfully find an item in the database', function() {
        var Group = models['Group'];

        Group.findOne({registry: 10}, function(err, data) {
          expect(data.name).to.equal('Test Group');
        });
      });

    });

    


});

