///////////////////////////////////////////////////////////////////////
////////configure the set of active watson channels      //////////////
//////////////////////////////////////////////////////////////////////

var uuid = require('node-uuid');

// list of channels with conversation scripts enabled

const configureChannels = [
  {
    name: "Welcome",
    id: '${Date.now()}${uuid.v4()}',
    private: false
  },
  {
    name: "Books",
    id: '${Date.now()}${uuid.v4()}',
    private: false
  },
  {
    name: "Blockchain",
    id: '${Date.now()}${uuid.v4()}',
    private: false
  }]

module.exports = configureChannels;
