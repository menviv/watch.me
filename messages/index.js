/*-----------------------------------------------------------------------------
This template gets you started with a simple dialog that echoes back what the user said.
To learn more please visit
https://docs.botframework.com/en-us/node/builder/overview/
-----------------------------------------------------------------------------*/


///////// SMS Module ///////////////////////
var clockwork = require("clockwork")({key:"30217d0367824cf05ad5019ef795570d518a86da"});

function SendSMS(smsNum, smsRes) {

        clockwork.sendSms({ To: smsNum, Content: "Hey, " + smsRes + " might need your help. Click here to get helpful information to reach out and assist them."}, function(error, resp) {
            if (error) {
                console.log("Something went wrong", error);
            } else {
                console.log("Message sent",resp.responses[0].id);
            }
        });
}

///////// Time Module ///////////////////////
var moment = require('moment');
var DateFormat = "DD-MM-YYYY HH:mm:ss";
var LogTimeStame = moment().format(DateFormat); 


///////// DB Module ///////////////////////
var mongo = require('mongodb');
var connString = 'mongodb://watchme:watchme@ds161960.mlab.com:61960/watchme';
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var dbm;
var colUserData;
var colEntities;
var colConnections;
var colLog;

// Initialize connection once
 
mongo.MongoClient.connect(connString, function(err, database) {
  if(err) throw err;
  
  dbm = database;
  colUserData = dbm.collection('UserData'); 
  colEntities = dbm.collection('Entities');
  colConnections = dbm.collection('Connections');
  colLog =  dbm.collection('Log'); 
  
});








// Cron Scheduler  //////////////////////////////////////////////////////////////////////
var schedule = require('node-schedule');



var rule = new schedule.RecurrenceRule();

rule.minute = new schedule.Range(0, 59, 1);

schedule.scheduleJob(rule, function(){

            var currentUTCtime = moment().add(1, 's');

            var cursor = colEntities.find({ 'EntityStatus': 'pending' });
                        
            var result = [];
            cursor.each(function(err, doc) {
                if(err)
                    throw err;
                        if (doc === null) {

                            if (result.length>0) {

                                for (i=0; i<result.length; i++) {

                                    var StartVerifyUTCtime = result[i].StartVerifyUTCtime; 

                                    var diff = moment(StartVerifyUTCtime).diff(currentUTCtime);

                                    if (diff < 0) {

                                        var LogTimeStame = moment().format(DateFormat); 

                                        var EntityId = result[i]._id; 

                                        var Address = result[i].address; 

                                        var userid = result[i].userid; 

                                        sendNotification(userid, Address, EntityId, diff);

                                    }

                                }   
                        
                                                
                            } 

                                return;
                            }

                            result.push(doc);
            }); 


            function sendNotification(userid, Address, EntityId, diff) {

                var cursor = colConnections.find({ 'userid': userid });
                            
                var result = [];
                cursor.each(function(err, doc) {
                    if(err)
                        throw err;
                            if (doc === null) {

                                if (result.length>0) {

                                    for (i=0; i<result.length; i++) {

                                            var friendPhone = result[i].friendPhone; 

                                            var friendName = result[i].friendName; 

                                            SendSMS(friendPhone, friendName);

                                          //  bot.beginDialog(Address, '/sendNotification', { EntityId: EntityId });


                                    }   
                            
                                                    
                                } 

                                    return;
                                }

                                result.push(doc);
                });  

            }    


    
});








"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require('azure-storage');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);




