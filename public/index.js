
// client side

$(function() {
  var socket = io();
  var colours = {};
  var colourPairs = {};
  var myName = '';

  // SUBMIT
  $('form').submit(function(){

  	// Trim whitespace from input
  	let input = $('#m').val().trim();

  	// Check if input is a command
  	if (input.charAt(0) == '/') {

  		// Split input for parsing
  		let params = input.split(" ");

  		// 
  		if (params[0] == '/nickcolor' || params[0] == '/nick' || params[0] == '/nickcolour') {

  			// Check if just a name change
  			if (params[0] == '/nick' && params.length == 2) {
  				socket.emit('nameChange', params[1]);
  			}

  			// Else If colour change, then also check if valid colour
  			else if ((params[0] == '/nickcolor' || params[0] == '/nickcolour') && params.length == 2 && isHexColour(params[1])) {
  				socket.emit('colourChange', params[1]);
  			}

  			// If parameters are messed, print invalid parameters
  			else {
          console.log('bad parameters');
  				$('#messages').append(parseMsg({msgText: '[ERROR] Invalid parameters: ' + input,
                                 msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'}));
          $('#papi').animate({scrollTop:$('#papi').prop('scrollHeight')});
  			} 

  		}

  		// If command isn't in /nickcolor or /nickcolour or /nick, print invalid command
  		else {
        console.log('bad command');
  			$('#messages').append(parseMsg({msgText: '[ERROR] Invalid command: ' + input,
                               msgTime: timeStamp(new Date()), msgAuthor: '_ERROR_'}));
        $('#papi').animate({scrollTop:$('#papi').prop('scrollHeight')});
  		}

  	} 

  	// Else if command is just whitespace, ignore
  	else if (input == "") {
  		// do nothing
  	}

  	// If not a command or space, then input is a message, simply forward	
  	else {
  		socket.emit('message', $('#m').val());
  	}

  	// Always clear input box and return false
    $('#m').val('');
    return false;

  });

  // ON CONNECT
  socket.on('connect', function() {

    // checks if a cookie with a name exists
    if (getCookie('name') == null) {
      socket.emit('start', '');
    } else {
      socket.emit('start', getCookie('name'));
    }
  });

  // ON MESSAGE
  socket.on('message', function(msg){

  	// max size of messages at 204
  	if ($('#messages li').size() > 204) {
  		$('#messages li').first().remove();
  	}

  	// create message item and append
    $('#messages').append(parseMsg(msg));
    $('#papi').animate({scrollTop:$('#papi').prop('scrollHeight')});
  });

  // ON UPDATEPEOPLE
  socket.on('updatePeople', function(people) {
  	// empty the list of people
  	$('#people').empty();

  	// repopulate with colours
  	Object.keys(people).forEach(function(id) {
      let li = $('<li class="list-group-item peopleitem">');

      // Make messages colour of user
      if (colours[id] !== undefined) {
       li.css('border', '2px solid ' + colours[id]);
      }

      // If user has a colour, make title border that colour
      if (people[id] == myName && colourPairs[myName] !== undefined) {
        $('.jumbotron').css('border', '2px solid ' + colourPairs[myName]);
      }

      // Append message to message box
      $('#people').append(li.text(((people[id] == myName) ? (people[id] + ' (You)') : people[id])));
    });

    // update number of current users
    $('#count').html(Object.keys(people).length);

    // Includes number of people in online list
    if ($(window).width() <= 576) {
      $('#userlist').text('Online (' + Object.keys(people).length + ')');
    } else {
      $('#userlist').text('Online');
    }

  });

  // ON UPDATEHISTORY
  socket.on('updateHistory', function(history) {

    // empty the message list
    $('#messages').empty();

  	// for every item in history, make a message item.
  	for (let page of history) {
  		$('#messages').append(parseMsg(page));
  	}
  });

  // ON UPDATENAME
  socket.on('updateName', function(name) {

    // Set local name of user
    myName = name;

    // Set jumbotron name
    $('#user').html(name);

    // Set name cookie
    setCookie('name', name);
  });

  // ON UPDATECOLOURS
  socket.on('updateColour', function(newColours, people) {
    colours = newColours;

    // Create pairing of names:colours
    Object.keys(people).forEach(function(id) {
      if (colours[id] !== undefined) {
        colourPairs[people[id]] = colours[id];
      }
    });
  });

  // ***JQUERY AUXILIARY FUNCTIONS***

  // Returns a message as a list item
  function parseMsg(msg) {
    let chatItem;

    // Check if message is a server message
    if (msg['msgAuthor'] == '_SERVER_' || msg['msgAuthor'] == '_ERROR_') {

      // Sets classes
      if (msg['msgAuthor'] == '_SERVER_') {
        chatItem = $('<div class="notification">');
      } else {
        chatItem = $('<div class="error">');
      }
      
      // appends items to final message
      chatItem.append($('<span class="msgTime">').text(msg['msgTime']));
      chatItem.append($('<span>').text(msg['msgText']));
    }

    // Else, message is a user message
    else {
      chatItem = $('<div class="chatmessage">');
      let author, infoItem = $('<div>');

      // Makes users own messages authored 'You'
      if (msg['msgAuthor'] == myName) {
        chatItem.css('float', 'right');
        author  = $('<span class="msgAuthor">').text('You');
      } else {
         author  = $('<span class="msgAuthor">').text(msg['msgAuthor']);
      }

      // appends items to final message
      infoItem.append(author);
      infoItem.append($('<span class="msgTime">').text(msg['msgTime']));

      chatItem.append(infoItem);
      chatItem.append($('<span class="msgText">').text(msg['msgText']));
    }

    // Checks if user has colour and colours the border of the message
    if (colourPairs[msg['msgAuthor']] !== undefined) {
      chatItem.css('border', '2px solid ' + colourPairs[msg['msgAuthor']]);
    }

    // returns te final message
    return $('<li class="list-group-item">').append(chatItem);
  }

  // Returns a socketID from a given username
  function getIDbyName(name) {
    return Object.keys(peoples).find(key => peoples[key] === name);
  }

});

// ***AUXILIARY FUNCTIONS***

// Returns true if colour is a valid hex colour
function isHexColour(colour) {

	// Check length equal to 6
	if ((colour.length == 6) || (colour.length == 7 && colour[0] == '#')) {
    if (colour[0] == '#') {
      colour = colour.substring(1);
    }

    for (let i=0; i<6; i++) {

      // Check if each character is in valid hex characters
      if ('1234567890aAbBcCdDeEfF'.indexOf(colour.charAt(i)) < 0) {
        return false;
      }
    }

    return true;

	} else {
		return false;
	}
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

// Creates or sets value of cookie
function setCookie(name, value) {
    document.cookie = name + "=" + value;
}

// Returns value of cookie
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}