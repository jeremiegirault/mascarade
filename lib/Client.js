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
		var someoneAnnouncing = false;

		ws.on('message', function(msg) {

			var json = JSON.parse(msg);

			console.log('#%s : received: %s', myId, msg);
			
			if(json.action === 'welcome') {
				myId = json.data.id;
				console.log('#%s entered the table (%s)', myId, msg);
			} else if(json.action === 'start-game') {
				state = json.data;
			} else if(json.action === 'action:announce') {
				someoneAnnouncing = true;
			} else if(json.action === 'announce-resolve') {
				someoneAnnouncing = false;
			} else if(json.action === 'play') {
				var action = null;
				var data = {};
				if (someoneAnnouncing) {
					action = Math.random()<.5 ? 'action:announce-same' : 'action:announce-pass';
				} else {
					action = 'action:announce';
					data.role = 'role:judge';
				}
				var json = JSON.stringify({ 
					action: action, 
					data: data
				});
				ws.send(json);

			}
		});
	});
}

module.exports = {
	start: start
}