var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var request = require('request');
var async = require('async');

/**
*
*/
var CreateCommand = function(config, args) {
  this.config = config;
  this.args = args;
};


/**
*
*/
CreateCommand.prototype.execute = function() {
  var projectName = this.args.n;
  var projectPath = path.normalize(this.args.p);
  var projectFullPath = path.join(projectPath, projectName);
  var projectTemplate = this.args.t;
  var heroku = (typeof(this.args.heroku) !== 'undefined');
  var mongohq = (typeof(this.args.mongohq) !== 'undefined');
  var git = (typeof(this.args.git) !== 'undefined');
  var self = this;

  // Check if project's parent directory exists
  if(!fs.existsSync(projectPath)) {
    console.log('\033[31mError: Directory \''+projectPath+'\' doesn\'t exists !\033[30m');
    process.exit(1);
  }

  // Check if project directory already exists
  if(fs.existsSync(projectFullPath)) {
    console.log('\033[31mError: Project directory \''+projectFullPath+'\' already exists !\033[30m');
    process.exit(1);
  }


  // Check if project template exists
  this.isTemplateAvailable(projectTemplate, function(available) {
    if(!available) {
      console.log('\033[31mError: Template \''+projectTemplate+'\' doesn\'t exists !\033[30m');
      return process.exit(1);
    }

    // Init project from template
    this.initProjectFromTemplate(projectTemplate, projectFullPath, function(errors) {
      if(errors && errors.length) {
        errors.forEach(function (err) {
          console.log('\033[31mError: '+err+'\033[30m');
        });
      }

      async.waterfall([
        function (callback) {
          // If Git repository should be initialized
          if(git || heroku) {
            self.createGitRepository(projectName, self.args.git, function (err) {
              if(err) return callback(err);
              if(heroku) {
                self.createHerokuApp(self.config.get('heroku_key'), projectName, projectFullPath, function (err) {
                  if(err) return callback(err);
                  callback(null);
                });
              } else {
                spawn('rm', ['Procfile'], {cwd: projectFullPath});
                callback(null);
              }
            });
          } else {
            spawn('rm', ['Procfile'], {cwd: projectFullPath});
            callback(null);
          }
        },
        function (callback) {
          // If MongoHQ database should be created
          if(mongohq) {
            self.createMongoHQDatabase(self.config.get('mongohq_key'), projectName, projectFullPath, heroku, function (err) {
              callback(null);
            });
          } else {
            callback(null);
          }
        }
      ],
      function (err) {
        if(err) {
          console.log('Error:', err);
        }

        // Update package.json
        self.updatePackageJson(projectFullPath, projectName, git || heroku);

        // Post Creation Script
        self.executeTemplatePostCreationScript(projectTemplate, {
          projectPath: projectFullPath,
          projectName: projectName,
          heroku: heroku,
          git: git,
          mongohq: mongohq,
          args: self.args
        }, function(err) {
          console.log(err);

          console.log('\033[32m[Done] Project created: \''+projectFullPath+'\'\033[30m');
        });
      });

    }.bind(this));
  }.bind(this));

};


/**
*
*/
CreateCommand.prototype.updatePackageJson = function (projectPath, appName, git) {
  var filePath = path.normalize(projectPath+'/package.json');
  if(!fs.existsSync(filePath)) {
    return console.log('Error: Unable to find package.json !');
  }
  var packageJson = JSON.parse(fs.readFileSync(filePath));
  packageJson.name = appName;
  packageJson.author = 'Your name';
  packageJson.repository.url = git && this.args.git ? this.args.git : '';
  packageJson.bugs.url = '';

  // Save package.json
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
};


/**
*
*/
CreateCommand.prototype.executeTemplatePostCreationScript = function (template, options, callback) {
  var filePath = path.normalize('../templates/'+template+'/njsp-postcreate.js');
  if(!fs.existsSync(filePath)) {
    console.log('No post-creation script to execute...', filePath);
    return callback();
  } else {
    require(filePath)(options, function (err) {
      return callback(err);
    });
  }
};


/**
*
*/
CreateCommand.prototype.createGitRepository = function (projectPath, gitRepository, callback) {
  console.log('Initalize git repository...');
  var gitinit = spawn('git', ['init'], {cwd: projectPath});
  gitinit.on('close', function () {
    if(gitRepository && gitRepository.length) {
      var error = false;
      console.log('Add git remote origin...');
      var gitremoteadd = spawn('git', ['remote', 'add', 'origin', gitRepository]);
      gitremoteadd.stderr.on('data', function (data) {
        console.log(data.toString());
        error = true;
      });
      gitremoteadd.stdout.on('data', function (data) {
        console.log(data.toString());
      });
      gitremoteadd.on('close', function () {
        if(error) {
          console.log('Error during Git repository initialisation !');
        }
        callback(error);
      });
    } else {
      callback(null);
    }
  });
};


