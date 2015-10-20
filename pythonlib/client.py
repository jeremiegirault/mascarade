# -*- coding: utf-8 -*-

import websocket
import thread
import time, json, sys
from constants import *
from gamestate import GameState
import utils
from dummy_bot import DummyBot

gs = GameState() # initialize Game State
bot = None
def on_message(ws, message):
    msg = json.loads(message)
    a = msg.get('action',None)
    data = msg.get('data', None)

    if a == WELCOME: # {"action":"welcome","data":{"id":4,"competitors":[1]}}
        utils.parse_welcome(data=data, gs=gs)
        print "Added players : " + str(len(gs.players))
    elif a == NEW_PLAYER:
        utils.parse_new_player(data=data, gs=gs)
        print "Added player : " + str(len(gs.players))
    elif a == START_GAME:
        print "START_GAME"
        utils.parse_start_game(data=data, gs=gs)
        bot = DummyBot(ws=ws, gs=gs)
        print "Game has started !"
    elif a == PLAYER_PLAYING:
        player_id = utils.parse_player_playing(data=data,gs=gs)
        print 'Player : ' + str(player_id) + ' is playing'
    elif a == PLAY:
        print 'Play'
        bot.play()

    elif a == STOP_GAME:
        print msg
    else:
        pass

def on_error(ws, error):
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    def run(*args):
        ws.send("lol")

    thread.start_new_thread(run, ())

if __name__ == "__main__":
    #websocket.enableTrace(True)
    if len(sys.argv) > 1:
        gs.set_name(sys.argv[0])
    ws = websocket.WebSocketApp("ws://localhost:8080",
                              on_message = on_message,
                              on_error = on_error,
                              on_close = on_close)
    ws.on_open = on_open
    ws.run_forever()
