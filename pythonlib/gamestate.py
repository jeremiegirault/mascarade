# -*- coding: utf-8 -*-

from player import Player

class GameState(object):

    def __init__(self):
        self.players = list()
        self.bank = 0
        self.current_player = None
        self.announcing_turn_current_player = None
        self.client_id = None
        self.client_name = ''

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

    def update_player(self, id, coins, role, name):
        for player in self.players:
            if player.id == str(id):
                player.update(coins=coins, role=role, name=name)
                break

    def set_client_id(self, id):
        self.client_id = id

    def set_name(self, name):
        self.client_name = name

    def set_current_player(self, player_id):
        self.current_player = player_id
