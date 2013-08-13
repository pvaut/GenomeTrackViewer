import DQXDbTools
import uuid
import os
import config
import VTTable


def response(returndata):

    databaseName = returndata['database']

    trackUid = 'TR'+str(uuid.uuid1()).replace('-', '_')
    trackName = returndata['name']

    file_path = os.path.join(config.BASEDIR, 'Uploads', returndata['fileid'])
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    tb.LoadFile(file_path)
    tb.ConvertColToValue('pos')
    tb.ConvertColToValue('value')

    sqlfile = os.path.join(config.BASEDIR, 'Uploads', 'tb_'+returndata['fileid']+'.sql')
    tb.SaveSQLDump(sqlfile, trackUid)


    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    cur.execute("INSERT INTO customtracks VALUES (%s,%s)", (trackUid, trackName) )

    sql = "CREATE TABLE {0} (chrom varchar(20), pos int, value float)".format(trackUid)
    print(sql)
    cur.execute(sql)

    sql = "CREATE INDEX chrom ON {0}(chrom)".format(trackUid)
    print(sql)
    cur.execute(sql)

    sql = "CREATE INDEX pos ON {0}(pos)".format(trackUid)
    print(sql)
    cur.execute(sql)

    db.commit()
    db.close()

    cmd = "mysql -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, sqlfile)
    print(cmd)
    os.system(cmd)


    returndata['content'] = 'TEST'
    return returndata

