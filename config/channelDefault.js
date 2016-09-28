
///////////////////////////////////////////////////////////////////////
////////   set the default for the initial channel     //////////////
//////////////////////////////////////////////////////////////////////
var configureChannels  = require('./channels');

const initialChannelName = configureChannels[0].name;
const initialChannelID = configureChannels[0].id;

exports.INITIALCHANNEL = {
                          name: initialChannelName,
                          id: initialChannelID
                        }
