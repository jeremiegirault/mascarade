# -*- coding: utf-8 -*-

from player import Player

def parse_welcome(data, gs):
    '''
     - Set the GameState client id and instantiate competitors

     {"action":"welcome","data":{"id":1,"competitors":[]}}
    '''
    client_id = data.get('id')

    gs.set_client_id(id=client_id)  # Set the GameState client id
    gs.add_player(Player(id=client_id))  # Add the player to the GameState
    competitors = [Player(id=c) for c in data.get('competitors')]
    return [gs.add_player(c) for c in competitors]  # Add players to the GameState

def parse_new_player(data, gs):
    '''
     Updates the Game State to add a new player to the list of Players

     {"action":"new-player","data":{"id":2}}
    '''
    id = data.get('id')
    return gs.add_player(Player(id=id))
