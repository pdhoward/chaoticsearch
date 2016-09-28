'use strict';

import Channel            from './Channel';
import mongoose           from 'mongoose';
import uuid               from 'node-uuid';
import colors             from 'colors';
import configureChannels  from '../../../config/channels';

const limit = 1;

function createDefaultChannel () {
      Channel.find({}).limit(limit).exec(function (err, collection){
          if (collection.length === 0) {
            // iterate over the set of channels for initialization and create entries
            configureChannels.map(function(channel) {
                var newChannel = new Channel(channel)
                newChannel.save(function (err, data) {
                  if(err) {
                    console.log(err);
                    return res.status(500).json({msg: 'internal server error'});
                  }
                })
              })
            console.log("Channels Created".green)
            return
          }
          else {
            console.log("Channels Exist".green)
          }
        })
      }

module.exports = {
  createDefaultChannel: createDefaultChannel
}
