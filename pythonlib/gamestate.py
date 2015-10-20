# -*- coding: utf-8 -*-

from player import Player

class GameState(object):

    def __init__(self):
        self.players = list()
        self.bank = 0
        self.current_player = None
        self.announcing_turn_current_player = None
        self.client_id = None

    def add_player(self, player):
        self.players.append(player)
        return player

    def remove_player(self, id):
        for player in self.players:
            if player.id == id:
                self.players.remove(player)
                print 'Player ' + str(player.id) + ' removed.'
            else:
                pass

    def update_player(self, id, coins, role):
        for player in self.players:
            if player.id == id:
                player.update(coins=coins, role=role)
            else:
                pass

    def set_client_id(self, id):
        self.client_id = id
