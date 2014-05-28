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


describe('RESTful API tests', function() {

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
    .end(done);
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

        Group.find(addedGroup.id, function(err, group) {
          expect(group).to.not.exist;
          done();
        });

      });
    });
  });

  it('Should find data from hasMany/belongsTo relation coming from the API', function(done) {
    var User = models['User'],
        Group = models['Group'];


    var newGroup = new Group({
      name: 'User Group',
      registry: 1,
      acronym: 'UG1',
      restrictedAttr: 'I am a restricted attribute'
    });

    newGroup.save(function(err) {
      expect(err).to.not.exist;

      var newUserData = {
        name: 'User1',
        age: 42,
        password: 'that is a bad password, kids, do not use it',
      };

      newGroup.users.create(newUserData, function(err, newUser) {
        expect(err).to.not.exist;

        supertest(app)
        .get('/data/Group/' + newGroup.id + '/users')
        .expect(200)
        .end(function(err, res) {

          var user = res.body[0];

          expect(newUser.name).to.equal(user.name);
          expect(newUser.age).to.equal(user.age);
          // expect(user.password).to.not.exist;
          
          done();

        });
      });
    });
  });

  it('Should find data from hasAndBelongsToMany relation coming from the API', function(done) {
    var Class = models['Class'];


    var newClass = new Class({
      name: 'New Class'
    });

    newClass.save(function(err) {
      expect(err).to.not.exist;

      var newStudentData = {
        name: 'User2',
        age: 9001,
        password: 'that is a bad password, kids, do not use it',
      };

      newClass.students.create(newStudentData, function(err, newStudent) {
        expect(err).to.not.exist;

        supertest(app)
        .get('/data/Class/' + newClass.id + '/students')
        .expect(200)
        .end(function(err, res) {

          newClass.students(function(err, students) {
            expect(err).to.not.exist;
            expect(students).to.exist;

            expect(res.body[0].name).to.equal(students[0].name);
            expect(res.body[0].age).to.equal(students[0].age);
            expect(res.body[0].password).to.equal(students[0].password);

            supertest(app)
            .get('/data/User/' + students[0].id + '/classes')
            .expect(200)
            .end(function(err, res) {

              newStudent.classes(function(err, classes) {
                expect(err).to.not.exist;
                expect(classes).to.exist;

                expect(res.body[0].name).to.equal(classes[0].name);

                done();

              });
            });

          });
        });
      });
    });
  });
});

