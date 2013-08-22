import DQXDbTools
import uuid
import os
import config
import asyncresponder
import time
import Utils

def ResponseExecute(data, calculationObject):

    databaseName = DQXDbTools.ToSafeIdentifier(data['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(data['workspaceid'])
    propid = DQXDbTools.ToSafeIdentifier(data['propid'])

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    calculationObject.SetInfo('Deleting data')
    cur.execute("ALTER TABLE SNPINFO_{0} DROP COLUMN {1}".format(workspaceid, propid) )
    cur.execute('DELETE FROM snpproperties WHERE (workspaceid="{0}") AND (source="custom") AND (propid="{1}")'.format(workspaceid, propid) )
    Utils.UpdateSnpInfoView(workspaceid, cur)
    db.commit()
    db.close()




def response(returndata):
    returndata['id']='WS'+str(uuid.uuid1()).replace('-', '_')
    return asyncresponder.RespondAsync(ResponseExecute, returndata)

