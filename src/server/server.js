

require('babel-core/register'); //enables ES6 ('import'.. etc) in Node

var setup = require('../../setup');

if (setup.SERVER.HOST != 'localhost') {
  require('./server.prod')
} else {
  require('./server.dev');
}
