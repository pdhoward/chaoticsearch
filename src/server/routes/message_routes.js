

//////////////////////////////////////////////////////////////////////////
///////////////////////////// Message Routes ////////////////////////////
////////////////////////////////////////////////////////////////////////
import colors                 from 'colors'
import Message                from '../models/Message';
import bodyparser             from 'body-parser';

var util = require('util');


module.exports = function(router) {
  router.use(bodyparser.json());

  // query DB for ALL messages
  router.get('/messages', function(req, res) {
    Message.find({}, {id: 1, channelID: 1, text: 1, user: 1, time: 1, _id: 0}, function(err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }
      res.json(data);
    });
  });

  // query DB for messages for a specific channel
  router.get('/messages/:channel', function(req, res) {
      Message.find({channelID: req.params.channel}, {id: 1, channelID: 1, text: 1, user: 1, time: 1, _id: 0})
             .sort({id: 'ascending'})
             .exec(function(err, data) {
                if(err) {
                    console.log(err);
                    return res.status(500).json({msg: 'internal server error'});
                  }
                res.json(data);

            });
          })

  //post a new message to db
  router.post('/newmessage', function(req, res) {

    var newMessage = new Message(req.body);

    // establish ownership of the message being posted
    newMessage.owner = req.session.owner;

    newMessage.save(function (err, data) {
      if(err) {
        console.log(">>>>>ERROR IN MESSAGE ROUTER<<<<<<".green)
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }

      console.log(">>>>>>>>>>>>message posted to db  <<<<<<<<<<<<".green);
      console.log("newMessage = " + newMessage.user.username + " " + newMessage.text + " " + newMessage.owner + " " + req.session.owner);
      console.log(JSON.stringify(req.session));
       res.json(data);
    });
  });

}
