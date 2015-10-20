from abc import ABCMeta, abstractmethod
import json
class Bot:
    __metaclass__ = ABCMeta

    def __init__(self, ws, gs):
        self.ws = ws
        self.gs = gs

    @abstractmethod
    def play(self):
        pass

    def peek(self):
        payload = {
            "action" : "action:peek",
            "data" : {}
        }
        raw_payload = json.dumps(payload)

        self.ws.send(raw_payload)
        return True

    def switch(self):
        pass

    def announce(self):
        pass
