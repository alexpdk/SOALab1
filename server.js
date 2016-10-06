var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var parseUtils = require('./parser.js');

app.use(express.static('client'));

app.get('/', function(req, res){
	res.sendFile(__dirname + 'client/index.html');
});

io.on('connection', socket=>{
	socket.on('disconnect', ()=>console.log('user disconnected'));
	socket.on('expression', msg=>
		/*socket.emit('result', parseUtils.evaluate(msg))*/
		io.sockets.emit('result', parseUtils.evaluate(msg)));
	socket.on('error', err=>console.error(err));
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});