bot.dialog('/', [
    function (session) {


            if (session.userData.authanticated != 'true') {

                session.beginDialog("/login");

            } else {

                builder.Prompts.choice(session, "So, you need me to be availble with you at", "Home|Somewhere Else");

            }
     

    },
    function (session, results) {

        if (results.response) {

            session.userData.locationType = results.response.entity;

            session.sendTyping();

            if (session.userData.locationType != 'Home' ) {

                session.sendTyping();

                builder.Prompts.text(session, "Ok, you must have an address, please tell me the exact location and type in as many details as possible: "); 

            } else {

                session.userData.locationDetails = 'Home';

                builder.Prompts.text(session, "If you think that I should know anything that can help me to keep your safety, please type in as many details as possible: "); 

            }

            
        } 
        
    },
    function (session, results) {

        session.userData.locationDetails = results.response;

        session.sendTyping();

        builder.Prompts.choice(session, "Now let's be honest with each other... how well do you know the person that you intend to meet?", "Zero|A little|He is well known|I met him in the past");
  
    },
    function (session, results) {

        session.userData.pastFamiliarity = results.response.entity;

        session.sendTyping();

        builder.Prompts.choice(session, "When do you want me to start verify your level of confident in the situation? [minutes]", "5|15|30|60");
  
    },
    
    function (session, results) {

        session.userData.StartVerifyMinutes = results.response.entity;

        var timeToadd = parseInt(session.userData.StartVerifyMinutes);

        session.userData.StartVerifyUTCtime = moment().add(timeToadd, 'm');
        
        session.sendTyping();

        function checkForPastConnections() {

                        var cursor = colConnections.find({ 'userid': session.message.user.id });
                        
                        var result = [];
                        cursor.each(function(err, doc) {
                            if(err)
                                throw err;
                            if (doc === null) {
                                // doc is null when the last document has been processed


                                if (result.length>0) {
                                    
                                    session.userData.pastConnections = 'true';

                                    session.send("By the way, I found past connections that you wanted to be notified: ");

                                    for (i=0; i<result.length; i++) {

                                        session.send(i+1 + ". " + result[i].friendName + " [" + result[i].friendPhone + "]");

                                    }

                                    builder.Prompts.choice(session, "Would you like to notify them or create new?", "Create New|Notify them");

            
                                } else {

                                    session.userData.pastConnections = 'false';

                                    session.sendTyping();

                                    builder.Prompts.choice(session, "Ok, now I need to know who to notify if I'll be worried for your safety", "Create New Nonnection|Just inform the police");

                                }


                                return;
                            }
                            // do something with each doc, like push Email into a results array
                            result.push(doc);
                        }); 

        };

        checkForPastConnections();


    },
    function (session, results) {

        if (session.userData.pastConnections == 'true') {

                        var cursor = colConnections.find({ 'userid': session.message.user.id });
                        
                        var result = [];
                        cursor.each(function(err, doc) {
                            if(err)
                                throw err;
                            if (doc === null) {
                                // doc is null when the last document has been processed


                                if (result.length>0) {
                                    
                                    for (i=0; i<result.length; i++) {

                                        var smsNumasStr = '972' + result[i].friendPhone;

                                        SendSMS(smsNumasStr);

                                    }

            
                                }

                                return;
                            }
                            // do something with each doc, like push Email into a results array
                            result.push(doc);
                        }); 



                        session.send("Great! I have what I need to watch you. Enjoy your time :-)");

                        var newRecord = {
                            'CreatedTime': LogTimeStame,
                            'locationType': session.userData.locationType,
                            'locationDetails': session.userData.locationDetails,
                            'pastFamiliarity': session.userData.pastFamiliarity,
                            'MapImgURL': MapImgURL,
                            'StartVerifyUTCtime': session.userData.StartVerifyUTCtime,
                            'StartVerifyMinutes': session.userData.StartVerifyMinutes,
                            'OwnerPhoneNumber': session.userData.OwnerPhoneNumber,
                            'OwnerName' : session.userData.Name,
                            'userid': session.message.user.id,
                            'address': session.message.address,
                            'EntityStatus': 'pending'
                        };

                        colEntities.insert(newRecord, function(err, result){}); 

                        var MapImgURL = "https://maps.googleapis.com/maps/api/staticmap?center=" + session.userData.locationDetails + "&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=AIzaSyAgfT-CTGCLQT18FlbEUNTDWMZmTr1DUv4";

                        session.endDialog();


        } else {

            session.sendTyping();

            builder.Prompts.text(session, "What's your connection's name: "); 
        
        }
        
    },
    function (session, results) {

            session.userData.friendName = results.response;

            session.sendTyping();

            builder.Prompts.number(session, "And their phone number: "); 
        
    },
    function (session, results) {

        session.userData.SendSMS = results.response;

        if (session.userData.pastConnections != 'true') {

            var smsNumasStr = '972' + session.userData.SendSMS;

            SendSMS(smsNumasStr, session.userData.Name);

        }

        var MapImgURL = "https://maps.googleapis.com/maps/api/staticmap?center=" + session.userData.locationDetails + "&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=AIzaSyAgfT-CTGCLQT18FlbEUNTDWMZmTr1DUv4";

  
        session.sendTyping();

        session.send("Great! I have what I need to watch you. Enjoy your time :-)");

        var newRecord = {
              'CreatedTime': LogTimeStame,
              'locationType': session.userData.locationType,
              'locationDetails': session.userData.locationDetails,
              'pastFamiliarity': session.userData.pastFamiliarity,
              'MapImgURL': MapImgURL,
              'StartVerifyUTCtime': session.userData.StartVerifyUTCtime,
              'StartVerifyMinutes': session.userData.StartVerifyMinutes,
              'friendPhone': smsNumasStr,
              'friendName': session.userData.friendName,
              'OwnerPhoneNumber': session.userData.OwnerPhoneNumber,
              'OwnerName' : session.userData.Name,
              'userid': session.message.user.id,
              'address': session.message.address,
              'EntityStatus': 'pending'
        };

        colEntities.insert(newRecord, function(err, result){}); 

            
                 var newConnectionRecord = {
                    'CreatedTime': LogTimeStame,
                    'userid': session.message.user.id,
                    'friendPhone': smsNumasStr,
                    'friendName': session.userData.friendName,
                    'address': session.message.address,
                    'recordStatus': 'active'
                };

                colConnections.insert(newConnectionRecord, function(err, result){});            


        session.endDialog();

        
    }
]);







