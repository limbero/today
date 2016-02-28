try {
  var apikeys = require('./apikeys.json');
} catch (e) {
  var apikeys = {
    trakt_tv: {
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET
    },
    forecast_io: process.env.FORECAST_IO_APIKEY
  }
}

var bodyParser = require('body-parser');
var request = require('request');

var mongo_client = require('mongodb').MongoClient;
var assert = require('assert');

var mongo_url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/limbero-today';
var mongo_db;
mongo_client.connect(mongo_url, function(err, db) {
  assert.equal(null, err);
  console.log("MongoDB connection established.");
  mongo_db = db;
});

var session_secret = "Axels1Hemliga2Grej3Hahaha4";
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongo_store = require('connect-mongo')(session);

var express = require('express');
var app = express();
app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
  secret: session_secret,
  resave: false,
  saveUninitialized: true,
  store: new mongo_store({ url: mongo_url })
}));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/calendar', function (req, res) {
  mongo_db.collection('trakt_sessions', function(err, collection) {
    collection.findOne({session_id:req.session.id}, function(err, item) {
      if(item === null) {
        res.json( { 'error': -1} );
      } else {
        var token = item.token;
        var now = new Date();
        if (now.getHours() >= 22) {
          now.setDate(now.getDate()+1);
        }
        var now_string = now.getFullYear() + '-' +
                        (now.getMonth() < 9 ? '0'+(now.getMonth()+1) : now.getMonth()+1) + '-' +
                        (now.getDate() < 9 ? '0'+(now.getDate()-1) : now.getDate()-1);
        request({
          method: 'GET',
          url: 'https://api-v2launch.trakt.tv/calendars/my/shows/'+now_string+'/1',
          json: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token.access_token,
            'trakt-api-version': '2',
            'trakt-api-key': apikeys.trakt_tv.client_id
          }
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            var shows = [];
            for(var i=0; i < body.length; i++) {
              if(shows.indexOf(body[i].show.title) === -1) {
                shows.push(body[i].show.title);
              }
            }
            res.send(shows);
          } else {
            console.log(response.statusCode, response.statusMessage);
          }
        });
      }
    });
  });
});

app.get('/traktauth', function (req, res) {
  res.redirect( 'https://trakt.tv/oauth/authorize' +
                '?response_type=code' +
                '&client_id=' + apikeys.trakt_tv.client_id +
                '&redirect_uri=' + server_url+'/traktauthcallback' +
                '&state=' );
});

app.get('/traktauthcallback', function (req, res) {
  if (req.query.hasOwnProperty('code')) {
    request({
      method: 'POST',
      url: 'https://trakt.tv/oauth/token',
      json: true,
      body: {
        code: req.query.code,
        client_id: apikeys.trakt_tv.client_id,
        client_secret: apikeys.trakt_tv.client_secret,
        redirect_uri: server_url+'/traktauthcallback',
        grant_type: 'authorization_code'
      }
    }, function (error, response, body) {
      if(!error && response.statusCode === 200) {
        mongo_db.collection('trakt_sessions', function(err, collection) {
          collection.insert({session_id: req.session.id, token: body}, function(err, result) {});
        })
        res.redirect('/?traktauth=success');
      } else {
        res.redirect('/?traktauth=failure');
      }
    });
  } else {
    res.redirect('/settings');
  }
});

var server_url = 'http://';
var webport = process.env.PORT || 3000;
var server = app.listen(webport, function () {
  var host = server.address().address;
  var port = server.address().port;

  server_url += (host === '::' ? 'localhost' : host);
  server_url += (port == 80 ? '' : ':'+port);

  console.log('idag listening at http://%s:%s', host, port);
})

function randomString() {
  var length = 64
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  var result = ''
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))]
  return result
}
