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

var session_secret = process.env.SESSION_SECRET || "Axels1Hemliga2Grej3Hahaha4";
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongo_store = require('connect-mongo')(session);

var express = require('express');
var app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
  secret: session_secret,
  resave: false,
  saveUninitialized: true,
  store: new mongo_store({ url: mongo_url })
}));

app.get('/', function (req, res) {
  mongo_db.collection('trakt_sessions', function(err, collection) {
    collection.findOne({session_id:req.session.id}, function(err, item) {
      var config = {};
      if(item === null) {
        config.tvstring = '<a href="/traktauth">logga in med trakt</a> för att se vad som går på tv';
      } else {
        config.tvstring = '&nbsp;';
      }
      res.render('index', {config: config});
    });
  });
});

app.get('/calendar', function (req, res) {
  mongo_db.collection('trakt_sessions', function(err, collection) {
    collection.findOne({session_id:req.session.id}, function(err, item) {
      if(item === null) {
        res.json( { 'error': -1} );
      } else {
        var token = item.token;
        var now = new Date();
        now.setDate(now.getDate()-1);
        if (now.getHours() >= 22) {
          now.setDate(now.getDate()+1);
        }
        var now_string = now.getFullYear() + '-' +
                        (now.getMonth() < 9 ? '0'+(now.getMonth()+1) : now.getMonth()+1) + '-' +
                        (now.getDate() < 9 ? '0'+(now.getDate()) : now.getDate());
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
            res.send([]);
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
        });
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
  server_url = process.env.PUBLIC_URL || server_url;

  console.log('idag listening at %s', server_url);
});
