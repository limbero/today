var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.get('/', function (req, res) {
	res.send('Hella world!')
})

var webport = process.env.PORT || 3000;
var server = app.listen(webport, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('today listening at http://%s:%s', host, port);
})
