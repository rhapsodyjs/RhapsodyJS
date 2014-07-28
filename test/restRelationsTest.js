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


describe('RESTful API tests #2 relationships', function() {

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

					expect(res.status).to.equal(200);

					var user = res.body[0];

					expect(newUser.name).to.equal(user.name);
					expect(newUser.age).to.equal(user.age);
					// expect(user.password).to.not.exist;
					
					done();

				});
			});
		});
	});

	it('Should find data from hasMany/belongsTo relation coming from the API reading some attributes', function(done) {
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
				.get('/data/Group/' + newGroup.id + '/users?attrs=name')
				.expect(200)
				.end(function(err, res) {

					expect(res.status).to.equal(200);

					var user = res.body[0];

					expect(user.name).to.equal(newUser.name);
					expect(user.age).to.not.exist;
					expect(user.password).to.not.exist;
					
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

					expect(res.status).to.equal(200);

					newClass.students(function(err, students) {
						expect(err).to.not.exist;
						expect(students).to.exist;

						expect(res.body[0].id).to.equal(students[0].id.toString());
						expect(res.body[0].name).to.equal(students[0].name);
						expect(res.body[0].age).to.equal(students[0].age);
						expect(res.body[0].password).to.not.exist;

						supertest(app)
						.get('/data/User/' + students[0].id + '/classes')
						.expect(200)
						.end(function(err, res) {

							expect(res.status).to.equal(200);

							newStudent.classes(function(err, classes) {
								expect(err).to.not.exist;
								expect(classes).to.exist;

								expect(res.body[0].id).to.equal(classes[0].id.toString());
								expect(res.body[0].name).to.equal(classes[0].name);

								done();

							});
						});

					});
				});
			});
		});
	});

	it('Should find data from hasAndBelongsToMany relation coming from the API reading some attributes', function(done) {
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
				.get('/data/Class/' + newClass.id + '/students?attrs=name')
				.expect(200)
				.end(function(err, res) {

					expect(res.status).to.equal(200);

					newClass.students(function(err, students) {
						expect(err).to.not.exist;
						expect(students).to.exist;

						expect(res.body[0].id).to.equal(students[0].id.toString());
						expect(res.body[0].name).to.equal(students[0].name);
						expect(res.body[0].age).to.not.exist;
						expect(res.body[0].password).to.not.exist;

						supertest(app)
						.get('/data/User/' + students[0].id + '/classes?attrs=id')
						.expect(200)
						.end(function(err, res) {

							expect(res.status).to.equal(200);

							newStudent.classes(function(err, classes) {
								expect(err).to.not.exist;
								expect(classes).to.exist;

								expect(res.body[0].id).to.equal(classes[0].id.toString());
								expect(res.body[0].name).to.not.exist;

								done();

							});
						});

					});
				});
			});
		});
	});

	it('Should add data to hasMany/belongsTo relation coming from the API', function(done) {
		var User = models['User'],
				Group = models['Group'];

		var newGroup = new Group({
			name: 'That\'s the new group',
			registry: 123456789,
			acronym: 'TTNG',
			restrictedAttr: 'Yep, that\'s it'
		});

		var newUser = {
			name: 'User added via REST API',
			age: 42,
			password: 'One does not simply use this password'
		};

		newGroup.save(function(err) {

			expect(err).to.not.exist;

			supertest(app)
			.post('/data/Group/' + newGroup.id + '/users')
			.send(newUser)
			.expect(201)
			.end(function(err, res) {
			  expect(res.status).to.equal(201);

			  expect(res.body.name).to.equal(newUser.name);
			  expect(res.body.age).to.equal(newUser.age);
			  expect(res.body.password).to.not.exist;

			  done();

			});

		});


	});

});

