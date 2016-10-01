
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


     console.log("--------- START OF NEW CHAT ----------".green);
     console.log(">>>> user chat test <<<<<".green);
     console.log({reqbody: req.body});
     console.log("--------------------------------------------")


           ////////////////////////////////////////////////////////////////////////
          //////////// Process interaction with Watson and User Response //////////
          /////////////////////////////////////////////////////////////////////////

    req.bag = {}   // my stuff for async processing

    async.series([

      //////////////////////////////////////
      ///// set workspaceid to channel/////
      ////////////////////////////////////

	     function(callback){
          setWorkSpaceID(watsonMessage.channelID, function(err, result) {
            console.log(">>>>> 1. Setup Workspace ID Based on Channel]".green);
            console.log({channelID: watsonMessage.channelID},
                        {workSpace: result});
            console.log("--------------------------------------------".green)
            req.bag.workspace = result;
            req.bag.channelID = watsonMessage.channelID;
				    callback(null, 'step1');
			    })
	      },

        //////////////////////////////////////
        ///// send user text to watson  /////
        ////////////////////////////////////

	    function(callback){
        conversation.message( message, function(err, data) {
          console.log(">>>>> 2. RECEIVE RESPONSE FROM WATSON".green);

          if ( err )  {
            return res.status( err.code || 500 ).json( err );
          };

          req.session.context = data.context;

          req.bag.message = message;
          req.bag.data = data;
          console.log("----Input".green)
          console.log(JSON.stringify(data.input));
          console.log("----Output".green)
          console.log(JSON.stringify(data.output.text[0]));
          console.log("----Intent".green)
          console.log(JSON.stringify(data.intents[0]));

          console.log("----Context".green)
          console.log(JSON.stringify(data.context));

          console.log("--------------------------------------------".green)

				 callback(null, 'step2');
			   })
	   },

        //////////////////////////////////////
        ///// analyze the intent        /////
        ////////////////////////////////////

	    function(callback){
        getReplyToIntent(req, function(err, reply){

          console.log(">>>>> 3. REPLY BASED ON INTENT ANALYSIS".green);
          console.log({reply: reply})
          req.bag.text = reply;
          console.log("--------------------------------------------".green)
        callback(null, 'step3');

        })
	  },

      ///////////////////////////////////////////
      ///// build chat message to respond  /////
      /////////////////////////////////////////
    function(callback){
      buildChatMessage(req, function(){

        console.log(">>>>> 4. BUILD AND SEND REPLY FROM WATSON".green);
        console.log({buildMessage: buildMessageToSend})
        console.log("--------------------------------------------".green)
      callback(null, 'step4');

      })
    },

      //////////////////////////////////////////
      ///// broadcast message on sockets  /////
      ////////////////////////////////////////
    function(callback){
      broadcastChatMessage(req, function(){

      callback(null, 'step5');

      })
    },

    //////////////////////////////////////
    ///// save watson response on db /////
    ////////////////////////////////////
    function(callback){
      saveWatsonMessage(req, function(){

      callback(null, 'step6');

      })
    },

    //////////////////////////////////////
    ///// save watson chat on db    /////
    ////////////////////////////////////
    function(callback){
      saveChatMessage(req, function(){

      callback(null, 'step7');

      })
    }
  ],
      function(err, results){
        if (err) {
          console.log("error in async sequence")
          return next(err);
        }

        console.log(results);
        console.log(JSON.stringify(req.bag))

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


function getReplyToIntent(req, cb) {

    var replyText = null;
    const intentType = req.bag.data.intents[0].intent;

    switch (intentType) {
        case "INTENT_TYPE_DIALOG_EMAIL":
            break;
        case "INTENT_TYPE_DIALOG_MEETING":
            break;
        case "INTENT_TYPE_DIALOG_SMS":
            break;
        case "findtitle":
            const URL = 'https://www.googleapis.com/books/v1/volumes?q=';
            axios(URL + req.bag.data.context.book, {
              method: 'get',
              headers: {'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                })
              .then(res => res.json())
              .then(json => {
                if (json.error) {
                  cb(json.error, null);}
                else {
                  cb(null, res.data) }
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
            replyText = req.bag.data.output.text[0];
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
