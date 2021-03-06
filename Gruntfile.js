'use strict';

module.exports = function (grunt) {
	// Show elapsed time at the end
	require('time-grunt')(grunt);
	// Load all grunt tasks
	require('load-grunt-tasks')(grunt);

	// Project configuration.
	grunt.initConfig({
		mochaTest: {
			test: {
				src: ['test/*.js'],
				options: {
					globals: ['chai'],
					timeout: 6000,
					ignoreLeaks: false,
					ui: 'bdd',
					reporter: 'spec'
				}
			}
		},
		jshint: {
			all: ['lib/**/*.js'],
			options: {
				jshintrc: '.jshintrc'
			}
		},
		jscs: {
			src: 'lib/**/*.js',
			options: {
				config: '.jscsrc'
			}
		}
	});

	// Default task.
	grunt.registerTask('test', ['mochaTest']);

};
