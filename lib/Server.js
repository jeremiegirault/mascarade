var WebSocketServer = require('ws').Server;

/******************************************************************************/
// Constants
/******************************************************************************/

// cards
const ROLE_UNKNOWN		= 'role:unknown'
const ROLE_THIEF 			= 'role:thief';
const ROLE_CHEATER 		= 'role:cheater';
const ROLE_WIDOW 			= 'role:widow';
const ROLE_PEASANT1 	= 'role:peasant';
const ROLE_PEASANT2 	= 'role:peasant';
const ROLE_BEGGAR 		= 'role:beggar';
const ROLE_INQUISITOR = 'role:inquisitor';
const ROLE_SPY 				= 'role:spy';
const ROLE_JUDGE 			= 'role:judge';
const ROLE_KING 			= 'role:king';
const ROLE_FOOL 			= 'role:fool';
const ROLE_BISHOP 		= 'role:bishop';
const ROLE_QUEEN 			= 'role:queen';
const ROLE_WITCH 			= 'role:witch';

// actions
// normal turn actions
const ACTION_PEEK = 'action:peek';
const ACTION_SWITCH = 'action:switch';
const ACTION_ANNOUNCE = 'action:announce';
// announce turn sub-actions
const ACTION_ANNOUNCE_PASS = 'action:announce-pass';
const ACTION_ANNOUNCE_SAME = 'action:announce-same';

const MAX_RESPONSE_TIME_MS = 100;

// states
const STATE_WAITING_PLAYERS = 'state:waiting-players';
const STATE_PLAYING = 'state:playing';
const STATE_ANNOUNCING = 'state:announcing';

const AVAILABLE_ROLES = [ ROLE_JUDGE, ROLE_KING, ROLE_QUEEN, ROLE_CHEATER, ROLE_BISHOP, ROLE_WITCH ];

var UniquePlayerIdentifier = 0;

var Player = function(ws) {
	this.id = ++UniquePlayerIdentifier;
	this.role = ROLE_UNKNOWN;
	this.ws = ws;
	this.gold = 6;
	this.name = 'Player #'+this.id;
}

