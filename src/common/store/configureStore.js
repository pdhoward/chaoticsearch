
require('babel-core/register'); //enables ES6 ('import'.. etc) in Node

var setup = require('../../../setup');

if (setup.SERVER.HOST != 'localhost') {
  module.exports = require('./configureStore.prod');
} else {
  module.exports = require('./configureStore.dev');
}
