'use strict';

var chai = require('chai'),
    supertest = require('supertest'),
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

      it('Sucessfully find an item in the database', function(done) {
        var Group = models['Group'];

        Group.findOne({registry: 10}, function(err, data) {
          expect(data.name).to.equal('Test Group');
          done();
        });
      });

      it('Do not allow to insert an item if fail validation', function() {
        var Group = models['Group'];

        var newGroup = new Group({
          name: 'Invalid Group',
          registry: -1
        });

        newGroup.save(function(err) {
          expect(err).to.exist;
        });
      });

    });

    describe('Tests with the RESTful API', function() {
      it('The data inserted must be equal to the received via API', function(done) {
        var Group = models['Group'];

        var newGroup = new Group({
          name: 'API Group',
          registry: 200
        });

        newGroup.save(function(err) {
          supertest(app)
          .get('/data/Group/' + newGroup._id)
          .expect(200)
          .end(function(err, res) {

          var addedGroup = JSON.parse(JSON.stringify(newGroup));
          var returnedGroup = res.body;

          expect(addedGroup.name).to.be.equal(returnedGroup.name);
          expect(addedGroup.registry).to.be.equal(returnedGroup.registry);
          expect(addedGroup._id).to.be.equal(returnedGroup._id);

          done();

          });
        });
      });
    });


});

