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

def parse_start_game(data, gs):
    '''
    Update players regarding the given initial state

    {u'action': u'start-game', u'data': {u'initial-state':
        [{u'role': u'role:bishop', u'id': 1, u'name': u'Player #1'},
        {u'role': u'role:queen', u'id': 2, u'name': u'Player #2'},
        {u'role': u'role:witch', u'id': 3, u'name': u'Player #3'},
        {u'role': u'role:king', u'id': 4, u'name': u'Player #4'},
        {u'role': u'role:judge', u'id': 5, u'name': u'Player #5'},
        {u'role': u'role:cheater', u'id': 6, u'name': u'Player #6'}]}}
    '''
    initial_state = data.get('initial-state')
    for state in initial_state:
        gs.update_player(id=str(state.get('id')), coins='6', role=state.get('role'), name=state.get('name'))

def parse_player_playing(data, gs):
    '''
    Displays the name of the current player

    {u'action': u'player-playing', u'data': {u'id': 3}}
    '''
    player_id = data.get('id')
    gs.set_current_player(player_id=player_id)
    return player_id
