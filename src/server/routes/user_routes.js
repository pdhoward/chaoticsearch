
//////////////////////////////////////////////////////
/////////////USER AUTHENTICATION/////////////////////
////////////////////////////////////////////////////
import OldMessages              from '../models/Message';
import transport                from '../../../config/gmail';
import bodyparser               from 'body-parser';
import colors                   from 'colors';

const User =                    require('../models/User.js');

const mailObject = {
  from: '"ChaoticBots 👥" <chaoticbotshelp@gmail.com>',
  to: 'patrick.howard@hotmail.com',
  subject: 'Another Member Boarded the Platform',
  text: 'ChaoticBots continues to serve the globe. '
}

//////////////////////////////////////////////
///////////// routes ////////////////////////
////////////////////////////////////////////

module.exports = function loadUserRoutes(router, passport) {
  router.use(bodyparser.json());

  router.get('/auth/facebook', passport.authenticate('facebook', {
    session: false,
    successRedirect: '/chat',
    failureRedirect: '/'
  }));

  router.get('/auth/facebook/callback', passport.authenticate('facebook', {
    session: false,
    successRedirect: '/chat',
    failureRedirect: '/'
  }));


  router.post('/sign_up', passport.authenticate('local-signup'), function(req, res) {

    // capture owner id from the passport local login. used to cleanup up chat messages in db
    req.session.owner = req.user.local.username;
    res.json(req.user);

    res.on('finish', function() {
      transport.sendMail(mailObject, function (error, info) {
            if (error) console.log(error);
          })
        })

  });


  router.post('/sign_in', passport.authenticate('local-login'), function(req, res) {

    // capture owner id from the passport local login. used to cleanup up chat messages in db
    req.session.owner = req.user.local.username;
    res.json(req.user);

    res.on('finish', function() {

      transport.sendMail(mailObject, function (error, info) {
            if (error) console.log(error);
          })

      // drop messages from prior searches for returning user. Note that req.owner is the user who owns all messages recorded with watson

      OldMessages.collection.remove({'owner': req.session.owner}, function(err, obj) {
        if(err) {
          console.log(err);
          }      
        });
      })

    });

  router.get('/signout', function(req, res) {
    req.logout();
    res.end();
  });

  //get auth credentials from server
  router.get('/load_auth_into_state', function(req, res) {
    res.json(req.user);
  });

  // get usernames for validating whether a username is available
  router.get('/all_usernames', function(req, res) {
    User.find({'local.username': { $exists: true } }, {'local.username': 1, _id:0}, function(err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }
      res.json(data);
    });
  })
};
