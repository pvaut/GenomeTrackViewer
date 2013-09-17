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
    coder = B64.ValueListCoder()

    if propid2 is None:
        categories1 = []
        categorycounts = []
        sql = 'select {1}, count({1}) as _cnt from {0} group by {1} order by _cnt desc limit 10000;'.format(tableid, propid1)
        cur.execute(sql)
        for row in cur.fetchall():
            categories1.append(row[0])
            categorycounts.append(row[1])

        returndata['categories1'] = coder.EncodeGeneric(categories1)
        returndata['categorycounts'] = coder.EncodeIntegers(categorycounts)
    else:
        categories1 = []
        categories2 = []
        categorycounts = []
        sql = 'select {1}, {2}, count({1}) as _cnt from {0} group by {1}, {2} limit 10000;'.format(tableid, propid1, propid2)
        cur.execute(sql)
        for row in cur.fetchall():
            categories1.append(row[0])
            categories2.append(row[1])
            categorycounts.append(row[2])

        returndata['categories1'] = coder.EncodeGeneric(categories1)
        returndata['categories2'] = coder.EncodeGeneric(categories2)
        returndata['categorycounts'] = coder.EncodeIntegers(categorycounts)

    return returndata