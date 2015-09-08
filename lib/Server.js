var WebSocketServer = require('ws').Server;

// cards
var THIEF = 'thief';
var CHEATER = 'cheater';
var WIDOW = 'widow';
var PEASANT1 = 'peasant';
var PEASANT2 = 'peasant';
var BEGGAR = 'beggar';
var INQUISITOR = 'inquisitor';
var SPY = 'spy';
var JUDGE = 'judge';
var KING = 'king';
var FOOL = 'fool';
var BISHOP = 'bishop';
var QUEEN = 'queen';
var WITCH = 'witch';

// states
var BEFORE_GAME = "before-game";
var IN_GAME = "in-game";

var initialCards = [ JUDGE, KING, QUEEN, CHEATER, BISHOP, WITCH ];

var playerIdentifier = 0;
var Player = function(ws, card) {
	this.id = ++playerIdentifier;
	this.ws = ws;
	this.gold = 6;
	this.card = card;
	this.name = 'Player #'+this.id;
}

var Table = function() {
	this.state = BEFORE_GAME;
	this.players = [];

	var currentTable = this;

	this.tryAddPlayer = function(ws) {
		// we are playing kick him now
		if (currentTable.state !== BEFORE_GAME) {
			ws.close(1000, 'Table is full');
			return;
		}

		// initialize the player
		var newPlayer = new Player(ws);

		// when a player leave, stop the game
		ws.on('close', function() {
			currentTable.handlePlayerLeft(newPlayer);
		});

		ws.on('message', function(msg) {
			currentTable.handleMessage(newPlayer, msg);
		});

		// send new player data to everybody
		currentTable.broadcast('new-player', { id: newPlayer.id }, newPlayer);
		currentTable.sendTo(newPlayer, 'welcome', { 
			id: newPlayer.id,
			competitors: currentTable.players.map(function(player) { return player.id })
		});

		// add player to the table effectively
		currentTable.players.push(newPlayer);

		// initialization was done, shall we start the game ?
		if(currentTable.players.length === initialCards.length) {
			currentTable.startGame();
		}

		console.log('New player (#%s) entered the table...', newPlayer.id);
	};

	this.handleMessage = function(fromPlayer, msg) {
		console.log('Player sent message: %s', msg);
	};

	this.startGame = function() {
		currentTable.state = IN_GAME;
		currentTable.broadcast('start-game', {});
	};

	this.handlePlayerLeft = function(player) {
		var index = currentTable.players.indexOf(player);
		if (index > -1) {
			currentTable.players.splice(index, 1);

			currentTable.state = BEFORE_GAME;
			var data = { 
				reason: player.name + ' left the table',
				id: player.id
			};
			currentTable.broadcast('stop-game', data);

			console.log('Game was stopped: %j', data);
		}
	};

	this.sendTo = function(player, action, data) {
		var json = JSON.stringify({
			'action': action,
			'data': data
		});
		player.ws.send(json);
	}

	this.broadcast = function(action, data, exclude) {
		var json = JSON.stringify({ 
			'action': action, 
			'data': data
		});

		currentTable.players.forEach(function(player) { 
			if(player === exclude) {
				return;
			}

			player.ws.send(json);
		});
	};
}

function start() {
	console.log('Server starting...');

	var table = new Table();

	var wss = new WebSocketServer({ port: 8080 });

	wss.on('connection', function(ws) {
		table.tryAddPlayer(ws);
	});
}

module.exports = {
	start: start
};