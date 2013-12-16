#!/usr/bin/env node
var _ = require('underscore');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');

// Available modes
var commands = [
  'create',
  'config'
];

// Get user home directory
var userHome = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var configFilePath = path.normalize(userHome + '/' + '.njsp_config');

// Init config file
var configFile = require(__dirname+'/utils/ConfigFile')(configFilePath);

// Set default mode
var command = 'create';

// Set usage text for program
var usageTxt = 'Usage: $0 [command] [options]\n';
usageTxt    += '\nExamples:\n';
usageTxt    += '  njsp --path ./workspace --name MyProject\t# Creates new project name \'MyProject\’ in \'workspace\' directory.\n';
usageTxt    += '  njsp config --set myvar=myvalue\t# Creates new njsp variable.\n';
usageTxt    += '\nAvailable commands:\n  create\t  Create command [default]\n  config\t  Config command\n';
usageTxt    += '\nConfig options:\n';
usageTxt    += '  -l, --list\t  List configuration variables\n';
usageTxt    += '  -s, --set\t  Set configuration variable\n';
usageTxt    += '  -u, --unset\t  Unset configuration variable';

// Initialise args parser
var argParser = require('optimist')(process.argv.slice(2));
argParser.usage(usageTxt);
//
argParser.alias('l', 'list');
argParser.alias('s', 'set');
argParser.alias('u', 'unset');
//
argParser.alias('h', 'help').describe('h','Show this help message');
argParser.alias('n', 'name').describe('n', 'New project name');
argParser.alias('p', 'path').describe('p', 'New project path').default('p','./');
argParser.alias('t', 'template').describe('t', 'New project template').default('t', 'webapp');
argParser.describe('templates-list', 'List available templates');
argParser.describe('heroku', 'Creates new heroku application');
argParser.describe('mongohq', 'Creates new MongoHQ database');
argParser.describe('git', 'Init a git repository');

// Extract parsed arguments
var argv = argParser.argv;

// If help parameter is detected, display help message
if(argv.help) {
  console.log(argParser.help());
  process.exit(0);
}

// Check if at leat one argument is passed
if(_.keys(argv).length === 2 && argv._.length === 0) {
  console.log(argParser.help());
  process.exit(1);
}

// Check if a mode was specified
if(argv._.length) {
  command = argv._[0];
  if(!_.contains(commands, command)) {
    console.log('\n\033[31mCommand ['+command+'] is not available !\033[30m\n');
    console.log(argParser.help());
    process.exit(1);
  }
}

//
// Execute specified command
//
if(command === 'config') {
  require(__dirname + '/commands/config')(configFile, argParser.argv, argParser).execute();
} else if (command === 'create') {
  // Override parser args
  argParser.demand('n');
  require(__dirname + '/commands/create')(configFile, argParser.argv).execute();
}
