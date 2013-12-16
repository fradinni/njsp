var fs = require('fs');

var defaultConfig = {
  tpl_repo: 'https://github.com/fradinni/njsp-templates.git'
};

var ConfigFile = function (configFile) {
  this.configFile = configFile;
  this.data = null;
  if(!fs.existsSync(this.configFile)) {
    this.data = defaultConfig;
    this.save();
  } else {
    try {
      this.data = JSON.parse(fs.readFileSync(this.configFile));
    } catch(e) {
      this.data = defaultConfig;
      this.save();
    }
  }
  return this;
};

ConfigFile.prototype.save = function() {
  fs.writeFileSync(this.configFile, JSON.stringify(this.data));
  return this;
};

ConfigFile.prototype.get = function(property) {
  if(!property) return this.data;
  return this.data[property];
};

ConfigFile.prototype.set = function(property, value) {
  this.data[property] = value;
  this.save();
  return this;
};

ConfigFile.prototype.unset = function (property) {
  delete this.data[property];
  this.save();
  return this;
};

module.exports = function (configFile) {
  return new ConfigFile(configFile);
};