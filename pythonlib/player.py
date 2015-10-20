# -*- coding: utf-8 -*-

COINS_START = 6
ROLE_START = 'role:unknown'

class Player(object):

    def __init__(self, id, role=ROLE_START, coins=COINS_START):
        self.id = str(id)
        self.coins = coins
        self.role = role
        self.name = ''

    def update(self, coins, role, name):
        self.coins = coins
        self.role = role
        self.name = name

    def toJSON(self):
        return {'id': self.id, 'coins': self.coins, 'role': self.role}
