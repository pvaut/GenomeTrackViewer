import DQXDbTools
import B64


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propid = DQXDbTools.ToSafeIdentifier(returndata['propid'])
    encodedquery = returndata['qry']

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(encodedquery)
    whc.CreateSelectStatement()

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    coder = B64.ValueListCoder()

    if 'binsize' in returndata:
        binsize=float(returndata['binsize'])
    else:
        #Automatically determine bin size
        sql = 'select min({0}) as _mn, max({0}) as _mx from {1}'.format(propid, tableid)
        if len(whc.querystring_params) > 0:
            sql += " WHERE {0}".format(whc.querystring_params)
        cur.execute(sql, whc.queryparams)
        rs = cur.fetchone()
        minval = rs[0]
        maxval = rs[1]
        binsize=(maxval-minval)/10.0
        if binsize<=0:
            binsize=1


    returndata['binsize'] = binsize

    buckets = []
    counts = []
    sql = 'select truncate({0}/{2},0) as bucket, count(*) as _cnt from {1}'.format(propid, tableid, binsize)
    if len(whc.querystring_params) > 0:
        sql += " WHERE {0}".format(whc.querystring_params)
    sql += ' group by bucket'
    print(sql)
    cur.execute(sql, whc.queryparams)
    for row in cur.fetchall():
        if row[0] is not None:
            buckets.append(row[0])
            counts.append(row[1])

    returndata['buckets'] = coder.EncodeIntegers(buckets)
    returndata['counts'] = coder.EncodeIntegers(counts)

    return returndata