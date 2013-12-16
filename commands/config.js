var _ = require('underscore');

/**
*
*/
var ConfigCommand = function(config, args, argsParser) {
  this.config = config;
  this.args = args;
  this.argsParser = argsParser;
};


/**
*
*/
ConfigCommand.prototype.execute = function() {
  var set = this.args.s;
  var unset = this.args.u;
  var list = this.args.l;

  if(set && !unset) {
    if(typeof(set) !== 'string' || set.indexOf('=') === -1 || set.indexOf('=') === set-1) {
      console.log(this.argsParser.help());
      console.log('Error: Variable must take a value !');
      return;
    }
    var split = set.split('=');
    this.setVariable(split[0], split[1]);
  } else if(unset && !set) {
    if (!this.config.get(unset)) {
      console.log('Error: variable \''+unset+'\' is not defined, cannot unset it !');
      return;
    }
    this.unsetVariable(unset);
  }

  if (list || !(set || unset || list)) {
    this.list();
  }
};


/**
*
*/
ConfigCommand.prototype.list = function () {
  console.log('Configuration vars:');
  if(!_.keys(this.config.get()).length) {
    console.log('  No config vars.');
  }
  for(var key in this.config.data) {
    console.log('  '+key+':\t'+this.config.get(key));
  }
};


/**
*
*/
ConfigCommand.prototype.setVariable = function (key, value) {
  this.config.set(key, value);
  console.log('Done: variable \''+key+'\' was set to \''+value+'\'.');
};


/**
*
*/
ConfigCommand.prototype.unsetVariable = function (key) {
  this.config.unset(key);
};


// Exports module
module.exports = function(config, args, argsParser) {
  return new ConfigCommand(config, args, argsParser);
};