bot.dialog('/sendNotification', [

    function (session, args) {

        var o_ID = new mongo.ObjectID(args.EntityId);
        //var diff = paths[args.diff];
        //session.dialogData.commands = location.commands;
        //builder.Prompts.choice(session, location.description, location.commands);

        session.send("sendNotification " + args.EntityId);

        session.endDialog();

        //session.endConversation()


    }


]);






bot.dialog('/login', [
    function (session) {

        session.sendTyping();

        builder.Prompts.number(session, "Hi there, before I can watch your back, please tell me your phone number:"); 


    },
    function (session, results) {

        session.userData.OwnerPhoneNumber = results.response;

        SignIn();
        
        function SignIn() {

                        var cursor = colUserData.find({ 'userid': session.message.user.id });
                        
                        var result = [];
                        cursor.each(function(err, doc) {
                            if(err)
                                throw err;
                            if (doc === null) {
                                // doc is null when the last document has been processed


                                if (result.length>0) {
                                    
                                    session.userData.authanticated = 'true';

                                    session.userData.Name = result[0].userName;

                                    session.sendTyping();

                                    session.send("OK " + session.userData.Name + ", now I remember you..");

                                    session.beginDialog("/");
            
                                } else {

                                    session.userData.authanticated = 'false';

                                    session.sendTyping();

                                    builder.Prompts.text(session, "I guess this is the first time we meet, so nice to meet you, I am WatchMe, and you?"); 

                                }


                                return;
                            }
                            // do something with each doc, like push Email into a results array
                            result.push(doc);
                        }); 


        }


  
    },
    function (session, results) {

        session.userData.Name = results.response;

               var newRecord = {

                     'CreatedTime': LogTimeStame,
                     'userName': session.userData.Name,
                     'ownerPhoneNumber': session.userData.OwnerPhoneNumber, 
                     'address': session.message.address, 
                     'userid': session.message.user.id
               }; 

               colUserData.insert(newRecord, function(err, result){}); 

               session.userData.authanticated = 'true';

               session.beginDialog("/");

    }
]);







bot.dialog('restartDialog', function (session, args) {

    //SendSMS("972549959409");

    session.userData.authanticated = 'false';

    session.beginDialog("/");


}).triggerAction({ 
    onFindAction: function (context, callback) {
        // Recognize users utterance
        switch (context.message.text.toLowerCase()) {
            case '/restart':
                // You can trigger the action with callback(null, 1.0) but you're also
                // allowed to return additional properties which will be passed along to
                // the triggered dialog.
                callback(null, 1.0, { topic: 'restart' });
                break;
            default:
                callback(null, 0.0);
                break;
        }
    } 
});











/*

// Intercept trigger event (ActivityTypes.Trigger)
bot.on('trigger', function (message) {
    // handle message from trigger function
    var queuedMessage = message.value;
    var reply = new builder.Message()
        .address(queuedMessage.address)
        .text('This is coming from the trigger: ' + queuedMessage.text);
    bot.send(reply);
});

// Handle message from user
bot.dialog('/', function (session) {
    var queuedMessage = { address: session.message.address, text: session.message.text };
    // add message to queue
    session.sendTyping();
    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorage);
    queueSvc.createQueueIfNotExists('bot-queue', function(err, result, response){
        if(!err){
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage('bot-queue', queueMessageBuffer, function(err, result, response){
                if(!err){
                    // Message inserted
                    session.send('Your message (\'' + session.message.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                } else {
                    // this should be a log for the dev, not a message to the user
                    session.send('There was an error inserting your message into queue');
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            session.send('There was an error creating your queue');
        }
    });

});

*/

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}


