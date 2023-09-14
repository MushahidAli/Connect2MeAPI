const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());

mongoose.connect(process.env.MONGODB_STRING);
var db = mongoose.connection;
db.on('error', console.log.bind(console, "connection error"));
db.once('open', function (callback) { console.log("connection succeeded"); })

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
   extended: true
}));
app.use(express.json());

//SIGNUP
app.post('/sign_up/', async function (req, res) {
   var username = req.body.username;
   var email = req.body.email;
   var password = req.body.password;

   var data = {
      username, email, password
   }

   db.collection('connect2me_logon_collection').insertOne(data, function (err, collection) {
      if (err) throw err;
      console.log("Record inserted Successfully : " + collection);
   });
})

//VIEW-SIGNUP-DATA
app.get('/check_availability/:id', async function (req, res) {
   var answer = await db.collection('connect2me_logon_collection').findOne({ email: req.params['id'].toLowerCase() } function (err, collection) {
      if (err) throw err;
      console.log(collection)
      return collection;
   });
   if (answer) { res.send(answer); }
   else { res.send({ email: 'No', description: 'No Such Email Address Present In The Database!' }); }
   res.end();
})

//SIGNIN
app.post('/sign_in/', async function (req, res) {

   var answer = await db.collection('connect2me_logon_collection').findOne({ email: req.body['email'], password: req.body['password'] }, function (err, collection) {
      if (err) throw err;
      console.log(collection)
      return collection;
   });
   if (answer) {
      var email = req.body['email'];
      var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
      res.json({ auth: 'success', email: email, token: token });
   }
   else {
      res.json({ auth: 'failure' });
   }
   res.end();

})

//SEND-EMAIL
app.post('/send_email/', function (req, res) {

   try {
      var token = req.body['token'];
      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         var from = decoded.email;
         var to = req.body.to;
         var dateTime = Buffer.from(req.body.dateandtime).toString('base64');
         var message = Buffer.from(req.body.message).toString('base64');
         var personalContent = req.body.personalContent;

         var data = {
            from, to, dateTime, message, personalContent
         }

         db.collection('connect2me_email_collection').insertOne(data, function (err, collection) {
            if (err) throw err;
            console.log("Record inserted Successfully : " + collection);
         });
         res.end();
      }
   }
   catch (e) {
      res.send({ error: e.message });
   }
})

//VERIFY-TOKEN
app.post('/verify_token/', function (req, res) {

   try {
      var token = req.body['token'];
      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         res.send({ message: "success" });
      }
   }
   catch (e) {
      res.send({ message: e.message });
   }
})

//VIEWING-EMAIL
app.get('/view_email/:limit/:skip/:token', async function (req, res) {

   try {
      var token = req.params['token'];
      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         var answer = await db.collection('connect2me_email_collection').find({ to: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         }).sort({ _id: -1 }).limit(parseInt(req.params['limit'])).skip(parseInt(req.params['skip'])).toArray();
         if (answer) {
            res.send(answer);
         }
         res.end();
      }
   }
   catch (e) {
      res.send({ error: e.message });
   }

})

//HOW-MANY-EMAILS
app.get('/how_many_emails/:token', async function (req, res) {

   try {
      var token = req.params['token'];
      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         var answer = await db.collection('connect2me_email_collection').countDocuments({ to: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         });
         if (answer) {
            res.json({ emails: answer })
         }
         else {
            res.json({ emails: 0 });
         }
         res.end();
      }
   }
      catch (e) {
         res.send({ error: e.message });
      }

})

//DELETING-EMAIL
app.post('/delete_email/', async function (req, res) {

   var ObjectId = require('mongodb').ObjectId;
   const id = req.body.id;
   const convertedObjectId = new ObjectId(id);
   var answer = await db.collection('connect2me_email_collection').deleteOne({ _id: convertedObjectId }, function (err, collection) {
      if (err) throw err;
      console.log(collection)
      return collection;
   });
   if (answer) {
      res.send(answer);
   }
   res.end();

})

//DELETING-ALL-EMAILS
app.post('/delete_all_emails/', async function (req, res) {

   try {
      var token = req.body['token'];

      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         await db.collection('connect2me_email_collection').deleteMany({ to: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         });

         res.send({ message: "all emails deleted" });

         res.end();
      }
   }
   catch (e) {
      res.send({ error: e.message });
   }

})

//DELETING-ACCOUNT
app.post('/delete_account/', async function (req, res) {

   try {
      var token = req.body['token'];

      var decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      if (decoded.email) {
         await db.collection('connect2me_logon_collection').deleteOne({ email: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         });

         await db.collection('connect2me_email_collection').deleteMany({ from: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         });

         await db.collection('connect2me_email_collection').deleteMany({ to: decoded.email }, function (err, collection) {
            if (err) throw err;
            console.log(collection)
            return collection;
         });

         res.send({ message: "account deleted" });

         res.end();
      }
   }
   catch (e) {
      res.send({ error: e.message });
   }

})

app.listen(process.env.PORT || 3000);
