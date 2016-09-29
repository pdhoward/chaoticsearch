
//////////////////////////////////////////////////////////////////////////
///////////////////////////// Watson Routes /////////////////////////////
////////////////////////////////////////////////////////////////////////

import ChatMessage            from '../models/Message';
import WatsonResponse         from '../models/WatsonResponse';
import async                  from 'async';
import axios                  from "axios";
import bodyparser             from 'body-parser';
import moment                 from 'moment';
import uuid                   from 'node-uuid';
import vcapServices           from 'vcap_services';
import basicAuth              from 'basic-auth-connect';
import colors                 from 'colors'

require( 'dotenv' ).config( {silent: true} );

const logs = null;

// watson conversation parameters
const watson =             require( 'watson-developer-cloud' );

const conversation = watson.conversation( {
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME || '<username>',
  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: '2016-07-11',
  version: 'v1'
} );

const message = {
  workspace_id: '',
  input: {
    text: ''
  },
  context: {},
  alternate_intents: false,
  entities: [],
  intents: [],
  output: {}
}

const buildMessageToSend = {
  id: '',
  channelID: '',
  text: '',
  user: '',
  time: Number

}

const watsonUserID = {
  username: 'Watson',
  socketID: '/#testid'
}

var buildID = '';


////////////////////////////////////////////////////////////
//////////////////Watson APIs /////////////////////////////
//////////////////////////////////////////////////////////

module.exports = function(router) {

  router.use(bodyparser.json());

  //evaluate a new message
  router.post('/newmessage', function(req, res, next) {

    // for every new message -- Watson looks at it and responds
    const watsonMessage = new ChatMessage(req.body);

    //prepare message to send to Watson
    message.input.text = watsonMessage.text;

   // If session context exists, need to use it for next Watson iteration
   // It means we've already launched a discussion
    if (req.session.context) {
      message.context = req.session.context;
      req.session.count++;
    };


     console.log("---------WATSON RESPONSE ANALYZER ----------".green);
     console.log(">>>> user chat test <<<<<".green);
     console.log({reqbody: req.body});


           ////////////////////////////////////////////////////////////////////////
          //////////// Process interaction with Watson and User Response //////////
          /////////////////////////////////////////////////////////////////////////

    req.bag = {}   // my stuff for async processing


    async.series([

	     function(callback){

          setWorkSpaceID(watsonMessage.channelID, function(workSpace) {
            console.log(">>>>> 1. workspace id is set".green);
            console.log({channelID: watsonMessage.channelID},
                        {workSpace: workSpace});
            req.bag.workspace = workSpace;
            req.bag.channelID = watsonMessage.channelID;
				    callback(null, 'step1');
			    })
	      },

	    function(callback){
        // send user text to watson
        conversation.message( message, function(err, data) {

          console.log(">>>>> 2. message response from watson".green);

          if ( err )  {
            return res.status( err.code || 500 ).json( err );
          };

          req.session.context = data.context;
          req.bag.message = message;
          req.bag.data = data;
          console.log({message: message})
          console.log({response: data});

				 callback(null, 'step2');
			   })
	   },
	    function(callback){
        getReplyToIntent(req.bag.data, function(err, reply){

          console.log(">>>>> 3. reply to intent".green);
          console.log({reply: reply})
          req.bag.text = reply;

        callback(null, 'step3');

        })
	  },
    function(callback){
      buildChatMessage(req, function(){

        console.log(">>>>> 4. build message".green);
        console.log({buildMessage: buildMessageToSend})

      callback(null, 'step4');

      })
    },
    function(callback){
      broadcastChatMessage(req, function(){

        // do something with result
      console.log(">>>>> 5. broadcast message".green);

      callback(null, 'step5');

      })
    },
    function(callback){
      saveWatsonMessage(req, function(){

        // do something with result
      console.log(">>>>> 6. save watson message".green);

      callback(null, 'step6');

      })
    },
    function(callback){
      saveChatMessage(req, function(){

        // do something with result
      console.log(">>>>> 7. save chat message".green);

      callback(null, 'step7');

      })
    }
  ],
      function(err, results){
        if (err) return next(err);

        console.log(results);
        next();
		}
  )


    });     // end of router post
  }         // end of module export


//////////////////////////////////////////////////////////////////////////
//////////// workspace id is set based on channel of user       //////////
//////////////////////////////////////////////////////////////////////////