/**
*
*/
CreateCommand.prototype.createHerokuApp = function (apiKey, appName, projectPath, callback) {
  console.log('Create heroku application...');
  var authToken = new Buffer(':'+apiKey).toString('base64');

  var options = {
    url: 'https://api.heroku.com/apps',
    headers: {
      'Accept': 'application/vnd.heroku+json; version=3',
      'User-Agent': 'NodeJS',
      'Authorization': authToken
    },
    json: {
      'name': appName
    }
  };

  request.post(options, function (error, response, body) {
    if (!error && body) {

      // If a parameter was invalid
      if(body.id && body.id === 'invalid_params') {
        return console.log('\033[31mError: '+body.message+'\033[30m');
      }

      // Display heroku app infos
      console.log('ID: '+body.id);
      console.log('URL: '+body.web_url);
      console.log('GIT: '+body.git_url);
      console.log('\033[32mHeroku app created: '+body.name+'\033[30m');

      // Generate local .env file
      console.log('Creating Heroku local .env file...');
      var envContent = '';
      envContent += 'SERVER=http://localhost\n';
      envContent += 'PORT=5000\n';
      fs.writeFileSync(path.normalize(projectPath+'/.env'), envContent);

      // Add heroku remote git origin
      var herokuremoteadd = spawn('heroku', [ 'git:remote', '-a', appName ], {cwd: projectPath});
      herokuremoteadd.stderr.on('data', function (data) {
        error = true;
        console.log(data.toString());
      });
      herokuremoteadd.stdout.on('data', function (data) {
        console.log('\033[32m'+data.toString()+'\033[30m');
      });
      herokuremoteadd.on('close', function () {
        if(error) {
          console.log('Error during Heroku repository initialisation !');
        }
        callback(error);
      });
    } else {
      console.log('\033[31mError: Unable to create Heroku app !\033[30m');
      callback(true);
    }
  });
};


/**
*
*/
CreateCommand.prototype.createMongoHQDatabase = function (apiKey, appName, projectPath, heroku, callback) {
  console.log('Create MongoHQ database...');
  var options = {
    url: 'https://api.mongohq.com/databases?_apikey=' + this.config.get('mongohq_key'),
    headers: {
      'User-Agent': 'NodeJS'
    },
    json: {
      'name': appName,
      'slug': 'sandbox'
    }
  };

  request.post(options, function (error, response, body) {
    if (!error && body) {
      options = {
        url: 'https://api.mongohq.com/databases/'+appName+'?_apikey=' + this.config.get('mongohq_key'),
        headers: {
          'User-Agent': 'NodeJS'
        }
      };
      request.get(options, function(error, response, body) {
        if(!error && body) {
          var data = JSON.parse(body);
          var mongoUrl = 'mongodb://<user>:<password>@' + data.hostname + ':' + data.port + '/' + data.db;
          console.log('MONGOHQ_URL: ' + 'mongodb://<user>:<password>@' + data.hostname + ':' + data.port + '/' + data.db);
          if(heroku) {
            fs.appendFileSync(path.normalize(projectPath+'/.env'), 'MONGOHQ_URL='+mongoUrl);
          }
          callback(null);
        } else {
          callback(true);
        }
      }.bind(this));
    } else {
      console.log('\033[31mError: Unable to create MongoHQ database !\033[30m');
      callback(true);
    }
  }.bind(this));
};


/**
*
*/
CreateCommand.prototype.initProjectFromTemplate = function (template, projectDir, callback) {
  // Make project directory
  fs.mkdirSync(projectDir);

  // If template is available, copy it into project directory
  var errors = [];
  var copy = spawn('cp', ['-r','./templates/'+template+'/', projectDir]);
  copy.stderr.on('data', function (data) {
    console.log(data.toString());
    errors.push(data.toString());
  });
  copy.on('close', function () {
    callback(errors.length ? errors : null);
  });
};


/**
*
*/
CreateCommand.prototype.isTemplateAvailable = function (template, callback) {
  // First update templates list
  // this.updateTemplates(function(errors) {

  //   if(errors && errors.length) {
  //     errors.forEach(function (err) {
  //       console.log('\033[31mError: '+err+'\033[30m\n');
  //     });
  //     return callback(false);
  //   }

  //   return callback(fs.existsSync('./templates/'+template));
  // });

  return callback(fs.existsSync('./templates/'+template));
};


/**
*
*/
CreateCommand.prototype.updateTemplates = function (callback) {

  // Check if repo url is defined
  if(!this.config.get('tpl_repo')) {
    console.log('\033[31mError: No template repository url defined in config !\033[30m');
    return process.exit(1);
  }

  // Check if a template directory already exists
  if(fs.existsSync('./templates')) {
    // Update templates
    this.updateTemplatesRepository('templates', function (errors) {
      return callback(errors);
    });
  } else {
    // Clone templates repo
    this.cloneTemplatesRepository(this.config.get('tpl_repo'), 'templates', function (errors) {
      return callback(errors);
    });
  }

};


/**
*
*/
CreateCommand.prototype.cloneTemplatesRepository = function (repo, path, callback) {
  console.log('Retrieve templates from repository...');
  var errors = [];
  var gitclone = spawn('git', ['clone', repo, path]);
  gitclone.stderr.on('data', function (data) {
    console.log(data.toString());
    errors.push(data.toString());
  });
  gitclone.stdout.on('data', function (data) {
    console.log(data.toString());
  });
  gitclone.on('close', function () {
    callback(errors.length ? errors : null);
  });
};


/**
*
*/
CreateCommand.prototype.updateTemplatesRepository = function (path, callback) {
  console.log('Updating templates...');
  var errors = [];
  var gitpull = spawn('git', ['pull'], {cwd: './templates'});
  gitpull.stderr.on('data', function (data) {
    console.log(data.toString());
    errors.push(data.toString());
  });
  gitpull.on('close', function () {
    callback(errors.length ? errors : null);
  });
};


// Exports module
module.exports = function(config, args) {
  return new CreateCommand(config, args);
};