var Table = function() {

	/******************************************************************************/
	// Members
	/******************************************************************************/
	this.state = STATE_WAITING_PLAYERS;
	this.players = [];

	this.currentPlayer = 0; // current player playing
	this.announcingTurnCurrentPlayer = 0; // if current player is announcing, this is the current player asked

	// handle for the timeout before player answer
	// if player does not respond in time, his turn is skipped
	this.timeoutHandle = 0;

	/******************************************************************************/
	// Methods
	/******************************************************************************/

	var currentTable = this;

	//
	// Called from the websocket when receiving a new connection
	//
	// Creates a player from the new connection
	//
	this.tryAddPlayer = function(ws) {
		// we are playing kick him now
		if (currentTable.state !== STATE_WAITING_PLAYERS) {
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
		currentTable.broadcast('new-player', { id: newPlayer.id }, newPlayer.id);
		currentTable.sendTo(newPlayer, 'welcome', { 
			id: newPlayer.id,
			competitors: currentTable.players.map(function(player) { return player.id })
		});

		// add player to the table effectively
		currentTable.players.push(newPlayer);

		console.log('New player (#%s) entered the table...', newPlayer.id);

		// initialization was done, shall we start the game ?
		if(currentTable.players.length === AVAILABLE_ROLES.length) {
			currentTable.startGame();
		}
	};

	//
	// Handles client message
	//
	this.handleMessage = function(fromPlayer, msg) {
		console.log('Player sent message: %s', msg);

		try {
			var json = JSON.parse(msg);
			var action = json.action || '';
			var params = json.params || {};

			currentTable.handlePlayerAction(fromPlayer, action, params);

		} catch(err) {
			currentTable.sendTo(fromPlayer, 'error', { 'type': 'bad-protocol' });
			console.log('Error while parsing player message: ', err);
		}
	};

	//
	// Initializes table when all players are connected
	//
	this.startGame = function() {
		currentTable.state = STATE_PLAYING;
		
		// assign roles
		var availableRoles = AVAILABLE_ROLES.slice();// clone available roles
		for(var i = 0; i < currentTable.players.length; ++i) {
			// peek and remove a random item in the array
			var randomIndex = Math.floor(Math.random() * availableRoles.length);
			var item = availableRoles[randomIndex];
			availableRoles.splice(randomIndex, 1);

			// assign the player the role
			currentTable.players[i].role = item;
		}


		// broadcast table state to everybody on starting game
		currentTable.broadcast('start-game', {
			'initial-state': currentTable.players.map(function(player) { 
				return { 
					id: player.id, 
					name: player.name,
					role: player.role
				}
			})
		});

		// pick a random first player
		currentTable.currentPlayer = Math.floor(Math.random()*currentTable.players.length);

		// play his turn
		currentTable.play();
	};

	//
	// Makes the current player play !
	//
	this.play = function() {
		// pick the current player
		var player = currentTable.players[currentTable.currentPlayer];
		// tell everybody that this player started his turn
		currentTable.broadcast('player-playing', { id: player.id }, player.id);
		// send the signal to play to this player
		currentTable.sendTo(player, 'play');

		// if the player did not respond in given timeout, skip his turn
		currentTable.timeoutHandle = setTimeout(function() {
			console.log('Player ', player.name, ' has took too much time to respond, skipping his turn with default action ...');

			// handle response timeout: send default action for player
			if(currentTable.state === STATE_PLAYING) {
				console.log('... Peeking at his own card');

				currentTable.sendTo(player, 'timeout', { 'default-action': ACTION_PEEK });
				currentTable.handlePlayerAction(player, ACTION_PEEK, {});

			} else if(currentTable.state === STATE_ANNOUNCING) {
				console.log('... Pass');

				currentTable.sendTo(player, 'timeout', { 'default-action': ACTION_PASS });
				currentTable.handlePlayerAction(player, ACTION_PASS, {});
			}
		}, MAX_RESPONSE_TIME_MS);
	};

	//
	// Handles a player action, sent trough the ws
	//
	this.handlePlayerAction = function(player, action, params) {

		var isAnnouncing = (currentTable.state === STATE_ANNOUNCING);
		var isPlaying = (currentTable.state === STATE_PLAYING);
		var isGameStarted = isPlaying || isAnnouncing;

		if ( !isGameStarted ) {
			currentTable.sendTo(player, 'error', { 'type': 'game-not-started' });
			return;
		}

		var isFromCurrentPlayer = (isPlaying && currentTable.players[currentTable.currentPlayer] === player);
		var isFromAnnounceTurnCurrentPlayer = (isAnnouncing && currentTable.players[currentTable.announcingTurnCurrentPlayer] === player);

		if (!isFromCurrentPlayer && !isFromAnnounceTurnCurrentPlayer) {
			currentTable.sendTo(player, 'error', { 'type': 'not-your-turn' });
			return;
		}

		// ensure action can be done

		var moveIsValid = false;

		if ( isPlaying ) {
			switch(action) {
				case ACTION_PEEK:
					moveIsValid = currentTable.handlePlayerPeek(player, params);
					break;
				case ACTION_SWITCH: 
					moveIsValid = currentTable.handlePlayerSwitch(player, params);
					break;
				case ACTION_ANNOUNCE: 
					moveIsValid = currentTable.handlePlayerAnnounce(player, params);
					break;
				default: break;
			}
		} else if ( isAnnouncing ) {
			switch(action) {
				case ACTION_ANNOUNCE_PASS: 
					moveIsValid = currentTable.handlePlayerAnnouncePass(player, params);
					break;
				case ACTION_ANNOUNCE_SAME: 
					moveIsValid = currentTable.handlePlayerAnnounceSame(player, params);
					break;

				default: break;
			}
		}

		if ( moveIsValid ) {
			// finally clear the timeout and make next player play
			if(currentTable.timeoutHandle) {
				clearTimeout(currentTable.timeoutHandle);
				currentTable.timeoutHandle = 0;
			}
			
			currentTable.nextPlayer();
		}
	};

	this.handlePlayerPeek = function(player, params) {
		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_PEEK,
			'role': player.role
		});

		currentTable.broadcast('action:competitor', {
			'id': player.id,
			'type': ACTION_PEEK
		}, player);

		return true;
	};

	this.handlePlayerSwitch = function(player, params) {
		var withPlayer = params['with'];
		var swapping = params['swapping'];
		if ( withPlayer !== parseInt(withPlayer) ) {
			return false;
		}
		if ( swapping !== true && swapping !== false ) {
			return false;
		}

		var exchangedPlayer = currentTable.players.find(function(player) {
			return player.id === withPlayer;
		});

		if (!exchangedPlayer) {
			return false;
		}

		if ( swapping ) {
			var role = player.role;
			player.role = exchangedPlayer.role;
			exchangedPlayer.role = role;
		}
		// send messages

		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_SWITCH,
			'with': exchangedPlayer.id
		});

		currentTable.broadcast('action:competitor', {
			'type': ACTION_SWITCH,
			'id': player.id,
			'with': exchangedPlayer.id
		}, player);

		return true;
	};

	this.handlePlayerAnnounce = function(player, params) {

	};

	this.handlePlayerAnnouncePass = function(player, params) {

	};

	this.handlePlayerAnnounceSame = function(player, params) {

	};

	//
	// Moves table state (currentPlayer) to next player
	//
	this.nextPlayer = function() {

		if (currentTable.state === STATE_PLAYING) {
			// move to next player
			currentTable.currentPlayer = (currentTable.currentPlayer + 1) % currentTable.players.length;

			currentTable.play();

		} else if (currentTable.state === STATE_ANNOUNCING) {
			// announce turn: move to next player
			currentTable.announcingTurnCurrentPlayer = (currentTable.announcingTurnCurrentPlayer + 1) % currentTable.players.length;

			// if we got back to current player, then it's end of announcing turn, let's resolve it
			if(currentTable.announcingTurnCurrentPlayer === currentTable.currentPlayer) {
				currentTable.resolveAnnounceTurn();
			}
		}
	};

	this.resolveAnnounceTurn = function() {
		currentTable.play();
	};

	//
	// Handles a player disconnection
	//
	this.handlePlayerLeft = function(player) {
		var index = currentTable.players.indexOf(player);
		if (index > -1) {
			currentTable.players.splice(index, 1);

			currentTable.state = STATE_WAITING_PLAYERS;
			var data = { 
				reason: player.name + ' left the table',
				id: player.id
			};
			currentTable.broadcast('stop-game', data);

			console.log('Game was stopped: %j', data);
		}
	};

	/******************************************************************************/
	// Helpers
	/******************************************************************************/

	//
	// Sends a message to a given player
	//
	this.sendTo = function(player, action, data) {
		var json = JSON.stringify({
			'action': action,
			'data': data
		});
		player.ws.send(json);
	};

	//
	// Broadcast messages to all players excluding a given id if provided
	//
	this.broadcast = function(action, data, excludedId) {
		var json = JSON.stringify({ 
			'action': action, 
			'data': data
		});

		currentTable.players.forEach(function(player) { 
			if(player.id === excludedId) {
				return;
			}

			player.ws.send(json);
		});
	};
}

/******************************************************************************/
// Module
/******************************************************************************/

//
// Main
//
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