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


describe('RESTful API tests #1', function() {

  before(function() {
      server.open();
      app = server.app;

      models['Group'] = server.requireModel('Group');
      models['MyGroup'] = server.requireModel('MyGroup');
      models['User'] = server.requireModel('User');
      models['Class'] = server.requireModel('Class');

  });

  after(function(done) {
      var Group = models['Group'];
      Group.destroyAll(function(err) {
        if(!err) {
          server.log.warn('Empty database', 'All groups deleted.');
        }
        done();
      });

      server.close();
  });

  it('Should not allow access resource if does not pass the middleware', function(done) {
    supertest(app)
    .get('/data/MWUser')
    .expect(302)
    .end(function(err, res) {
      expect(err).to.not.exist;

      expect(res.status).to.equal(302);
      done();
    });
  });

  it('The data inserted must be equal to the received via API #1 - searching one', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'API Group #1',
      registry: 100,
      acronym: 'AG1',
      restrictedAttr: 'restricted !'
    });

    newGroup.save(function(err) {
      supertest(app)
      .get('/data/Group/' + newGroup.id)
      .expect(200)
      .end(function(err, res) {

        expect(res.status).to.equal(200);

        var addedGroup = JSON.parse(JSON.stringify(newGroup));
        var returnedGroup = res.body;

        expect(addedGroup.name).to.be.equal(returnedGroup.name);
        expect(addedGroup.registry).to.be.equal(returnedGroup.registry);
        expect(addedGroup.acronym).to.be.equal(returnedGroup.acronym);
        expect(addedGroup.id).to.be.equal(returnedGroup.id);
        expect(returnedGroup.restrictedAttr).to.not.exist;

        done();

      });
    });
  });

  it('The data inserted must be equal to the received via API #2 - searching many', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'API Group #2',
      registry: 200,
      acronym: 'AG2',
      restrictedAttr: 'restricted !'
    });

    newGroup.save(function(err) {
      supertest(app)
      .get('/data/Group/')
      .expect(200)
      .end(function(err, res) {

        expect(res.status).to.equal(200);

        var addedGroup = JSON.parse(JSON.stringify(newGroup));
        var returnedGroup = res.body[res.body.length - 1];

        expect(addedGroup.name).to.be.equal(returnedGroup.name);
        expect(addedGroup.registry).to.be.equal(returnedGroup.registry);
        expect(addedGroup.acronym).to.be.equal(returnedGroup.acronym);
        expect(addedGroup.id).to.be.equal(returnedGroup.id);
        expect(returnedGroup.restrictedAttr).to.not.exist;

        done();

      });
    });
  });

  it('Should return just some attributes reading one', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'API Group #3',
      registry: 300,
      acronym: 'AG3',
      restrictedAttr: 'restricted !'
    });

    newGroup.save(function(err) {

      supertest(app)
      .get('/data/Group/' + newGroup.id + '?attrs=name,acronym')
      .expect(200)
      .end(function(err, res) {

        expect(res.status).to.equal(200);

        var addedGroup = JSON.parse(JSON.stringify(newGroup));
        var returnedGroup = res.body;

        expect(returnedGroup.name).to.be.equal(addedGroup.name);
        expect(returnedGroup.registry).to.not.exist;
        expect(addedGroup.acronym).to.be.equal(returnedGroup.acronym);
        expect(returnedGroup.id).to.be.equal(addedGroup.id);
        expect(returnedGroup.restrictedAttr).to.not.exist;

        done();

      });
    });

  });

  it('Should return just some attributes reading many', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'API Group #4',
      registry: 400,
      acronym: 'AG4',
      restrictedAttr: 'restricted !'
    });

    newGroup.save(function(err) {
      supertest(app)
      .get('/data/Group/?attrs=name,registry')
      .expect(200)
      .end(function(err, res) {

        expect(res.status).to.equal(200);

        var addedGroup = JSON.parse(JSON.stringify(newGroup));
        var returnedGroup = res.body[res.body.length - 1];

        expect(returnedGroup.name).to.be.equal(addedGroup.name);
        expect(returnedGroup.registry).to.equal(addedGroup.registry);
        expect(returnedGroup.acronym).to.not.exist;
        expect(returnedGroup.id).to.be.equal(addedGroup.id);
        expect(returnedGroup.restrictedAttr).to.not.exist;

        done();

      });
    });

  });

  it('The request to insert new data should return it without the restrict attributes', function(done) {
    var addedGroup = {
      name: 'API Group #5',
      registry: 500,
      acronym: 'AG5',
      restrictedAttr: 'restricted !'
    };

    supertest(app)
    .post('/data/Group')
    .send(addedGroup)
    .expect(201)
    .end(function(err, res) {
      expect(res.status).to.equal(201);

      expect(err).to.not.exist;

      var returnedGroup = res.body;

      expect(returnedGroup.name).to.be.equal(addedGroup.name);
      expect(returnedGroup.registry).to.equal(addedGroup.registry);
      expect(returnedGroup.acronym).to.equal(addedGroup.acronym);
      expect(returnedGroup.restrictedAttr).to.not.exist;

      done();
    });
  });

  it('The request to update data should return status 202', function(done) {
    var Group = models['Group'];

    var addedGroup = new Group({
      name: 'API Group',
      registry: 600,
      acronym: 'AG6',
      restrictedAttr: 'restricted !'
    });

    addedGroup.save(function(err) {
      var updatedGroup = addedGroup;

      updatedGroup.acronym = 'UG';

      supertest(app)
      .put('/data/Group/' + addedGroup.id)
      .send(updatedGroup)
      .expect(202)
      .end(function(err, res) {

        expect(res.status).to.equal(202);

        var returnedGroup = res.body;
        expect(returnedGroup.name).to.be.equal(updatedGroup.name);
        expect(returnedGroup.registry).to.equal(updatedGroup.registry);
        expect(returnedGroup.acronym).to.equal(updatedGroup.acronym);
        expect(returnedGroup.restrictedAttr).to.not.exist;

        done();

      });
    });
  });

  it('The request to delete data should return status 202', function(done) {
    var Group = models['Group'];

    var addedGroup = new Group({
      name: 'API Group',
      registry: 700,
      acronym: 'AG7',
      restrictedAttr: 'restricted !'
    });

    addedGroup.save(function(err) {
      var updatedGroup = addedGroup;

      supertest(app)
      .del('/data/Group/' + addedGroup.id)
      .expect(202)
      .end(function(err, res) {

        expect(res.status).to.equal(202);

        Group.find(addedGroup.id, function(err, group) {
          expect(group).to.not.exist;
          done();
        });

      });
    });
  });
});

