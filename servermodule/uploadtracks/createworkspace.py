import DQXDbTools
import uuid
import os
import config


def response(returndata):

    databaseName = returndata['database']
    workspaceId = 'WS'+str(uuid.uuid1()).replace('-', '_')
    workspaceName = DQXDbTools.ToSafeIdentifier(returndata['name'])

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    cur.execute("CREATE TABLE SNPINFO_{0} (snpid varchar(40))".format(workspaceId) )
    cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceId, workspaceName) )
    db.commit()
    db.close()


    returndata['id']=workspaceId
    return returndata