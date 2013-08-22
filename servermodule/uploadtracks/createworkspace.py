import DQXDbTools
import uuid
import os
import config
import asyncresponder
import Utils

def ResponseExecute(data, calculationObject):
    databaseName = data['database']
    workspaceId = data['id']
    workspaceName = data['name']

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    calculationObject.SetInfo('Setting up workspace: create table')
    cur.execute("CREATE TABLE SNPINFO_{0} AS SELECT snpid FROM snpinfo".format(workspaceId) )
    calculationObject.SetInfo('Setting up workspace: create index')
    cur.execute("create unique index snpid on SNPINFO_{0}(snpid)".format(workspaceId) )
    cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceId, workspaceName) )
    Utils.UpdateSnpInfoView(workspaceId, cur)
    db.commit()
    db.close()




def response(returndata):
    returndata['id']='WS'+str(uuid.uuid1()).replace('-', '_')
    return asyncresponder.RespondAsync(ResponseExecute, returndata)

