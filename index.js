/*
  Server side code for server in back end. sends public to hte brower/front end
*/
//setup for the actualy server
var express = require('express');
var app = express();
//so we can link to the entire public folder
var path = require('path');
var server = require('http').createServer(app);
//passing server here with socket.io arg
var io = require('socket.io')(server);
//given port OR default 3000
var port = process.env.PORT || 3000;


server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

//sends the entire folder to the client/browser, instead of html like before
app.use(express.static(path.join(__dirname, 'public')));
//number of uesrs connected or sockets created
var numUsers = 0;



//on connection / disconnection of sockets, logs messeges to the console for the server.
io.on('connection', (socket) => {
   var addedUser = false;
//listens for a "new messege" and takes its data
socket.on('new message', (data) => {//**** AFTER connected, it listens for new messeges.
  socket.broadcast.emit('new message', {//,<- emit a "new message", send's the socket's client's name and the msg from above a.k.a. data
    username: socket.username,
    message: data
  });
});

//Listends for the add user emission, takes the usdernames, check if its been added already [false by default from above]
socket.on('add user', (username) => {
  if (addedUser) return;     //if already set, dont do this again.
  socket.username = username + "#" + (numUsers + 1);//just a setter for username+ number to differentiate
  ++numUsers;                //total # users hosted by the server
  addedUser = true;          //flip it to false
  socket.emit('login', {numUsers: numUsers});//emit login signal

  //emmit "user joined" to all clients, takes the users name, and total # of users.
  socket.broadcast.emit('user joined', {
    username: socket.username,
    numUsers: numUsers});
});


//listens for a typing signal, and emits a typing signal back, with username as its data
 socket.on('typing', () => {
   socket.broadcast.emit('typing', {
     username: socket.username});
 });

//listens for a stop typing signale, emits a stop typing signal back with username
 socket.on('stop typing', () => {
   socket.broadcast.emit('stop typing', {
     username: socket.username});
 });

//on disconnection signal, if the user had been added, decriment numUsers .
 socket.on('disconnect', () => {
   if (addedUser) {
     --numUsers;
     socket.broadcast.emit('user left', {//send out user left signal with name, # of users
       username: socket.username,
       numUsers: numUsers});

   }
 });
});