function setWorkSpaceID(input, cb) {

  const workspace = process.env.WORKSPACE_ID || 'workspace-id';
  message.workspace_id = workspace;

  if ( ! message.workspace_id || message.workspace_id === 'workspace-id' ) {
      return res.status( 500 );
    };

  console.log(">>>>> setworkspaceid function <<<<<<".green);
  console.log({channel: input});
  console.log(JSON.stringify(message.workspace_id));

  cb(null, message.workspace_id);

}

        //////////////////////////////////////////////////////////////////////////
       //////////// Update Response based on watson confidence interval //////////
       //////////////////////////////////////////////////////////////////////////

function updateMessage(input, response) {
    var responseText = null;
    var id = null;
    if ( !response.output ) {
      response.output = {};
    } else {
    if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
    }
    return response;
  }

  if ( response.intents && response.intents[0] ) {
    var intent = response.intents[0];

    if ( intent.confidence >= 0.75 ) {
    responseText = 'I understood your intent was ' + intent.intent;
  } else if ( intent.confidence >= 0.5 ) {
    responseText = 'I think your intent was ' + intent.intent;
  } else {
    responseText = 'I did not understand your intent';
  }
}

  response.output.text = responseText;
  if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
  }
  return response;
}


////////////////////////////////////////////////////////////////
//////////// Analyze intent and process actions if any //////////
////////////////////////////////////////////////////////////////


function getReplyToIntent(input, cb) {

    var replyText = null;
    const intentType = input.intents[0].intent;

    switch (intentType) {
        case "INTENT_TYPE_DIALOG_EMAIL":
            break;
        case "INTENT_TYPE_DIALOG_MEETING":
            break;
        case "INTENT_TYPE_DIALOG_SMS":
            break;
        case "findbook":

            const URL = 'https://www.googleapis.com/books/v1/volumes?q=';

            req.bag.title = 'Gone with the Wind';

            axios(URL + req.bag.title, {
              method: 'get',
              headers: {'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                })
              .then(res => res.json())
              .then(json => {
                if (json.error) {
                  cb(json.error, null);
                } else {
                  cb(null, json)
                }
              })
              .catch((json) => {
                cb(json.error, null);
              });

            break;

        case "respond-calculation-numeric":
            replyText = CalculationPipeline.numericCalculation(userText);
            break;
        case "respond-calculation-conversion":
            replyText = CalculationPipeline.conversionCalculation(userText);
            break;

        default:
            replyText = input.output.text[0];
            break;
    }

    cb(null, replyText)
}



////////////////////////////////////////////////////
//////////// Build message format for sockets//////////
////////////////////////////////////////////////////

function buildChatMessage(req, cb) {

  //prepare message to broadcast from watson once response is received

  buildMessageToSend.channelID = req.bag.channelID;
  buildMessageToSend.user = watsonUserID;
  buildID = `${Date.now()}${uuid.v4()}`;
  buildMessageToSend.id = buildID;
  buildMessageToSend.time = moment.utc().format('lll');
  buildMessageToSend.text = req.bag.text;

  cb();
  }

////////////////////////////////////////////////////
//////////// Broadcast response via sockets//////////
////////////////////////////////////////////////////

function broadcastChatMessage(req, cb) {

    var io = req.app.get('socketio');

    io.to(buildMessageToSend.channelID).emit('new bc message', buildMessageToSend);
    cb()
  }
  ///////////////////////////////////////////////////////
  //////////// save watson response a on mongo//////////
  /////////////////////////////////////////////////////
function saveWatsonMessage(req, cb){

  //prepare to save the watson chat response to mongodb collection
  const newwatsonResponse = new WatsonResponse(req.bag.data);
  // save watson messages
  newwatsonResponse.save(function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'}); }
      cb()
    });
  }
  ///////////////////////////////////////////////////////
  //////////// save chat message on mongo     //////////
  /////////////////////////////////////////////////////
function saveChatMessage(req, cb){

    //prepare to save user chat message to mongodb collection
    const newChatMessage = new ChatMessage(buildMessageToSend);

    newChatMessage.save(function (err, data) {
        if (err) {
          console.log(err);
          return res.status(500).json({msg: 'internal server error'}); }
        cb()
      });
    }
////////////////////////////////////////////////////////////////
