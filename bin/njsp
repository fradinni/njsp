#!/usr/bin/env node
var fs = require('fs');
var spawn = require('child_process').spawn;

// Init arguments parser
var argv = require('optimist')
    .usage('Creates a new NodeJS Webapp Project.\nUsage: $0 -p [path] -n [name] -t [template]')
    .alias('h', 'help')
    .describe('h', 'Show this help message')
    //
    .demand('n')
    .alias('n', 'name')
    .describe('n', 'Name of the new project')
    //
    .demand('p')
    .alias('p', 'path')
    .describe('p', 'Path where new project will be created')
    //
    .demand('t')
    .default('t', 'webapp')
    .alias('t', 'template')
    .describe('t', 'Template used to create project')
    .argv;


// Check if project path exists
if(!fs.existsSync(argv.path)) {
  console.log('Error: Specified path [ '+argv.p+' ] doesn\'t exists !');
  process.exit(1);
}

// Check if project directory
if(fs.existsSync(argv.path + '/' + argv.name)) {
  console.log('Error: Specified project directory [ '+argv.p+'/'+argv.n+' ] already exists !');
  process.exit(1);
}

if(argv.path.lastIndexOf('/') < argv.path.length-1) {
  argv.p = argv.path = argv.path + '/';
}

// Clone template project
console.log('Download template...');
var templateUrl = 'https://github.com/fradinni/NodeWebappTemplate.git';
var gitclone = spawn('git', ['clone', templateUrl, argv.path + argv.name]);
gitclone.stderr.on('data', function (data) {
  console.log(data.toString());
});

// When template is ready
gitclone.on('close', function () {
  console.log('Template initialized !');
});



