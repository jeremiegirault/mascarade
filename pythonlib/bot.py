from abc import ABCMeta, abstractmethod
import json
from constants import *

class Bot:
    __metaclass__ = ABCMeta
    def __init__(self, ws, gs):
        self.ws = ws
        self.gs = gs
        print "[BOT] I have the id : " + str(gs.client_id)

    @abstractmethod
    def play_normal_mode(self):
        pass

    @abstractmethod
    def play_announcing_mode(self):
        pass

    def play(self):
        """
        According to game state
        """
        if self.gs.announcing_turn_current_player:  # The game is in announcing mode
            print "[BOT] ANNOUNCING MODE"
            self.play_announcing_mode()
        else:
            print "[BOT] NORMAL MODE"
            self.play_normal_mode()


    def peek(self):
        payload = {
            "action": "action:peek",
            "data": {}
        }
        raw_payload = json.dumps(payload)
        print ("[BOT] I'm about to peek", raw_payload)
        self.ws.send(raw_payload)

    def switch(self, player_id, swapping):
        payload = {
            "action" : "action:switch",
            "data" : {"with": player_id, "swapping": swapping}
        }
        raw_payload = json.dumps(payload)
        print ("I'm about to switch", raw_payload)
        self.ws.send(raw_payload)

    def announce(self, role):
        payload = {
            "action": "action:announce",
            "data": {"role": role}
        }
        raw_payload = json.dumps(payload)
        print ("[BOT] I will announce", raw_payload)
        self.ws.send(raw_payload)

    def announce_same(self, data):
        '''
        The bot annouces that it has the same card as the one that another bot annouced.
        '''
        payload = {
            "action" : ANNOUNCE_SAME,
            "data" : {}
        }
        raw_payload = json.dumps(payload)
        if self.is_in_valid_state_for_announcing():
            self.ws.send(raw_payload)
        else:  # The game state is not in valid state to annouce something, maybe the annoucer was not declared
            print "[BOT][ERROR] The bot made an annoucement, when the game state was not in annoucement mode. "

    def announce_pass(self):
        '''
        In an announcement made by another bot, the bot decides to pass.
        '''
        payload = {
            'action' : ANNOUNCE_PASS,
            'data' : {}
        }
        raw_payload = json.dumps(payload)

        if self.is_in_valid_state_for_announcing():
            self.ws.send(raw_payload)
        else: # The game state is not in valid state to annouce something, maybe the annoucer was not declared
            print "[BOT][ERROR] The bot made an annoucement, when the game state was not in annoucement mode. "


    def handle_announcement(self, data, announce_same=True):
        if announce_same: # we are announcing the same
            self.announce_same(data)
        else:  # we are passing
            self.announce_pass()

    def is_in_valid_state_for_announcing(self):
        if self.gs.announcing_turn_current_player:
            return True
        else:
            return False
