import DQXDbTools
import uuid
import os
import config
import asyncresponder
import VTTable
import Utils
import threading


updateLock = threading.Lock()


def ResponseExecute(data, calculationObject):

    if not(updateLock.acquire(0)):
        raise Exception('Information is currently being updated. Please try again later')
    updateLock.release()

    with updateLock:
        databaseName = data['database']
        workspaceid = DQXDbTools.ToSafeIdentifier(data['workspaceid'])

        properties = []
        propertyTypes = {}
        propTokens = data['props'].split('~')
        for tokennr in range(len(propTokens)/2):
            properties.append(propTokens[2*tokennr])
            propertyTypes[propTokens[2*tokennr]] = propTokens[2*tokennr+1]

        print('======================================')
        print(str(properties))
        print(str(propertyTypes))

        # Load the file
        filename = os.path.join(config.BASEDIR, 'Uploads', DQXDbTools.ToSafeIdentifier(data['fileid']))
        tb = VTTable.VTTable()
        tb.allColumnsText = True
        try:
            calculationObject.SetInfo('Loading data file')
            tb.LoadFile(filename)#!!!should be no limitation
        except Exception as e:
            raise Exception('Error while reading file: '+str(e))

        # Remove all unneeded columns
        colNr = 0
        while colNr<tb.GetColCount():
            if (tb.GetColName(colNr) not in propertyTypes) and (tb.GetColName(colNr) != 'snpid'):
                tb.DropCol(tb.GetColName(colNr))
            else:
                colNr += 1

        # Import into SQL
        calculationObject.SetInfo('Dumping SQL')
        tmptable = Utils.GetTempID()
        tmpfile_create = os.path.join(config.BASEDIR, 'Uploads', tmptable+'_create.sql')
        tmpfile_dump = os.path.join(config.BASEDIR, 'Uploads', tmptable+'_dump.sql')
        tb.SaveSQLCreation(tmpfile_create, tmptable)
        tb.SaveSQLDump(tmpfile_dump, tmptable)
        calculationObject.SetInfo('Importing into database')
        cmd = "mysql -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, tmpfile_create)
        os.system(cmd)
        cmd = "mysql -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, tmpfile_dump)
        os.system(cmd)
        os.remove(tmpfile_create)
        os.remove(tmpfile_dump)

        sourcetable='SNPINFO_{0}'.format(workspaceid)

        db = DQXDbTools.OpenDatabase(databaseName)
        cur = db.cursor()

        calculationObject.SetInfo('Indexing new information')
        cur.execute('CREATE UNIQUE INDEX snpid ON {0}(snpid)'.format(tmptable))

        # Dropping columns that will be replaced
        cur.execute('SELECT propid FROM snpproperties WHERE workspaceid="{0}"'.format(workspaceid))
        existingProperties = []
        for row in cur.fetchall():
            existProperty= row[0]
            if existProperty in propertyTypes:
                existingProperties.append(row[0])
        if len(existingProperties)>0:
            calculationObject.SetInfo('Removing outdated information')
            for prop in existingProperties:
                cur.execute('DELETE FROM snpproperties WHERE (workspaceid="{0}") and (propid="{1}")'.format(workspaceid,prop))
            sql = "ALTER TABLE {0} ".format(sourcetable)
            for prop in existingProperties:
                if prop!=existingProperties[0]:
                    sql+=" ,"
                sql += "DROP COLUMN {0}".format(prop)
            print('=========== STATEMENT '+sql)
            cur.execute(sql)



        calculationObject.SetInfo('Creating new columns')
        sql = "ALTER TABLE {0} ".format(sourcetable)
        for prop in properties:
            if prop!=properties[0]:
                sql+=" ,"
            sql += "ADD COLUMN {0} float".format(prop) #!!! todo: make type dependent on source type
        print('=========== STATEMENT '+sql)
        cur.execute(sql)


        calculationObject.SetInfo('Joining information')
        sql = "update {0} left join {1} on {0}.snpid={1}.snpid set ".format(sourcetable,tmptable)
        for prop in properties:
            if prop!=properties[0]:
                sql+=" ,"
            sql += "{0}.{2}={1}.{2}".format(sourcetable,tmptable,prop)
        print('=========== STATEMENT '+sql)
        cur.execute(sql)

        calculationObject.SetInfo('Cleaning up')
        cur.execute("DROP TABLE {0}".format(tmptable))

        #Insert info about properties
        for prop in properties:
            sql = 'INSERT INTO snpproperties VALUES ("{0}","custom","float","{1}")'.format(workspaceid,prop)
            print('=========== STATEMENT '+sql)
            cur.execute(sql)


        db.commit()
        db.close()




def response(returndata):
#    returndata['id']='WS'+str(uuid.uuid1()).replace('-', '_')
    return asyncresponder.RespondAsync(ResponseExecute, returndata)

