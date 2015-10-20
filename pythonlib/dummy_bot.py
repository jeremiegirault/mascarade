from bot import Bot
import random

class DummyBot(Bot):

    def play_normal_mode(self):
        '''
        Insert behavior in normal mode
        '''
        self.announce("role:king")

    def play_announcing_mode(self):
        '''
        Insert behavior in announcing mode
        '''
        self.announce_pass()
