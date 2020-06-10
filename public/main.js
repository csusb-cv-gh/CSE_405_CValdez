$(function() {
  var FADE_TIME = 150;//how long it takes to go from transparent to solid
  var TYPING_TIMER_LENGTH = 400;//how long the type messege stay up before fading away
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];//different colors that can be used for usename display

  //grabs the data from the HTML code so we can use as vars here more easily.
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // vars for the first page where they just type in usename
  var username;
  //var user_num;//to spot dupes later
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var bad_word = false;//for out profanity filter test
  var $currentInput = $usernameInput.focus();

//creating our socket for this client
  var socket = io();

  const addParticipantsMessage = (data) => {
    var message = ' Nice! ';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }

    log(message);//print to page in the "log" in the middle
  }

  // set name to w/e they entered in that input thing from HTML code
  const setUsername = () => {
    username = cleanInput($usernameInput.val());
    if (username) {//upon user entering a usename.
      $loginPage.fadeOut();//fade out that first black page
      $chatPage.show();//bring up the chat page.
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();
      socket.emit('add user', username);//send the username back to server so we can work with it
    }
  }

  const set_user_num = (number) => {
    user_num = number;
  }

//code for sending a messege to the page
  const sendMessage = () => {//snd messege own own screen, emmit to other server
    var message = $inputMessage.val();
    var timeStamp_min = (new Date()).getHours();
    var timeStamp_sec = (new Date()).getMinutes();

    profanitty_filter(message);//check if message is ok first.

    message = message + " [sent at " + timeStamp_min + timeStamp_sec + "]";
    // if they actually entered a messege and we are connected------**
    if (message && connected && bad_word == false) {
      $inputMessage.val('');
      addChatMessage({//send name + messege to page
        username: username,//distincguish users with same name
        message: message
      });
      //emit the new messege back to server, with the messege data
      socket.emit('new message', message);
    }
    else if (bad_word == true) {//if not ok messege, doesnt even send to server fist.
       $inputMessage.val('');
       addChatMessage({//send name + messege to page
            username: username,
            message: 'no bad workds.'
          });
        }
  }


    const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }
//profcanity filter concept, we can have a data structure full of names then check if within the messege.
  const profanitty_filter = (msg_check) => {
    if (msg_check == "dog")//just check for one thing. the string dog all on its own.
    {
      bad_word = true;
    }
    else bad_word = false;
  }

  //adding  a messege to the page
  const addChatMessage = (data, options) => {
    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

//the "is typing" part when a client is typing something in bar
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }
  const removeChatTyping = (data) => {//now this one removes the "is typing" when user stops typing
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

//add messege to page, called alot below.
  const addMessageElement = (el, options) => {
    var $el = $(el);

//if options not already set, following 3 statements will set them to defaults
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // now we can actually tell how messege is sent
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);//hide the messege via fade, takes fade_time Millisecs
    }
    if (options.prepend) {//simple if true pre, not then append.
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;//scroll to the most recent messge, aka the bottom
  }

  // make sure good input before we accept it
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

//firue out the typing time so we can do things when start/stop
  const updateTyping = () => {
    if (connected) {
      if (!typing) {//if we are typing something, emit typing to listener
        typing = true;
        socket.emit('typing');//emit typing to srvers, server emmits typing to all clients.
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {//stop the typing is typing thing if they stopped typing/time limit reached.
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {//if 400 or more ms have passed since typing and they were typing
          socket.emit('stop typing');//emit stop typing to server
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // sends the is typing messege to the page
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // pciks a random color for user to have
  const getUsernameColor = (username) => {
    // Compute hash code--
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;//* same usernames get same color
    }
    // figures out color using cash we made based on the lenght of name
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // STUFF  that happens when typing in chatbox

  $window.keydown(event => {//pressing akey
    /*
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }*///not sure what this does. doesnt seem to do anything on deskctop, maybe if on mobile/zoomed in?


    // When the client hits ENTER on their keyboard
    //upon pressing enter messege
    if (event.which === 13) {
      if (username) {//this means we're at the second page?
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();//if we are on the first page, we have to set the username first
      }
    }
  });

  $inputMessage.on('input', () => {//listends for input, if we get input, call update typing
    updateTyping();
  });

  // so you dont have to click in the chatbox when on that first page, anyhwere is fine
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // same as above p much
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // Socket stuff here, emmitters listeners.

  // listen for the login emitter, which is triggered by adduser emitter
  socket.on('login', (data) => {
    connected = true;
    //print welcome msg
    var message = "Fun Chat App ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);

  });

  // listen for new messages, call add chat message if we get, and ofc. sent the messege.
  socket.on('new message', (data) => {
      addChatMessage(data);
  });

  // wenever we get user joined event, sends that data + assicoiated username +joined
  socket.on('user joined', (data) => {
    log(data.username + ' joined the chat');
    addParticipantsMessage(data);

  });

  // same as above pretty much just for a user left event instead, send data to server
  socket.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // whenever we get a typing signal, print typing mesege on page
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });
//sends the dicon messege and prints diconnected to page
  socket.on('disconnect', () => {
    log('you have been disconnected');
  });


});
