var ALLOW_TYPING = true;

function startDictation() {
    $('#audio').prop('disabled', true);
    $('#audio').html('Speak now...');
    var recognition = new webkitSpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.lang = LANG;
    recognition.start();

    recognition.onresult = function(e) {
        $('#audio').prop('disabled', false);
        $('#audio').html('Speak');
        transcript = e.results[0][0].transcript;
        recognition.stop();
        add_command('talk ' + transcript);
        call_service(transcript);
    };

    recognition.onerror = function(e) {
        $('#audio').prop('disabled', false);
        $('#audio').html('Speak');
        recognition.stop();
        add_error('Audio failed: ' + e.error);
    }                
}

function call_service(text) {
    call_raw(JSON.stringify({
        "name": "test",
        "args": {
            "data_name": DATA_NANE,
            "text": text
        }
    }));
}

function call_raw(text) {
    ALLOW_TYPING = false;
    $.post(SERVER_URL, text, function(res) {
        ALLOW_TYPING = true;
        if (res.status == 1) {
            add_error(res.msg);
        } else {
            add_response(res.msg);
        }
    }).fail(function(xhr, status, err) {
        ALLOW_TYPING = true;
        if (xhr.readyState == 0) {
            add_error('Cannot connect to server');
        } else {
            add_error('Error from server: ' + err);
        }
    });
}

function add_command(text) {
    $('#response').append('<li class="command">' + text + '</li>');
}

function add_response(text, skip_next_command) {
    $('#response').append('<li class="resp">' + text + '</li>');
    if (!skip_next_command) {
        add_command('');
    }
    $('#response').scrollTop($('#response')[0].scrollHeight);
}

function add_error(err) {
    $('#response').append('<li class="error resp">' + err + '</li>');
    add_command('');
}

function run_command(text) {
    commands = text.split(' ');
    command = commands[0];
    if (command == '') {
        return;
    }
    if (bot_commands[command] == undefined) {
        add_error(command + ': command not found. Type help for available commands.')
        return;
    }
    commands.splice(0, 1);
    try {
        bot_commands[command](commands.join(' '));
    } catch(ex) {
        add_error('Uncaught Exception: ' + ex);
    }
}

command_helps = {
    clear: 'Clear the console interface',
    talk: 'Send a text to the bot server',
    train: 'Train the bot server',
    audio: 'Start dictation',
    raw: 'Send a raw command to the bot server',
    servinfo: 'Get server information',
    help: 'Print help',
    man: 'Alias for help'
}

bot_commands = {

    clear: function() {
        $('#response').text('');
        add_command('');
    },

    talk: function(text) {
        call_service(text);
    },

    raw: function(text) {
        call_raw(text);
    },

    man: function(text) {
        this.help(text);
    },

    help: function(text) {
        if (text != undefined && text != '') {
            if (command_helps[text] == undefined) {
                add_error('No help found for command: ' + text);
                return;
            }
            add_response('<b>' + text + '</b>: ' + command_helps[text]);
            return;
        }
        for(var command in command_helps) {
            add_response('<b>' + command + '</b>: ' + command_helps[command], true);
        }
        add_command('');
    },

    audio: function(text) {
        startDictation();
    },

    train: function(text) {
        call_raw(JSON.stringify({
            "name": "train",
            "args": {
                "data_name": DATA_NANE
            }
        }));
    },

    servinfo: function(text) {
        add_response('Server configured at: <a target="_blank" href="' + SERVER_URL + '">'+SERVER_URL+'</a>');
    }
}

document.addEventListener('keydown', function(e) {
    if (!ALLOW_TYPING)
        return;
    element = $('#response li:last');
    if (e.keyCode == 13) {
        if (element.length == 0 || !element.hasClass('command'))
            return;
        text = element.text();
        run_command(text);
        return;
    }
    if (e.keyCode == 8) {
        if (element.length == 0 || !element.hasClass('command'))
            return;
        text = element.text();
        element.text(text.substr(0, text.length - 1))
        return;
    }
    if ((e.keyCode != 32 && e.keyCode <= 40) || e.keyCode == 91)
        return;
    if (e.keyCode >= 112 && e.keyCode <= 123)
        return;
    if (e.ctrlKey || e.altKey || e.metaKey)
        return;
    if (element.length == 0 || !element.hasClass('command')) {
        add_command("");
        element = $('#response li:last');
    }
    element.append(e.key);
});