import DQXDbTools
import B64


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propid1 = DQXDbTools.ToSafeIdentifier(returndata['propid1'])

    propid2 = None
    if 'propid2' in returndata:
        propid2 = DQXDbTools.ToSafeIdentifier(returndata['propid2'])

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    categories = []
    categorycounts = []
    sql = 'select {1}, count({1}) as _cnt from {0} group by {1} order by _cnt desc limit 1000;'.format(tableid, propid1)
    cur.execute(sql)
    for row in cur.fetchall():
        categories.append(row[0])
        categorycounts.append(row[1])

    coder = B64.ValueListCoder()
    returndata['categories'] = coder.EncodeGeneric(categories)
    returndata['categorycounts'] = coder.EncodeIntegers(categorycounts)

    return returndata