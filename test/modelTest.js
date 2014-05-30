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
      models['User'] = server.requireModel('User');
      models['MyGroup'] = server.requireModel('MyGroup');
      models['Class'] = server.requireModel('Class');
      models['A'] = server.requireModel('A');
      models['B'] = server.requireModel('B');

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

  it('Sucessfully insert an item in the database', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'Test Group',
      registry: 10,
      acronym: 'TG'
    });

    newGroup.save(function(err) {
      expect(err).to.not.exist;
      done();
    });
  });

  it('Sucessfully find an item in the database', function(done) {
    var Group = models['Group'];

    Group.findOne({ where: {registry: 10} }, function(err, data) {
      expect(data.name).to.equal('Test Group');
      done();
    });
  });

  it('Do not allow to insert an item if fail validation', function(done) {
    var Group = models['Group'];

    var newGroup = new Group({
      name: 'Invalid Group',
      registry: -1,
      acronym: 'IG'
    });

    newGroup.save(function(err) {
      expect(err).to.exist;

      done();
    });
  });

  it('Do not allow to insert an item if doesn\'t has required attributes', function(done) {
    var MyGroup = models['MyGroup'];

    var newGroup = new MyGroup({
      name: 'Invalid Group',
      registry: 1,
      acronym: 'IG'
    });

    newGroup.save(function(err) {
      expect(err).to.exist;
      done();
    });
  });

  it('Data inserted with an adapter must not be different from the inserted with other', function(done) {
    var Group = models['Group'];
    var MyGroup = models['MyGroup'];

    var newGroup = new Group({
      name: 'Group1',
      registry: 1,
      acronym: 'G1'
    });

    newGroup.save(function(err) {
      expect(err).to.not.exist;

      var newMyGroup = new MyGroup({
        name: 'Group1',
        registry: 1,
        acronym: 'G1',
        requiredAttribute: 'value'
      });

      newMyGroup.save(function(err) {
        expect(err).to.not.exist;

        Group.find(newGroup.id, function(err, data1) {
          expect(err).to.not.exist;

          MyGroup.find(newMyGroup.id, function(err, data2) {
            expect(err).to.not.exist;

            expect(data1.acronym).to.be.equal(data2.acronym);

            done();
            
          });

        });

      });

    });
  });

  it('Should find data from hasMany/belongsTo relation', function(done) {
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

        expect(newUser.groupId).to.eql(newGroup.id);

        //If finds the user's group
        newUser.group(function(err, group) {
          expect(err).to.not.exist;
          expect(group).to.exist;

          expect(group.name).to.equal(newGroup.name);
          expect(group.registry).to.equal(newGroup.registry);
          expect(group.acronym).to.equal(newGroup.acronym);
          expect(group.restrictedAttr).to.equal(newGroup.restrictedAttr);

          //If find the group's users
          newGroup.users(function(err, users) {
            expect(err).to.not.exist;
            expect(users).to.exist;

            expect(newUser.name).to.equal(users[0].name);
            expect(newUser.age).to.equal(users[0].age);
            expect(newUser.password).to.equal(users[0].password);

            done();
          });

        });

      });

    });
  });

  it('Should find data from hasAndBelongsToMany relation', function(done) {
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

        //If finds the student's classes
        newStudent.classes(function(err, classes) {
          expect(err).to.not.exist;
          expect(classes).to.exist;

          expect(classes[0].id).to.eql(newClass.id);
          expect(classes[0].name).to.equal(newClass.name);

          //If find the class' students
          newClass.students(function(err, students) {
            expect(err).to.not.exist;
            expect(students).to.exist;

            expect(newStudent.name).to.equal(students[0].name);
            expect(newStudent.age).to.equal(students[0].age);
            expect(newStudent.password).to.equal(students[0].password);

            done();
          });

        });

      });

    });
  });

// it('Should find data from hasAndBelongsToMany relation using "through" option', function(done) {
//   var A = models['A'];


//   var newClass = new A({
//     attr: 'New A'
//   });

//   newClass.save(function(err) {
//     expect(err).to.not.exist;

//     var newStudentData = {
//       name: 'User2',
//       age: 9001,
//       password: 'that is a bad password, kids, do not use it',
//     };

//     newClass.students.create(newStudentData, function(err, newStudent) {
//       expect(err).to.not.exist;

//       //If finds the student's classes
//       newStudent.classes(function(err, classes) {
//         expect(err).to.not.exist;
//         expect(classes).to.exist;

//         expect(classes[0].id).to.eql(newClass.id);
//         expect(classes[0].name).to.equal(newClass.name);

//         //If find the class' students
//         newClass.students(function(err, students) {
//           expect(err).to.not.exist;
//           expect(students).to.exist;

//           expect(newStudent.name).to.equal(students[0].name);
//           expect(newStudent.age).to.equal(students[0].age);
//           expect(newStudent.password).to.equal(students[0].password);

//           done();
//         });

//       });

//     });

//   });
// });

});

