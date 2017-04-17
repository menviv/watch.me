/*-----------------------------------------------------------------------------
This template gets you started with a simple dialog that echoes back what the user said.
To learn more please visit
https://docs.botframework.com/en-us/node/builder/overview/
-----------------------------------------------------------------------------*/

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

            }

            
        } 
        
    },
    function (session, results) {

        session.userData.locationDetails = results.response;

        session.sendTyping();

        if (session.userData.ReminderType == 'קבוע') {

            builder.Prompts.number(session, "באיזה יום קבוע בשבוע? למשל אם יום רביעי אז נא לציין '4'"); 

        } else {

            builder.Prompts.number(session, "באיזה יום בחודש? למשל: ביום ה- 20 לחודש..."); 
        }
  
    },
    function (session, results) {

        session.userData.ReminderDay = results.response;
        
        session.sendTyping();

        builder.Prompts.number(session, "שעה מועדפת? אם מדובר בשמונה בערב אז כדאי לציין '20'"); 
    },
    function (session, results) {

        session.userData.ReminderTime = results.response-3;
        
        session.sendTyping();

        builder.Prompts.text(session, "אז מה בעצם להזכיר לך? אנא לציין כותרת קצרה וקולעת כי אני לא מוצלח בלזכור בכללי...סבבה? יופי"); 
    },    
    function (session, results) {

        session.userData.ReminderText = results.response;

        var LogTimeStame = moment().format(DateFormat); 

        var o_id = new mongo.ObjectID();

        var now = moment();
        var minutes = now.minutes()+1;
        var ReminderMonth = moment().month();
        var ReminderYear = moment().year();

        var date = new Date(Date.UTC(ReminderYear, ReminderMonth, session.userData.ReminderDay, session.userData.ReminderTime, minutes, 0));

        var dateTz = momentimezone.tz(date,zone).format();

        var EntityRecord = {
              '_id': o_id,
              'CreatedTime': LogTimeStame,
              'ReminderDay': session.userData.ReminderDay,
              'ReminderTime': session.userData.ReminderTime,
              'ReminderType': session.userData.ReminderType,
              'EntityType': session.userData.userChoice,
              'EntityToPublishDate': dateTz,
              'ReminderText' : session.userData.ReminderText,
              'address': session.message.address,
              'EntityStatus': 'pending',
              'userId': session.userData.userId
        }; 

        colEntities.insert(EntityRecord, function(err, result){}); 

        session.userData.PostEntityInsert = 'true';

        session.sendTyping();

        session.send("סבבה, רשמתי לעצמי להזכיר לך.");

        //session.endDialog();

        session.beginDialog("/");

        //session.beginDialog("/createReminder");

    },
    function (session, results) {

        session.endDialog();
        
    }
]);








bot.dialog('/login', [
    function (session) {

        session.sendTyping();

        builder.Prompts.number(session, "Hi there, before I can watch your back, please tell me your phone number:"); 


    },
    function (session, results) {

        session.userData.phoneNumber = results.response.entity;

        SignIn();
        
        function SignIn() {

                        var cursor = colUserData.find({ 'PhoneNumber': session.userData.phoneNumber });
                        
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
                     'phoneNumber': session.userData.phoneNumber, 
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


