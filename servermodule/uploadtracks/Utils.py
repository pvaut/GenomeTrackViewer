import uuid


def GetTempID():
    return 'TMP'+str(uuid.uuid1()).replace('-', '_')
