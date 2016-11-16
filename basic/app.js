var express = require('express');
var fs = require("fs");
var app = express();
var https = require('https');
var WebSocketServer = require('ws').Server;

var options = {
    key: fs.readFileSync('../privatekey.pem'),
    cert: fs.readFileSync('../certificate.pem')
};

var server = https.createServer(options, app).listen(3000, function () {
    console.log('Https server listening on port ' + 3000);
});

app.use(express.static('client'));

var wss = new WebSocketServer({server: server});
// 有socket连入
wss.on('connection', function (socket) {
    console.log(socket.constructor);
    // 转发收到的消息
    socket.on('message', function (message) {
        console.log("收到" + socket.socketId + "的消息", JSON.stringify(message));
        wss.clients.forEach(function each(client) {
            if (socket != client)
                client.send(message);
        });
    });
});

console.log("server is started");