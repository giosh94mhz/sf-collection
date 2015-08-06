module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		meta: {
			banner: '/*\n' +
				' * <%= pkg.title || pkg.name %> - v<%= pkg.version %>\n' +
				' * <%= pkg.description %>\n' +
				' * <%= pkg.homepage %>\n' +
				' *\n' +
				' * Copyright (C) 2015  <%= pkg.author.name %>\n' +
				' * Licensed under <%= pkg.license %> License\n' +
				' * See LICENSE file for the full copyright notice.\n' +
				' */\n'
		},
		update_json: {
			options: {
				src: 'package.json',
				indent: '\t'
			},
			bower: {
				src: 'package.json',
				dest: 'bower.json',
				fields: {
					name: null,
					version: null,
					description: null,
					repository: null,
					keywords: null,
					license: null
				}
			}
		},
		concat: {
			options: {
				banner: '<%= meta.banner %>'
			},
			dist: {
				src: ['src/jquery.sf-collection.js'],
				dest: 'dist/jquery.sf-collection.js'
			}
		},
		jshint: {
			files: ['src/jquery.sf-collection.js'],
			options: {
				jshintrc: '.jshintrc'
			}
		},
		uglify: {
			my_target: {
				src: ['dist/jquery.sf-collection.js'],
				dest: 'dist/jquery.sf-collection.min.js'
			},
			options: {
				banner: '<%= meta.banner %>'
			}
		},
		watch: {
			startup: {
				files: [],
				tasks: ['connect:base'],
				options: {
					atBegin: true,
					spawn: false,
				}
			},
			deafult: {
				files: ['src/*', 'demo/*'],
				tasks: ['default'],
				options: {
					livereload: true,
				}
			}
		},
		connect: {
			base: {
				options: {
					port: 8000,
					livereload: true
				}
			},
			keepalive: {
				options: {
					port: 8000,
					livereload: true,
					keepalive: true,
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-update-json');

	grunt.registerTask('server', 'connect:keepalive');
	grunt.registerTask('build', ['update_json', 'concat', 'uglify']);
	grunt.registerTask('default', ['jshint', 'build']);
	grunt.registerTask('travis', ['default']);
};
