var app = require('connect')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var serveStatic = require('serve-static');

app.use(serveStatic(__dirname, {
    index: 'puzzle.html'
}));

server.listen(3000);

var sockets = new Map();
var users = new Map();
var games = new Map();
var nextGameId = 1;

var STATE_PLAYING = 'playing';
var STATE_WON = 'won';
var STATE_ABANDONED = 'abandoned';

io.on('connection', function (socket) {
    sockets.set(socket.id, socket);
    users.set(socket.id, {
        id: socket.id,
        inGame: null
    });
    notifyServerState();

    socket.on('chat', function (msg) {
        io.emit('chat', msg);
    });

    socket.on('disconnect', function () {
        leaveGame(false);
        sockets.delete(socket.id);
        users.delete(socket.id);
        notifyServerState();
    });

    socket.on('command', function (command) {
        if (command.command === 'start') {
            startGame();
        }
        else if (command.command === 'leave') {
            leaveGame();
        }
        else if (command.command === 'guess') {
            makeGuess(command.path);
        }
    });

    function startGame() {
        var sender = users.get(socket.id);
        if (!sender || sender.inGame) {
            return;
        }
        var availablePlayers = [...users.values()].filter(function (user) {
            return user.id !== sender.id && !user.inGame;
        });
        if (availablePlayers.length) {
            var game = createGame([sender.id, availablePlayers[0].id]);
            games.set(game.id, game);
            sender.inGame = availablePlayers[0].inGame = game.id;
            notifyServerState();
        }
    }

    function leaveGame(notify) {
        var user = users.get(socket.id);
        if (!user.inGame) {
            return null;
        }
        var game = games.get(user.inGame);
        if (game.state === STATE_PLAYING) {
            game.state = 'abandoned';
        }
        user.inGame = null;
        if (notify !== false) {
            notifyServerState();
        }
    }

    function makeGuess(path) {
        var user = users.get(socket.id);
        if (!user.inGame) {
            return null;
        }
        var game = games.get(user.inGame);
        var otherUserId = Object.keys(game.known).filter(function (userId) {
            return userId !== user.id;
        });
        if (checkPathsEqual(path, game.known[otherUserId])) {
            game.state = STATE_WON;
            game.known[user.id] = game.known[otherUserId] = stitchPaths(game.known);
            notifyServerState();
        }
        else {
            socket.emit('message', {
                type: 'incorrectGuess'
            });
        }
    }
});

function stitchPaths(known) {
    var userIds = Object.keys(known);
    if (known[userIds[0]][0] === known[userIds[1]][known[userIds[1]].length - 1]) {
        return known[userIds[1]].concat(known[userIds[0]].slice(1));
    }
    else {
        return known[userIds[0]].concat(known[userIds[1]].slice(1));
    }
}

function checkPathsEqual(path1, path2) {
    return (path1.length === path2.length) &&
    path1.every(function (el, idx) {
        return el === path2[idx];
    });
}

function notifyServerState() {
    var sharedState = getSharedState();
    users.forEach(function (user, id) {
        sockets.get(id).emit('serverState', {
            shared: sharedState,
            user: user,
            game: getUserGame(id)
        });
    });
}

function getUserGame(userId) {
    var user = users.get(userId);
    if (!user.inGame) {
        return {};
    }
    var game = games.get(user.inGame);
    var userGame = Object.assign({}, game);
    userGame.known = game.known[userId];
    return userGame;
}

function getSharedState() {
    return {
        connectedUsers: [...users.values()]
    };
}

function createGame(userIds) {
    var gameId = nextGameId++;

    var points = [
        [ -2.541088342666626, -5.156558513641357, 8.448569297790527 ],
        [ 1.5879571437835693, 0, 2.8919732570648193 ],
        [ -0.46678072214126587, 0, 11.104351997375488 ],
        [ -4.280584812164307, 5.69348669052124, 5.833005428314209 ],
        [ 0, 5.793156147003174, -19.617412567138672 ],
        [ 0, -1.4556063413619995, -9.070512771606445 ],
        [ -2.4474260807037354, 10.168652534484863, -3.876271963119507 ],
        [ 6.863487720489502, -6.391308784484863, -2.0551981925964355 ],
        [ 2.720376968383789, 14.794974327087402, -10.951457977294922 ]
    ];

    var known = {};
    known[userIds[0]] = [1, 0, 2, 3, 1, 7];
    known[userIds[1]] = [7, 5, 6, 8, 4];

    return {
        id: gameId,
        points: points,
        known: known,
        state: STATE_PLAYING
    };
}
