var WebSocket = require('ws');

/******************************************************************************/
// Module
/******************************************************************************/

function start() {
	console.log('Client Starting...');

	var ws = new WebSocket('ws://localhost:8080');
	ws.on('open', function() {
		console.log('Client connected !');

		var myId = '?';
		var state = {};

		ws.on('message', function(msg) {
			var json = JSON.parse(msg);
			if(json.action === 'welcome') {
				myId = json.data.id;
				console.log('#%s entered the table (%s)', myId, msg);
			} else if(json.action === 'start-game') {
				state = json.data;
			} else if(json.action === 'play') {
				var players = state['initial-state']
				var swappedPlayer = null;
				while (!swappedPlayer || swappedPlayer == myId) {
					swappedPlayer = players[Math.floor(Math.random()*players.length)].id;
				};
				console.log('----> %j', swappedPlayer);

				var swapping = Math.random()<.5;
				var json = JSON.stringify({ 
					action: 'action:switch', 
					data: {
						'with': swappedPlayer,
						'swapping': swapping
					}
				});
				ws.send(json);

			} else {
				console.log('#%s : received: %s', myId, msg);
			}
		});
	});
}

module.exports = {
	start: start
}