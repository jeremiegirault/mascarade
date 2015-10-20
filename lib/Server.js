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

const MIN_SWITCH_TURNS = -1;

const AVAILABLE_ROLES = [ ROLE_JUDGE, ROLE_KING, ROLE_QUEEN, ROLE_CHEATER, ROLE_BISHOP, ROLE_WITCH ];

const ROLES_ACTIONS = (function() {
	var rolesActions = {};
	rolesActions[ROLE_UNKNOWN] = function() {
		console.log('apply role: %s', ROLE_UNKNOWN);
	};
	rolesActions[ROLE_THIEF] = function() {
		console.log('apply role: %s', ROLE_THIEF);
	};
	rolesActions[ROLE_WIDOW] = function() {
		console.log('apply role: %s', ROLE_WIDOW);
	};
	rolesActions[ROLE_PEASANT1] = function() {
		console.log('apply role: %s', ROLE_PEASANT1);
	};
	rolesActions[ROLE_PEASANT2] = rolesActions[ROLE_PEASANT1];

	rolesActions[ROLE_BEGGAR] = function() {
		console.log('apply role: %s', ROLE_BEGGAR);
	};
	rolesActions[ROLE_INQUISITOR] = function() { 
		console.log('apply role: %s', ROLE_INQUISITOR);
	};
	rolesActions[ROLE_SPY] = function() {
		console.log('apply role: %s', ROLE_SPY);
	};
	rolesActions[ROLE_JUDGE] = function() {
		console.log('apply role: %s', ROLE_JUDGE);
	};
	rolesActions[ROLE_KING] = function() {
		console.log('apply role: %s', ROLE_KING); 
	};
	rolesActions[ROLE_FOOL] = function() {
		console.log('apply role: %s', ROLE_FOOL); 
	};
	rolesActions[ROLE_BISHOP] = function() {
		console.log('apply role: %s', ROLE_BISHOP);
	};
	rolesActions[ROLE_QUEEN] = function() {
		console.log('apply role: %s', ROLE_QUEEN);
	};
	rolesActions[ROLE_WITCH] = function() {
		console.log('apply role: %s', ROLE_WITCH);
	};
	return rolesActions;
	}());

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
	this.tribunal = 0;

	this.announceTurn = null;
	//this.announcingTurnCurrentPlayer = 0; // if current player is announcing, this is the current player asked

	// handle for the timeout before player answer
	// if player does not respond in time, his turn is skipped
	this.timeoutHandle = 0;
	this.turn = 0;

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
		console.log('Player #%j sent message: %s', fromPlayer.id, msg);

		try {
			var json = JSON.parse(msg);
			var action = json.action || '';
			var params = json.data || {};

			currentTable.handlePlayerAction(fromPlayer, action, params);

		} catch(err) {
			currentTable.sendTo(fromPlayer, 'error', { 'type': 'bad-protocol' });
			console.log('Error while parsing player message: %s', err, err.stack);
		}

		
	};

	//
	// Initializes table when all players are connected
	//
	this.startGame = function() {
		currentTable.state = STATE_PLAYING;

		currentTable.turn = 0;
		currentTable.tribunal = 0;
		
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
					role: player.role,
					coins: player.gold
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
		var player = null;


		if (currentTable.state === STATE_ANNOUNCING) {
			player = currentTable.players[currentTable.announceTurn.announcingPlayer];
		} else {
			player = currentTable.players[currentTable.currentPlayer];
		}
		
		// tell everybody that this player started his turn
		currentTable.broadcast('player-playing', { id: player.id }, player.id);
		// send the signal to play to this player
		currentTable.sendTo(player, 'play');

		// if the player did not respond in given timeout, skip his turn
		currentTable.timeoutHandle = setTimeout(function() {
			console.log('Player ', player.name, ' has took too much time to respond, skipping his turn with default action ...');
			
			currentTable.timeoutHandle = 0;

			// handle response timeout: send default action for player
			if(currentTable.state === STATE_PLAYING) {
				console.log('... Peeking at his own card');

				currentTable.sendTo(player, 'timeout', { 'default-action': ACTION_PEEK });
				currentTable.handlePlayerAction(player, ACTION_PEEK, {});

			} else if(currentTable.state === STATE_ANNOUNCING) {
				console.log('... Pass');

				currentTable.sendTo(player, 'timeout', { 'default-action': ACTION_ANNOUNCE_PASS });
				currentTable.handlePlayerAction(player, ACTION_ANNOUNCE_PASS, {});
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

		var announceTurn = currentTable.announceTurn || {};
		var isFromAnnounceTurnCurrentPlayer = (isAnnouncing && currentTable.players[announceTurn.announcingPlayer] === player);

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
		} else if (!currentTable.timeoutHandle) {
			// timeout has happened, just skip player turn
			currentTable.nextPlayer();
		}


	};

	//
	// ACTIONS
	//

	// PEEK
	this.handlePlayerPeek = function(player, params) {

		if (currentTable.turn < MIN_SWITCH_TURNS) {
			currentTable.sendTo(player, 'error', { 'type': 'must-swap' });
			return false;
		}

		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_PEEK,
			'role': player.role
		});

		currentTable.broadcast('action:competitor', {
			'id': player.id,
			'type': ACTION_PEEK
		}, player.id);

		return true;
	};

	// SWITCH
	this.handlePlayerSwitch = function(player, params) {
		var withPlayer = params['with'];
		var swapping = params['swapping'];

		if ( withPlayer !== parseInt(withPlayer) ) {
			currentTable.sendTo(player, 'error', { 'type': 'bad-protocol:swap-with' });
			return false;
		}
		if ( swapping !== true && swapping !== false ) {
			currentTable.sendTo(player, 'error', { 'type': 'bad-protocol:swap-swapping' });
			return false;
		}

		var exchangedPlayer = currentTable.players.find(function(player) {
			return player.id === withPlayer;
		});

		if (!exchangedPlayer) {
			currentTable.sendTo(player, 'error', { 'type': 'swap-with:not-existing' });
			return false;
		}

		if (exchangedPlayer === player) {
			currentTable.sendTo(player, 'error', { 'type': 'swap-with:cannot-swap-self' });
			return false;
		}

		
		if ( swapping ) {
			var role = player.role;
			player.role = exchangedPlayer.role;
			exchangedPlayer.role = role;
		}

		console.log('player #%j swapped with #%j, %s', player.id, withPlayer, swapping ? exchangedPlayer.role + ' <-> ' + player.role : 'no swap');
		currentTable.debugState('new state');

		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_SWITCH,
			'with': exchangedPlayer.id
		});

		currentTable.broadcast('action:competitor', {
			'type': ACTION_SWITCH,
			'id': player.id,
			'with': exchangedPlayer.id
		}, player.id);

		return true;
	};

	// ANNOUNCE
	this.handlePlayerAnnounce = function(player, params) {
		if (currentTable.turn < MIN_SWITCH_TURNS) {
			currentTable.sendTo(player, 'error', { 'type': 'must-swap' });
			return false;
		}

		var role = params['role'];
		if ( AVAILABLE_ROLES.indexOf(role) < 0 ) {
			currentTable.sendTo(player, 'error', { 'type': 'announce-bad-role' });
			return false;
		}

		// TODO according to role, check params

		currentTable.announceTurn = {
			announcingPlayer: null,
			announcedRole: role,
			samePlayers: []
		};
		currentTable.state = STATE_ANNOUNCING;

		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_ANNOUNCE,
			'role': role
		});

		currentTable.broadcast(ACTION_ANNOUNCE, { 
			'from': player.id,
			'role': role
		}, player.id);

		return true;
	};

	// ANNOUNCE TURN - PASS
	this.handlePlayerAnnouncePass = function(player, params) {
		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_ANNOUNCE_PASS
		});

		currentTable.broadcast(ACTION_ANNOUNCE_PASS, { 
			'from': player.id
		}, player.id);

		return true;
	};

	// ANNOUNCE TURN - SAME
	this.handlePlayerAnnounceSame = function(player, params) {

		currentTable.announceTurn.samePlayers.push(player.id);

		currentTable.sendTo(player, 'action:success', { 
			'type': ACTION_ANNOUNCE_SAME
		});

		currentTable.broadcast(ACTION_ANNOUNCE_SAME, { 
			'from': player.id
		}, player.id);

		return true;
	};

	//
	// Moves table state (currentPlayer) to next player
	//
	this.nextPlayer = function() {

		if (currentTable.state === STATE_PLAYING) {
			// move to next player
			currentTable.currentPlayer = (currentTable.currentPlayer + 1) % currentTable.players.length;
			currentTable.turn++;

			currentTable.play();

		} else if (currentTable.state === STATE_ANNOUNCING) {
			// announce turn: move to next player

			if (currentTable.announceTurn.announcingPlayer === null) {
				currentTable.announceTurn.announcingPlayer = (currentTable.currentPlayer + 1) % currentTable.players.length;
			} else {
				currentTable.announceTurn.announcingPlayer = (currentTable.announceTurn.announcingPlayer + 1) % currentTable.players.length;
			}

			// if we got back to current player, then it's end of announcing turn, let's resolve it
			if(currentTable.announceTurn.announcingPlayer === currentTable.currentPlayer) {
				currentTable.resolveAnnounceTurn();
			} else { // else play announce turn
				currentTable.play();
			}
		}
	};

	this.resolveAnnounceTurn = function() {

		var currentPlayer = currentTable.players[currentTable.currentPlayer];
		var announcedRole = currentTable.announceTurn.announcedRole;

		// perform action
		if (currentTable.announceTurn.samePlayers.length == 0) {

			ROLES_ACTIONS[announcedRole](currentPlayer, currentTable);

			var otherPlayersData = currentTable.players.filter(function(player) { return player.id !== currentPlayer; });
			otherPlayersData = otherPlayersData.map(function(player) {
				return {
					id: player.id,
					coins: player.gold
				};
			});

			currentTable.broadcast('announce-resolve', {
				'announced-role': currentTable.announceTurn.announcedRole,
				'announcing-players': {
					id: currentPlayer.id,
					coins: currentPlayer.gold
				}, 
				'other-players': otherPlayersData
			});

			// don't need to reveal player
		} else {

			var announcingPlayers = currentTable.players.filter(function(player) {
				return currentTable.announceTurn.samePlayers.indexOf(player.id) >= 0;
			});

			// get player having the announced role (maybe many due to peasant)
			var actualRoles = announcingPlayers.filter(function(player) {
				return player.role === announcedRole;
			});

			// get player failing announcing their role
			var failedRoles = announcingPlayers.filter(function(player) {
				return player.role !== currentTable.announceTurn.announcedRole;
			});

			// apply role ...
			actualRoles.forEach(function(player) {
				ROLES_ACTIONS[announcedRole]();
			});

			// ... before players pay to the tribunal
			failedRoles.forEach(function(player) {
				player.gold = Math.max(player.gold - 1, 0);
				currentTable.tribunal++;
			});

			var returnedPlayerData = announcingPlayers.map(function(player) {
				return {
					id: player.id,
					coins: player.gold,
					role: player.role
				};
			});

			var otherPlayersData = currentTable.players.filter(function(player) {
				return currentTable.announceTurn.samePlayers.indexOf(player.id) < 0;
			});

			otherPlayersData = otherPlayersData.map(function(player) {
				return {
					id: player.id,
					coins: player.gold
				};
			});

			currentTable.broadcast('announce-resolve', {
				'announced-role': announcedRole,
				'announcing-players': returnedPlayerData,
				'other-players': otherPlayersData
			});
		}

		currentTable.announceTurn = null;
		currentTable.state = STATE_PLAYING;

		currentTable.nextPlayer();
	};

	//
	// Handles a player disconnection
	//
	this.handlePlayerLeft = function(player) {
		var index = currentTable.players.indexOf(player);
		if (index > -1) {

			if ( currentTable.timeoutHandle ) {
				clearTimeout(currentTable.timeoutHandle);
				currentTable.timeoutHandle = null;
			}
			
			currentTable.players.splice(index, 1);

			if (currentTable.state != STATE_WAITING_PLAYERS) {
				currentTable.state = STATE_WAITING_PLAYERS;
				var data = { 
					reason: player.name + ' left the table',
					id: player.id
				};
				currentTable.broadcast('stop-game', data);

				console.log('Game was stopped: %j', data);
			}
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

	//
	// prints the state of the table
	//
	this.debugState = function(message) {
		var playerDesc = currentTable.players.map(function(player) { return {
			id: player.id,
			role: player.role,
			gold: player.gold,
			name: player.name
		}; });

		console.log('%s : %j', message || "DEBUG",  playerDesc);
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