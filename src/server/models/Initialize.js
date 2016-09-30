'use strict';
import ChatMessage        from './Message';
import Channel            from './Channel';
import mongoose           from 'mongoose';
import uuid               from 'node-uuid';
import moment             from 'moment';
import colors             from 'colors';
import configureChannels  from '../../../config/channels';
import channelDefault     from '../../../config/channelDefault.js';

const limit = 1;

const initialChannelID = channelDefault.INITIALCHANNEL.name;

const WelcomeMessage = {
  id: '',
  channelID: initialChannelID,
  text: '',
  user: '',
  time: Number
}

const watsonUserID = {
  username: 'Watson',
  socketID: '/#testid'
}

// note the ECMA 6 backtick for line breaks
const MessageContent = `Thank you for joining this demonstration of Intelligent Agents and Conversational UIs.
 Watson holds simultaneous discussions with all users on the platform. So pick a channel and chat.
 Please note that all discussion threads are visible to everyone. You will see a list of other active users, if any, in the sidebar.
 Use this channel for any questions you have about how ChaoticBots can help your business `


///////////////////////////////////////////////////////////////////////////////////
////////////      Initialize supported channels for AI demonstration     //////////
///////////   a Channel equates to a workspace id on watson conversation ///////////
///////////////////////////////////////////////////////////////////////////////////

function createDefaultChannel () {
      Channel.find({}).limit(limit).exec(function (err, collection){
          if (collection.length === 0) {

            // drop message collections
            ChatMessage.collection.remove({}, function(err, results) {
              if(err) {
                console.log(err);
                return res.status(500).json({msg: 'internal server error'});
              }
              console.log("messages collection dropped".green)
            });

            // iterate over the set of channels for initialization and create entries
            configureChannels.map(function(channel) {
                channel.id = `${Date.now()}${uuid.v4()}`;
                var newChannel = new Channel(channel)
                newChannel.save(function (err, data) {
                  if(err) {
                    console.log(err);
                    return res.status(500).json({msg: 'internal server error'});
                  }
                })
              })

            // create welcome message
            saveWelcomeMessage()
            console.log("Channels and Welcome Message Created".green)
            return
          }
          else {
            console.log("Channels Exist".green)
          }
        })
      }


///////////////////////////////////////////////////////
//////////// save chat message on mongo     //////////
/////////////////////////////////////////////////////
function saveWelcomeMessage() {

  //prepare welcome message
  WelcomeMessage.text = MessageContent;
  WelcomeMessage.user = watsonUserID;
  WelcomeMessage.id = `${Date.now()}${uuid.v4()}`;
  WelcomeMessage.time = moment.utc([1900, 0, 1]).format('lll');
  console.log({time: WelcomeMessage.time})

  //prepare to save user chat message to mongodb collection
  const newChatMessage = new ChatMessage(WelcomeMessage);

  newChatMessage.save(function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).json({msg: 'internal server error'}); }
  return;
      });
    }
////////////////////////////////////////////////////////////////

module.exports = {
  createDefaultChannel: createDefaultChannel
}
