var app = require('connect')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var serveStatic = require('serve-static');

app.use(serveStatic(__dirname, {
    index: 'puzzle.html'
}));

server.listen(8080);

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
});

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
    var points = [];
    var known = {};
    userIds.forEach(function (id) {
        known[id] = [];
    });

    var RADIUS = 100;
    var COUNT = 7;

    for (var i = 0; i < COUNT; i++) {
        var theta = Math.PI * i / COUNT;
        var point = [
            RADIUS * Math.sin(theta),
            RADIUS * Math.random() - RADIUS / 2,
            RADIUS * Math.cos(theta)
        ];
        points.push(point);
        if (i <= Math.floor(COUNT / 2)) {
            known[userIds[0]].push(point);
        }
        if (i >= Math.floor(COUNT / 2)) {
            known[userIds[1]].push(point);
        }
    }

    return {
        id: gameId,
        points: points,
        known: known,
        state: STATE_PLAYING
    };
}
