
// server side

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var note;
var people = {};
var colour = {};
var history = [];

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.use("/public", express.static(__dirname + "/public"));

// Start server
http.listen(3000, function(){
  console.log('listening on *:3000');
  console.log('\nSERVER START TIME: ' + new Date());
});

// Upon receiving connection
io.on('connection', function(socket){

  // ---ON CONNECT---
  socket.on('start', function(name) {

    // Checks if client passes a name cookie, else give random name
    if (name == '') {
      people[socket.id] = generateRandomUsername();

      // Tell everyone you've arrived
      note = {msgText: people[socket.id] + ' has joined the chat',
            msgTime: timeStamp(new Date()), msgAuthor: '_SERVER_'}; 
    } else {

      // If the cookie name is already taken or bad, generate new name
      if (isUniqueNick(name) && (!badMessage(name))) {
        people[socket.id] = name; 
      } else {
        people[socket.id] = generateRandomUsername();
      }
      
      // Tell everyone you arrived
      note = {msgText: people[socket.id] + ' has reconnected',
            msgTime: timeStamp(new Date()), msgAuthor: '_SERVER_'};
    }
    
    // Update name, colours, people, and chat log
    socket.emit('updateName', people[socket.id]);
    io.emit('updateColour', colour, people);
    io.emit('updatePeople', people);
    socket.emit('updateHistory', history);

    // Emits the message and pushes to chat log
    io.emit('message', note);
    pushMessage(note);
  });
  
  // ---ON DISCONNECT---
  socket.on('disconnect', function(){

    // Tell everyone someone left
    note = {msgText: people[socket.id] + ' has disconnected',
            msgTime: timeStamp(new Date()), msgAuthor: '_SERVER_'};

    // Emits the message and pushes to chat log
    io.emit('message', note);
    pushMessage(note);

    // Deletes the user and updates people
    delete people[socket.id];
    io.emit('updatePeople', people, colour);
  });

  // ---ON MESSAGE SENT---
  socket.on('message', function(msg){

    // Checks if input is a script
    if (!badMessage(msg)) {
      // Creates message object
      note = {msgText: msg, msgTime: timeStamp(new Date()), msgAuthor: people[socket.id]};

      // Emits the message to clients and pushes to log
      io.emit('message', note);
      pushMessage(note);
    } else {
      socket.emit('message', {msgText: '[ERROR] That\'s rude',
                              msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'});
    }
  });

  // ---ON NAME CHANGE---
  socket.on('nameChange', function(newName) {

    // Checks if name is unique
    if (isUniqueNick(newName) && (!badMessage(newName))) {

      // Tells everyone name change happened
      note = {msgText: people[socket.id] + ' has changed their name to ' + newName,
              msgTime: timeStamp(new Date()), msgAuthor: '_SERVER_'};

      io.emit('message', note);
      socket.emit('updateName', newName);
      pushMessage(note);

      // Change the names in messages of the current user to the new name
      for (let page of history) {
        if (page['msgAuthor'] == people[socket.id]) {
          page['msgAuthor'] = newName;
        }
      }

      // Updates name, colour, peoplelist, and chat log
      people[socket.id] = newName;
      io.emit('updateColour', colour, people);
      io.emit('updatePeople', people);
      io.emit('updateHistory', history);

    } else {
      if (badMessage(newName)) {
        socket.emit('message', {msgText: '[ERROR] You think you\'re sneaky?',
                              msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'});
      } else if (newName == '_SERVER_' || newName == '_ERROR_') {
        socket.emit('message', {msgText: '[ERROR] Name cannot be "' + newName + '"',
                                msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'});
      } else {
        socket.emit('message', {msgText: '[ERROR] Invalid name "' + newName + '"',
                                msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'});
      }
    }
  });

  // ---ON COLOUR CHANGE---
  socket.on('colourChange', function(newColour) {

    // Checks if input is script
    if (!badMessage(newColour)) {
      colour[socket.id] = ((newColour[0] == '#') ? newColour :  ('#' + newColour));

      io.emit('updateColour', colour, people);
      io.emit('updatePeople', people);
      io.emit('updateHistory', history);
    } else {
      socket.emit('message', {msgText: '[ERROR] Stop it',
                              msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'});
    }
  });

});

// ***AUXILIARY FUNCTIONS***

// checks if username is unique
function isUniqueNick(nick) {
  let unique = true;

  // Nickname cannot be server name: _SERVER_
  if (nick == '_SERVER_' || nick == '_ERROR_') {
    unique = false;
  } else {
    // Check other names in list
    Object.keys(people).forEach(function(id) {
      if (people[id] == nick) {
        unique = false;
      }
    });
  }

  // Passes checks
  return unique;
}

// generates a default username for a new user (unique up to 900 names)
function generateRandomUsername() {

  let random = Math.floor(100 + (Math.random() * 899));
  let username = 'User' + random;

  while(!isUniqueNick(username)) {
    random = Math.floor(100 + (Math.random() * 899));
    username = 'User' + random;
  }

  return username;
}

// returns time stamp
function timeStamp(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let mn = hours > 12 ? 'PM ' : 'AM ';

  hours %= 12;
  hours = hours == 0 ? 12 : hours;
  minutes = minutes >= 10 ? minutes : '0' + minutes;

  return hours + ':' + minutes + ' ' + mn;
}

// Checks length of history so it doesn't get out of hand
function pushMessage(message) {
  if (history.length > 204) {
    history.shift();
  }

  history.push(message);
}

// Checks if the input is a script (returns true for script)
function badMessage(input) {
  let scripts = new RegExp('<script[\\s\\S]*?>[\\s\\S]*?<\\/script>');

  if (input.match(scripts)) {
    return true;
  } else {
    return false;
  }
}