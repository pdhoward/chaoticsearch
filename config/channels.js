///////////////////////////////////////////////////////////////////////
////////configure the set of active watson channels      //////////////
//////////////////////////////////////////////////////////////////////

var uuid = require('node-uuid');

// list of channels with conversation scripts enabled

const configureChannels = [
  {
    name: "Book search",
    id: '${Date.now()}${uuid.v4()}',
    private: false

  }]

module.exports = configureChannels;
