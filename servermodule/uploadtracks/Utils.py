import uuid


def GetTempID():
    return 'TMP'+str(uuid.uuid1()).replace('-', '_')


def UpdateSnpInfoView(workspaceid, cur):

    # Creating list of all custom properties
    cur.execute('SELECT propid FROM snpproperties WHERE (workspaceid="{0}") and (source="custom")'.format(workspaceid))
    properties = [ row[0] for row in cur.fetchall() ]

    sql = "create or replace view SNPCMB_{0} as select snpinfo.*".format(workspaceid)
    for propid in properties:
        sql += ", SNPINFO_{0}.{1}".format(workspaceid, propid)
    sql += " from snpinfo left join SNPINFO_{0} on snpinfo.snpid=SNPINFO_{0}.snpid".format(workspaceid)
    cur.execute(sql)