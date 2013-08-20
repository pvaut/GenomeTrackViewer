import threading
import uuid




class CalculationThreadList:
    def __init__(self, id, handler, data):
        self.threads = {}
        self.lock = threading.Lock()
    def AddThread(self,id):
        with self.lock:
            self.threads[id]=True
    def DelThread(self,id):
        with self.lock:
            del self.threads[id]
    def IsPresent(self,id):
        with self.lock:
            return id in self.threads

theCalculationThreadList = CalculationThreadList()

class CalculationThread (threading.Thread):
    def __init__(self, id, handler, data):
        threading.Thread.__init__(self)
        self.id = id
        self.handler = handler
        self.data = data
    def run(self):
        print "Starting " + self.id
        theCalculationThreadList.AddThread(self.id)
        self.handler(self.data)
        print "Exiting " + self.id
        theCalculationThreadList.DelThread(self.id)


def IsRunning(id):
    return theCalculationThreadList.IsPresent(id)


def RespondAsync(handler,data):
    id = 'WR'+str(uuid.uuid1()).replace('-', '_')
    data['calculationid'] = id
    thread = CalculationThread(id,handler,data)
    thread.start()
    #handler(data)
    return data