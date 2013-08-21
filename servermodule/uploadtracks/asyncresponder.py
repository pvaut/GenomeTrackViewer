import threading
import uuid




class CalculationThreadList:
    def __init__(self):
        self.threads = {}
        self.lock = threading.Lock()
    def AddThread(self,id):
        with self.lock:
            self.threads[id] = { 'status':'Calculating', 'progress':None, 'failed':False }
    def DelThread(self,id):
        with self.lock:
            del self.threads[id]
    def SetInfo(self, id, status, progress):
        with self.lock:
            if id in self.threads:
                self.threads[id]['status'] = status
                self.threads[id]['progress'] = progress
    def SetFailed(self, id):
        with self.lock:
            if id in self.threads:
                self.threads[id]['failed'] = True
    def GetInfo(self,id):
        with self.lock:
            if id in self.threads:
                return { 'status': self.threads[id]['status'], 'progress': self.threads[id]['progress'], 'failed': self.threads[id]['failed'] }
            else:
                return None

theCalculationThreadList = CalculationThreadList()

class CalculationThread (threading.Thread):
    def __init__(self, id, handler, data):
        threading.Thread.__init__(self)
        self.id = id
        self.handler = handler
        self.data = data
    def run(self):
        theCalculationThreadList.AddThread(self.id)
        try:
            self.handler(self.data,self)
            theCalculationThreadList.DelThread(self.id)
        except Exception as e:
            theCalculationThreadList.SetFailed(self.id)
            print('====== CALCULATION ERROR '+str(e))
            self.SetInfo('Error: '+str(e))

    def SetInfo(self, status, progress=None):
        theCalculationThreadList.SetInfo(self.id, status, progress)


def GetCalculationInfo(id):
    return theCalculationThreadList.GetInfo(id)


def RespondAsync(handler,data):
    id = 'WR'+str(uuid.uuid1()).replace('-', '_')
    data['calculationid'] = id
    thread = CalculationThread(id,handler,data)
    thread.start()
    return data