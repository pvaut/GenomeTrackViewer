import DQXDbTools
import uuid
import os
import config
import VTTable


def response(returndata):

    databaseName = returndata['database']
    workspaceid = returndata['id']

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    #Remove all the tables that have custom tracks for this workspace
    cur.execute('SELECT id FROM customtracks WHERE workspaceid=%s', (workspaceid))
    for row in cur.fetchall() :
        cur.execute("DROP TABLE "+row[0])

    cur.execute("DELETE FROM workspaces WHERE id=%s", (workspaceid) )
    cur.execute("DROP TABLE SNPINFO_{0}".format(workspaceid))
    db.commit()
    db.close()

    return returndata