
import channelDefault                   from '../../config/channelDefault.js';
import moment                           from 'moment';
import uuid                             from 'node-uuid';

const initialChannelID = channelDefault.INITIALCHANNEL.name;
const WelcomeMessage = {
  id: '',
  channelID: initialChannelID,
  text: 'Welcome. This is a collaboration platform. All discussion threads will be visible. Watson will conduct simulataneous discussions with as many parties that are chatting. Pick a Channel and Chat! ',
  user: '',
  time: Number

}

const watsonUserID = {
  username: 'Watson',
  socketID: '/#testid'
}

exports = module.exports = function(io) {
  io.on('connection', function(socket) {
    socket.on('chat mounted', function(user) {
      // TODO: Does the server need to know the user?
      socket.emit('receive socket', socket.id);


    })
    socket.on('leave channel', function(channel) {
      socket.leave(channel)
    })
    socket.on('join channel', function(channel) {
      socket.join(channel.name)

      if (channel.name = initialChannelID) {
        console.log(" >>>> socket events <<<<");
//        console.log({user: user});
        WelcomeMessage.id = `${Date.now()}${uuid.v4()}`;
        WelcomeMessage.time = moment.utc().format('lll');
        WelcomeMessage.user = watsonUserID;
        console.log(" >>>> socket emit welcome<<<<");
        console.log({message: WelcomeMessage});
        socket.to(WelcomeMessage.channelID).emit('new bc message', WelcomeMessage);
      }
    })
    socket.on('new message', function(msg) {
      socket.broadcast.to(msg.channelID).emit('new bc message', msg);
    });
    socket.on('new channel', function(channel) {
      socket.broadcast.emit('new channel', channel)
    });
    socket.on('typing', function (data) {
      socket.broadcast.to(data.channel).emit('typing bc', data.user);
    });
    socket.on('stop typing', function (data) {
      socket.broadcast.to(data.channel).emit('stop typing bc', data.user);
    });
    socket.on('new private channel', function(socketID, channel) {
      socket.broadcast.to(socketID).emit('receive private channel', channel);
    })
  });
}
