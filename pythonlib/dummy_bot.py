from bot import Bot
import random

class DummyBot(Bot):
    def play(self):
        '''
        if (random.random() > 0.5):
            idd = random.choice(self.gs.players).id
            self.switch(player_id=int(idd), swapping=random.choice([True, False]))
        else:
            self.peek()
        '''
        self.announce("role:king")
