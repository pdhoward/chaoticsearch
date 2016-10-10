
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

          var i;

          console.log("----Output text".green)
          console.log("# output text in array = " + data.output.text.length)
          for (i=0; i < data.output.text.length; i++) {
              console.log(JSON.stringify(data.output.text[i]));
            }

          console.log("----Output nodes visited".green)
          console.log("# nodes visited in array = " + data.output.nodes_visited.length)
          for (i=0; i < data.output.nodes_visited.length; i++) {
              console.log(JSON.stringify(data.output.nodes_visited[i]));
            }

          console.log("----Intent".green)
          console.log("# intents in array = " + data.intents.length)
          for (i=0; i < data.intents.length; i++) {
              console.log(JSON.stringify(data.intents[i]));
            }

          console.log("----Entities".green)
          console.log("# entities in array = " + data.entities.length)
          for (i=0; i < data.entities.length; i++) {
              console.log(JSON.stringify(data.entities[i]));
            }

          console.log("----Gold Node Status".green)
          console.log(JSON.stringify(data.context.start_server_search));

          console.log("----Context".green)
          console.log(JSON.stringify(data.context));

          console.log("--------------------------------------------".green)

				 callback(null, 'step2');
			   })
	   },

        //////////////////////////////////////////////////////////////////////
        ///// analyze the intent. If complex node (ie intent is search)  /////
        ///// work is conducted and the results are appended to         /////
        ///// the output array with other messages received from watson /////
        ///// This sets up next step for emitting all watson responses /////
        ////////////////////////////////////////////////////////////////////

	    function(callback){
        getReplyToIntent(req, function(err){

            console.log(">>>>> 3. Intent was Analyzed ".green);

            callback(null, 'step3');
        })
	     },

      ////////////////////////////////////////////////////////////////////
      //////   build, send and save chat messages (may be multiple) /////
      /////            from Watson in response                      /////
      ///////////////////////////////////////////////////////////////////
    function(callback){
      handleChatMessages(req, function(){

        console.log(">>>>> 4.  Replies Sent by Watson".green);
        callback(null, 'step4');

      })
    }

  ],
      function(err, results){
        if (err) {
          console.log("error in async sequence")
          return next(err);
        }
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
//      return res.status( 500 );
        var err = 500;
        cb(err, null );
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

    var intentType = "NOACTION";

    if (req.bag.data.context.start_server_search) {
      intentType = "SEARCHTITLE";
    }

    switch (intentType) {
        case "SEARCHTITLE":
            const URL = 'https://www.googleapis.com/books/v1/volumes?q=';
            axios(URL + req.bag.data.context.search_arg, {
              method: 'get',
              headers: {'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                })
              .then(function(response){
                console.log(">>>>GOOGLE SUCCESS<<<<".green)

                // store google search result on session
  //              req.session.search_result_object = response;

                parseBookSearchResult(req, response, function(){      // load array with watson and custom messages

                  console.log("COMPLETED PARSE SEARCH RESULTS".green)

                  cb(null);
                })
              })
              .catch(function(error){
                console.log(">>>>GOOGLE FAILURE<<<<")
                console.log(" Status = " + error.response.status);
                console.log(" Headers = " + error.response.headers);
                console.log(" Message = " + error.message);
                cb(error);
              });

            break;

        default:
            parseContextOutput(req)             // just load array with Watson messages (maybe be multiples)
            cb(null)
            break;
    }
}



////////////////////////////////////////////////////////
//////////// Parse Google Book Search Results //////////
//////////// And Load Some Messages for Chat //////////
//////////////////////////////////////////////////////

function parseBookSearchResult(req, response, cb) {

  console.log(">>>>Complex Route with Google Search".green);

  /*
  var responseObject = {
    responseBuildID: "",
    responseTime: 0,
    responseText: ""
  };
  */

  var responseArray = [];

  responseArray = [];                                                  // intialize

  var i = 0;
  var x = req.bag.data.output.text.length;                            // number of output messages from watson
  var g = response.data.items.length;                                 // confirm that json object has data

  var searchBookArg = req.bag.data.context.search_arg;
  var totalBooksFound = response.data.totalItems;

  // excerpt pieces of data from 1st entry of JSON object retrieved from Google search

  if (g >= 0) {
    var title =           response.data.items[0].volumeInfo.title
    var textSnippet =     response.data.items[0].searchInfo.textSnippet;
    var pageCount =       response.data.items[0].volumeInfo.pageCount;
    var averageRating =   response.data.items[0].volumeInfo.averageRating;
    var buyLink =         response.data.items[0].volumeInfo.buyLink;
    var y =               response.data.items[0].volumeInfo.authors.length // determine number of authors
    }

  if (y >= 0) {
    var leadAuthor =      response.data.items[0].volumeInfo.authors[0]
  }

  // build custom messages for reponse to the user

  var bookSearchMessage1 = `I retrieved a total of ${totalBooksFound} publications based on your request > ${searchBookArg}`;
  var bookSearchMessage2 = `The top recommendation is ${title} written by ${leadAuthor}. It has ${pageCount} pages with an average rating of ${averageRating}.`
  var bookSearchMessage3 = `${textSnippet}`;
  var bookSearchMessage4 = `Would you like me to email you the top 10 recommendations?`;


  // first load the response array with outputs received from Watson Conversation
  for (i=0; i < x; i++) {
        var responseObject = {};
        responseObject.responseBuildID = `${Date.now()}${uuid.v4()}`;
        responseObject.responseTime = moment.utc().format('lll');
        responseObject.responseText = req.bag.data.output.text[i];
        responseArray.push(responseObject);
      }

  // now load load custom messages into a temporary array
  var bookSearchMessageArray = [];

  bookSearchMessageArray.push(bookSearchMessage1);
  bookSearchMessageArray.push(bookSearchMessage2);
  bookSearchMessageArray.push(bookSearchMessage3);
  bookSearchMessageArray.push(bookSearchMessage4);
  var k = bookSearchMessageArray.length;
  var n = 0;

  // Now iterate over the temporary array and load the response array with custom messages. This completes the dialogue response

  for (n=0; n < k; n++) {
        var responseObject = {};
        responseObject.responseBuildID = `${Date.now()}${uuid.v4()}`;
        responseObject.responseTime = moment.utc().format('lll');
        responseObject.responseText = bookSearchMessageArray[n];
        responseArray.push(responseObject);
      }

  req.bag.responseArray = responseArray;

  cb();
  }



  ////////////////////////////////////////////////////////
  //////////// load messages into a response array////////
  //////////////////////////////////////////////////////

  function parseContextOutput(req) {

    console.log(">>>>Straight Route No Google Search".green);

  /*
    var responseObject = {
      responseBuildID: "",
      responseTime: 0,
      responseText: ""
    };
*/
    var responseArray = [];

    responseArray = [];                                                  // intialize

    var x = req.bag.data.output.text.length;                            // number of output messages from watson
    var i = 0;

    for (i=0; i < x; i++) {
          var responseObject = {};
          responseObject.responseBuildID = `${Date.now()}${uuid.v4()}`;
          responseObject.responseTime = moment.utc().format('lll');
          responseObject.responseText = req.bag.data.output.text[i];
          responseArray.push(responseObject);

        };

    req.bag.responseArray = responseArray;

    return;
    }



///////////////////////////////////////////////////////
//////////// Build message format for sockets//////////
//////////////////////////////////////////////////////

function handleChatMessages(req, cb) {

  console.log(">>>>>>>>>>>>ENTERED HANDLE CHAT MESSAGES <<<<<<<<<<<<<<")

  //prepare message and response array to broadcast from response from watson
  // note that the array is needed because there may be multiple outputs from watson conversation
  // in addition, when the gold node is processed (ie seaching) a complex response is formulated

  var messageCount = req.bag.responseArray.length;
  var i = 0;

  for (i=0; i < messageCount; i++) {
  console.log(">>>>>>Begin Iteration # " + i );
  buildMessageToSend.channelID = req.bag.channelID;
  buildMessageToSend.user = watsonUserID;
  buildMessageToSend.id = req.bag.responseArray[i].responseBuildID;
  buildMessageToSend.time = req.bag.responseArray[i].responseTime;
  buildMessageToSend.text = req.bag.responseArray[i].responseText;


        ////////////////////////////////////////
        ///// Broadcast and Save Messages /////
        //////////////////////////////////////


            broadcastChatMessage(req, function() {
              console.log("Message Broadcasted".green);
                saveChatMessage(req, function(){
                  console.log("Chat Message Saved".green);

                })
  			    })
          }
            saveWatsonMessage(req, function() {
              console.log("Watson Message Saved".green);
            cb();
            })
      }


////////////////////////////////////////////////////
//////////// Broadcast response via sockets//////////
////////////////////////////////////////////////////

function broadcastChatMessage(req, cb) {

    console.log(">>>>>>>Entered Broadcast<<<<<<<<<<<".green)
    console.log({message: buildMessageToSend})

    var io = req.app.get('socketio');

    io.to(buildMessageToSend.channelID).emit('new bc message', buildMessageToSend);
    cb()
  }
  ///////////////////////////////////////////////////////
  //////////// save watson response on db     //////////
  /////////////////////////////////////////////////////
function saveWatsonMessage(req, cb){

  console.log("entered Save Watson Message".green)
  console.log({bag: req.bag.data})

  //prepare to save the watson chat response to mongodb collection
  const newwatsonResponse = new WatsonResponse(req.bag.data);
  // save watson messages
  newwatsonResponse.save(function (err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'}); }
      return;
    });

  cb()
  }
  ///////////////////////////////////////////////////////
  //////////// save chat message on db        //////////
  /////////////////////////////////////////////////////
function saveChatMessage(req, cb){

    console.log("entered Save Chat Message".green)

    //prepare to save user chat message to mongodb collection
    const newChatMessage = new ChatMessage(buildMessageToSend);

    // establish ownership of the message being posted
    newChatMessage.owner = req.session.owner;

    newChatMessage.save(function (err, data) {
        if (err) {
          console.log(err);
//          return res.status(500).json({msg: 'internal server error'});
          }
        return;
      });

    cb()
    }
////////////////////////////////////////////////////////////////
