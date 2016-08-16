var CSSPluginBase = require('css/css-plugin-base.js');

var isWin = typeof process != 'undefined' && process.platform.match(/^win/);
function fromFileURL(url) {
  return url.substr(7 + !!isWin).replace(/\//g, isWin ? '\\' : '/');
}

module.exports = new CSSPluginBase(function compile(style, address, opts) {

  var loader = this;

  // use a file path in Node and a URL in the browser
  var filename = this.builder ? fromFileURL(address) : address;

  var systemPlugin = {
    install: function(less, pluginManager) {
      pluginManager.addFileManager(makeFileManager(less, loader, address))
    },
    minVersion: [2, 1, 1]
  }

  return System['import']('lesscss', module.id)
  .then(function(less) {
    return less.render(style, {
      plugins: [systemPlugin],
      filename: filename,
      rootpath: (!opts.fileAsRoot || !loader.builder) && filename.replace(/[^/]+$/, ''),
      paths: opts.fileAsRoot && [filename.replace(/[^/]+$/, '')],
      relativeUrls: opts.relativeUrls || false,
      sourceMap: loader.builder && {
        sourceMapBasepath: filename.replace(/[^/]+$/, '')
      }
    });
  })
  .then(function(output) {
    return {
      css: output.css + (loader.builder ? '' : ('/*# sourceURL=' + filename + '*/')),
      map: output.map,

      // style plugins can optionally return a modular module 
      // source as well as the stylesheet above
      moduleSource: null,
      moduleFormat: null
    };
  });
});

// based on webkit less-loader
function makeFileManager(less, loader, address) {
  function SystemFileManager(){ less.FileManager.apply(this, arguments) }
  SystemFileManager.prototype = Object.create(less.FileManager.prototype);
  SystemFileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    // SystemFileManager handles all the files
    return true;
  };
  SystemFileManager.prototype.supportsSync = function(filename, currentDirectory, options, environment) {
    return false
  };
  SystemFileManager.prototype.loadFile = function(filename, currentDirectory, options, environment, callback) {
    System['normalize'](filename, address).then(function(path){
      return System['fetch']({ address: path, metadata: {} })
    }).then(function(contents){
      callback(null, {
        contents: contents,
        filename: filename
      })  

    }).catch(function(reason){
      callback(reason, null)
    })
    
  }
  return new SystemFileManager()
}


