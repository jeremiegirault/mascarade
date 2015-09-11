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

		ws.on('message', function(msg) {
			var json = JSON.parse(msg);
			if(json.action === 'welcome') {
				myId = json.data.id;
				console.log('#%s entered the table (%s)', myId, msg);
			} else {
				console.log('#%s : received: %s', myId, msg);
			}
		});
	});
}

module.exports = {
	start: start
}