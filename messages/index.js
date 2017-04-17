/*-----------------------------------------------------------------------------
This template gets you started with a simple dialog that echoes back what the user said.
To learn more please visit
https://docs.botframework.com/en-us/node/builder/overview/
-----------------------------------------------------------------------------*/


///////// SMS Module ///////////////////////
var clockwork = require("clockwork")({key:"30217d0367824cf05ad5019ef795570d518a86da"});

function SendSMS(smsNum) {

        clockwork.sendSms({ To: smsNum, Content: "Test!"}, function(error, resp) {
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
var colLog;

// Initialize connection once
 
mongo.MongoClient.connect(connString, function(err, database) {
  if(err) throw err;
  
  dbm = database;
  colUserData = dbm.collection('UserData'); 
  colEntities = dbm.collection('Entities');
  colLog =  dbm.collection('Log'); 
  
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

                builder.Prompts.text(session, "Ok, you must have an address, please type in as many details as possible: "); 

            } else {

                session.userData.locationDetails = 'Home';

            }

            
        } 
        
    },
    function (session, results) {

        session.userData.locationDetails = results.response;

        session.sendTyping();

        builder.Prompts.choice(session, "When do you want me to start verify your level of confident in the situation? [minutes]", "5|15|30|60");
  
    },
    function (session, results) {

        session.userData.StartVerifyMinutes = results.response.entity;

        session.userData.StartVerifyUTCtime = moment().add(7, 'm') + session.userData.StartVerifyMinutes;
        
        session.sendTyping();

        builder.Prompts.number(session, "Who should I notify if I fear for your safety? Give me their phone number: "); 

    },
    function (session, results) {

        session.userData.SendSMS = results.response;
  
        session.sendTyping();

        session.send("Great! I have what I need to watch you. Enjoy your time :-)");

        var newRecord = {
              'CreatedTime': moment().format(DateFormat),
              'locationType': session.userData.locationType,
              'locationDetails': session.userData.locationDetails,
              'StartVerifyUTCtime': session.userData.StartVerifyUTCtime,
              'StartVerifyMinutes': session.userData.StartVerifyMinutes,
              'SendSMS': session.userData.SendSMS,
              'OwnerPhoneNumber': session.userData.OwnerPhoneNumber,
              'OwnerName' : session.userData.Name,
              'userid': session.message.user.id,
              'address': session.message.address,
              'EntityStatus': 'pending'
        };

        colEntities.insert(newRecord, function(err, result){}); 

        session.endDialog();

        
    }
]);








bot.dialog('/login', [
    function (session) {

        session.sendTyping();

        builder.Prompts.number(session, "Hi there, before I can watch your back, please tell me your phone number:"); 


    },
    function (session, results) {

        session.userData.OwnerPhoneNumber = results.response.entity;

        SignIn();
        
        function SignIn() {

                        var cursor = colUserData.find({ 'PhoneNumber': session.userData.OwnerPhoneNumber });
                        
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

                                    session.send("OK" + session.userData.Name + ", now I remember you..");

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

        session.userData.Name = results.response.entity;

               var newRecord = {

                     'CreatedTime': moment().format(DateFormat),
                     'userName': session.userData.Name,
                     'ownerPhoneNumber': session.userData.OwnerPhoneNumber, 
                     'address': session.message.address, 
               }; 

               colUserData.insert(newRecord, function(err, result){}); 

               session.userData.authanticated = 'true';

               session.beginDialog("/");

    }
]);












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


