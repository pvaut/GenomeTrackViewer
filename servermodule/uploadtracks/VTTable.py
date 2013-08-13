import math
import string

#import xlrd

VERYSMALL= -1.0e199
VERYLARGE= +1.0e199

def PermutationIndices(data):
    return sorted(range(len(data)), key = data.__getitem__)

class BasicStatAccum:
    def __init__(self):
        self.n = 0
        self.mean = 0
        self.M2 = 0
        self.min=VERYLARGE
        self.max=VERYSMALL
    
    def AddValue(self,val):
        if (val!=None):
            self.n += 1
            delta = val - self.mean
            self.mean += delta/self.n
            self.M2 += delta*(val - self.mean)
            if (val<self.min): self.min=val
            if (val>self.max): self.max=val

    def GetAvarage(self):
        return(self.mean)

    def GetStandardDevation(self):
        if (self.n==0): return(0.0)
        return(math.sqrt(self.M2/self.n))

class VTColumn:
    def __init__(self, iPar1, iPar2=None):#can be name, type; or another column
        if (iPar2!=None):
            iName=iPar1
            iTypeStr=iPar2
            if (iTypeStr!='Value') and (iTypeStr!='Text'):
                raise Exception('Invalid column type string')
            self.Name=iName
            self.Type=0
            if (iTypeStr=='Text'): self.Type=1
        else:
            colinfo=iPar1
            self.Name=colinfo.Name
            self.Type=colinfo.Type

    def IsValue(self):
        return self.Type==0
    
    def IsText(self):
        return self.Type==1
    
    def MakeText(self): self.Type=1

    def MakeValue(self): self.Type=0
    
    def GetTypeStr(self):
        if self.IsValue(): return('Value')
        if self.IsText(): return('Text')
        
    @staticmethod
    def CheckSame(Col1, Col2):
        if Col1.Name!=Col2.Name: raise Exception('Different column names: {0} vs {1}'.format(Col1.Name,Col2.Name))
        if Col1.Type!=Col2.Type: raise Exception('Inconsistent column types for {0}'.format(Col1.Name))

#column types: 0=Value 1=Text
class VTTable:
    
    def __init__(self):
        self.allColumnsText=False
        self.Columns=[]
        self.ColIndex={}
#        self.Columns.append('BROL')

    def AddRowEmpty(self):
        for col in self.Columns:
            col['data'].append(None)
        
    def AddColumn(self,ColInfo):
        if ColInfo.Name in self.ColIndex: raise Exception('Column {0} exists already'.format(ColInfo.Name))
        self.Columns.append( {'info':ColInfo, 'data':[]} )
        self.ColIndex[ColInfo.Name]=len(self.Columns)-1
        return self.Columns[len(self.Columns)-1]
    
    def FillColumn(self,ColName,Val):
        rowcount=self.GetRowCount()
        del self.Columns[self.GetColNr(ColName)]['data'][:]
        for i in range(0,rowcount):
            self.Columns[self.GetColNr(ColName)]['data'].append(Val)
            
    def ArrangeColumns(self,SortedList):
        ColList=self.GetColList()
        for col in SortedList:
            if col not in ColList:
                raise Exception('Invalid column name '+col)
        for col in ColList:
            if col not in SortedList:
                SortedList.append(col)
        self.Columns=[self.Columns[self.GetColNr(col)] for col in SortedList]
        self.BuildColIndex()


        
    def LoadFile(self, filename, maxrowcount=-1, TreatSpacesAsTabs=False):
        print('Loading table '+filename)
        del self.Columns[:]
        f = open(filename)
        headercells=f.readline().rstrip('\r\n').split('\t')
        for headercol in headercells:
            headercolparts=headercol.split('#')
            coltypestr='Value'
            if self.allColumnsText:
                coltypestr='Text'
            if len(headercolparts)>1:
                if headercolparts[1]=='T': coltypestr='Text'
            self.AddColumn(VTColumn(headercolparts[0],coltypestr))
        linecount=0
#        gc.disable()
        for line in f:
            line=line.rstrip('\r\n')
            if len(line)>0:
                if TreatSpacesAsTabs:
                    line=line.replace(' ','\t')
                cells=line.split('\t')
                for i in range(0,len(self.Columns)):
                    thecol=self.Columns[i]
                    if i<len(cells):
                        if thecol['info'].IsValue():
                            if (cells[i]=='NA') or (cells[i]=='') or (cells[i]=='None') or (cells[i]=='NULL') or (cells[i]=='null'):
                                thecol['data'].append(None)
                            else:
                                thecol['data'].append(float(cells[i]))
                        if thecol['info'].IsText():
                            thecol['data'].append(cells[i])
                    else:
                        thecol['data'].append(None)
                linecount+=1
                if linecount%10000==0: print("   "+str(linecount))
                if (maxrowcount>0) and (linecount>=maxrowcount): break
#        gc.enable()
        f.close()
        print('Finished Loading table {0} ({1} rows)'.format(filename,linecount))
        
#    def LoadXls(self,filename,sheetname):
#        book = xlrd.open_workbook(filename)
#        sheet=book.sheet_by_name(sheetname)
#        for col in sheet.row(0):
#            self.AddColumn(VTColumn(col.value,'Text'))
#
#        for RowNr in range(1,sheet.nrows):
#            row=sheet.row(RowNr)
#            for ColNr in range(sheet.ncols):
#                self.Columns[ColNr]['data'].append(row[ColNr].value)
        
        
        
    def SaveFile(self, filename, saveheader=True, absentvaluestring=None):
        print('Saving table '+filename)
        f=open(filename,'w')
        if saveheader:
            for colnr in range(0,len(self.Columns)):
                col=self.Columns[colnr]
                if colnr>0: f.write('\t')
                f.write(col['info'].Name)
                if col['info'].IsText(): f.write("#T")
            f.write('\n')
        linecount=0
        for rownr in range(0,self.GetRowCount()):
            for colnr in range(0,len(self.Columns)):
                if colnr>0: f.write('\t')
                val=self.Columns[colnr]['data'][rownr]
                if (absentvaluestring is not None) and (val is None):
                    f.write(absentvaluestring)
                else:
                    f.write(str(val))
            f.write('\n')
            linecount+=1
            if linecount%10000==0: print("   "+str(linecount))
        f.close()
        print('Finished Saving table {0} ({1} rows)'.format(filename,linecount))
        
    def SaveSQLDump(self, filename, tablename):
        
        def DecoId(id):
            return '`'+id+'`'
        
        print('Saving SQL dump '+filename)
        f=open(filename,'w')
        
        f.write('SET SQL_SAFE_UPDATES=0;\n')
        f.write('LOCK TABLES {0} WRITE;\n'.format(DecoId(tablename)))
        f.write('DELETE FROM {0};\n'.format(DecoId(tablename)))

        
        colIsString=[self.Columns[colnr]['info'].IsText() for colnr in range(self.GetColCount())]
        
        blockSize=2000
        blockStarted=False
        
        linecount=0
        for rownr in range(0,self.GetRowCount()):
            if not(blockStarted):
                f.write('INSERT INTO {0} ({1}) VALUES '.format(DecoId(tablename),', '.join([DecoId(col) for col in self.GetColList()])))
                blockStarted=True;
                blockNr=0
            lineStr=''
            for colnr in range(0,len(self.Columns)):
                if colnr>0: lineStr+=','
                val=self.Columns[colnr]['data'][rownr]
                if (val is None):
                    f.write('None')
                else:
                    if colIsString[colnr]:
                        val=val.encode('ascii','ignore')
                        val=val.replace("\x92","'")
                        val=val.replace("\xC2","'")
                        val=val.replace("\x91","'")
                        #filter(lambda x: x in string.printable, val)
                        val=val.replace("'","\\'") 
                        val=val.replace('\r\n','\\n') 
                        val=val.replace('\n\r','\\n') 
                        lineStr += '\''
                        lineStr += val
                        if colIsString[colnr]: lineStr += '\''
                    else:
                        lineStr += str(val)
            if blockNr>0: f.write(',')
            f.write('('+lineStr + ')')
            blockNr += 1
            if blockNr>=blockSize:
                f.write(';\n')
                blockStarted=False
            linecount+=1
            if linecount%10000==0: print("   "+str(linecount))
        if blockStarted:
            f.write(';\n')
        f.write('UNLOCK TABLES;\n')
        f.close()
        print('Finished Saving SQL dump {0} ({1} rows)'.format(filename,linecount))

    def SaveSQLCreation(self, filename, tablename):
        print('Saving SQL dump '+filename)
        f=open(filename,'w')
        f.write('drop table if exists {0};'.format(tablename))
        f.write('CREATE TABLE {0} (\n'.format(tablename))
        for col in self.GetColList():
            colinfo=self.GetColInfo(col)
            st = '   '+col
            typestr='varchar(20)'
            if colinfo.GetTypeStr()=='Value':
                typestr='float'
            st += ' '+typestr
            st += ',\n'
            f.write(st)
        f.write(');\n')
        f.close()

        
    def PrintInfo(self):
        print('TABLE INFO Rowcount={0} ColumnCount={1}'.format(self.GetRowCount(),self.GetColCount()))
        for col in self.Columns:
            print("   {0} ({1})".format(col['info'].Name,col['info'].GetTypeStr()))
            
    def PrintRows(self, start, end):
        
        theend=min(end+1,self.GetRowCount())
        for col in self.Columns:
            colsize=len(col['info'].Name)
            for rownr in range(start,theend):
                colsize=max(colsize,len('{0}'.format(col['data'][rownr])))
            col['tmpsize']=colsize
           
        
        print('_'.join([col['tmpsize']*'_' for col in self.Columns]))
        print('|'.join([('{0:'+'{0:0}'.format(col['tmpsize'])+'}').format(col['info'].Name) for col in self.Columns]))
        print('|'.join([col['tmpsize']*'=' for col in self.Columns]))

        for rownr in range(start,theend):
            print('|'.join([('{0:'+'{0:0}'.format(self.Columns[colnr]['tmpsize'])+'}').format(self.GetValue(rownr,colnr)) for colnr in range(0,self.GetColCount())]))
            
            
    def PrintColStats(self, ColName):
        col=self.Columns[self.GetColNr(ColName)]
        stats=BasicStatAccum()
        absentcount=0
        for val in col['data']:
            if val==None: absentcount+=1
            stats.AddValue(val)
        print('TABLE COLUMN INFO {0} (type={1})'.format(ColName,col['type'].GetTypeStr()))
        print("   Row count= {0}".format(len(col['data'])))
        print("   Absent count= {0}".format(absentcount))
        print("   Average= {0}".format(stats.GetAvarage()))
        print("   Std dev= {0}".format(stats.GetStandardDevation()))
        print("   Min val= {0}".format(stats.min))
        print("   Max val= {0}".format(stats.max))
        
    def GetRowNrRange(self):
        return range(0,self.GetRowCount())
        
    def GetRowCount(self):
        if len(self.Columns)==0: return(0);
        return len(self.Columns[0]['data'])

    def GetColCount(self):
        return(len(self.Columns));
    
    def GetColName(self,colnr):
        return self.Columns[colnr]['info'].Name
    
    def GetColNr(self, ColName):
        if not(ColName in self.ColIndex): raise Exception('Column {0} is not present in the table'.format(ColName))
        return(self.ColIndex[ColName])
    
    def IsColumnPresent(self, ColName):
        return (ColName in self.ColIndex)
    
    def GetColInfo(self,ColName):
        return self.Columns[self.GetColNr(ColName)]['info']
    
    def GetColList(self):
        return([col['info'].Name for col in self.Columns])
    
    def GetValue(self, rownr, colnr):
        if type(colnr)==str:
            colnr=self.GetColNr(colnr)
#        if rownr>=len(self.Columns[colnr]['data']):
#            print('Problem with row '+str(rownr))
#            print(str(self.Columns[colnr]))
        return self.Columns[colnr]['data'][rownr]
    
    def SetValue(self, rownr, colnr, val):
        if type(colnr)==str:
            colnr=self.GetColNr(colnr)
        self.Columns[colnr]['data'][rownr]=val

    def CopyDefinitionFrom(self, SourceTable):
        del self.Columns[:]
        for col in SourceTable.Columns:
            self.AddColumn(VTColumn(col['info']))

    def CopyFrom(self, SourceTable):
        self.CopyDefinitionFrom(SourceTable)
        print("Copying table")
        self.Append(SourceTable)
        print("Finished copying table")

    def Append(self, SourceTable):
        print("Appending table")
        if self.GetColCount()!=SourceTable.GetColCount(): raise Exception('Inconsistent number of columns')
        for colnr in range(0,self.GetColCount()):
            VTColumn.CheckSame(self.Columns[colnr]['info'],SourceTable.Columns[colnr]['info']) 
        for rownr in range(0,SourceTable.GetRowCount()):
            for colnr in range(0,self.GetColCount()):
                self.Columns[colnr]['data'].append(SourceTable.Columns[colnr]['data'][rownr])
            
        print("Finished appending table")

    def FilterValueFrom(self, SourceTable, ColName, Value):
        print('Filtering value')
        self.CopyDefinitionFrom(SourceTable)
        SourceFilterCol=SourceTable.Columns[self.GetColNr(ColName)]['data']
        for i in range(0,SourceTable.GetRowCount()):
            if SourceFilterCol[i]==Value:
                for j in range(0,SourceTable.GetColCount()):
                    self.Columns[j]['data'].append(SourceTable.Columns[j]['data'][i])
        print('Finished Filtering value ({0} from {1})'.format(self.GetRowCount(),SourceTable.GetRowCount()))

    def FilterValueRangeFrom(self, SourceTable, ColName, MinVal, MaxVal):
        print('Filtering value range')
        self.CopyDefinitionFrom(SourceTable)
        SourceFilterCol=SourceTable.Columns[self.GetColNr(ColName)]['data']
        for i in range(0,SourceTable.GetRowCount()):
            ok=True
            if SourceFilterCol[i]==None: ok=False
            else:
                if SourceFilterCol[i]<MinVal: ok=False
                if SourceFilterCol[i]>MaxVal: ok=False
            if ok:
                for j in range(0,SourceTable.GetColCount()):
                    self.Columns[j]['data'].append(SourceTable.Columns[j]['data'][i])
        print('Finished Filtering value range ({0} from {1})'.format(self.GetRowCount(),SourceTable.GetRowCount()))
        
    def FilterByFunctionReturn(self, Function, *ArgColNames):
        Result=VTTable()
        Result.CopyDefinitionFrom(self)
        colargdata=[]
        for arg in ArgColNames: colargdata.append(self.Columns[self.GetColNr(arg)]['data'])
        for i in range(0,self.GetRowCount()):
            argdata=[arg[i] for arg in colargdata]
            if Function(*argdata):
                for j in range(0,self.GetColCount()):
                    Result.Columns[j]['data'].append(self.Columns[j]['data'][i])
        return(Result)
            
    def SortValuesReturn(self, ColName):
        print('Sorting by column {0}'.format(ColName))
        Result=VTTable()
        Result.CopyDefinitionFrom(self)
        colnr=Result.GetColNr(ColName)
        #if not(Result.Columns[colnr]['info'].IsValue()): raise Exception('Invalid column type for numerical sorting')
        sortvals=[]
        for i in range(0,self.GetRowCount()):
            vl=self.GetValue(i,colnr)
            if vl==None: sortvals.append(VERYSMALL)
            else: sortvals.append(vl)
        sortidx=PermutationIndices(sortvals)
        for rownr in range(0,self.GetRowCount()):
            sortrownr=sortidx[rownr]
            for colnr in range(0,Result.GetColCount()):
                Result.Columns[colnr]['data'].append(self.Columns[colnr]['data'][sortrownr])
        print('Finished sorting by column {0}'.format(ColName))
        return(Result)
        
    def BuildColDict(self, ColName, AllowDuplicates):
        keydict={}
        keycolnr=self.GetColNr(ColName)
        for i in range(0,self.GetRowCount()):
            keyvl=self.GetValue(i,keycolnr)
            if not(AllowDuplicates) and (keyvl!=None):
                if keyvl in keydict:
                    raise Exception('Duplicate key "{0}" in table (rows {1} & {2})'.format(keyvl,i,keydict[keyvl]))
            keydict[keyvl]=i
        return(keydict)
    
    def ToListOfMaps(self):
        lst=[]
        for i in range(0,self.GetRowCount()):
            item={}
            for colnr in range(0,self.GetColCount()):
                item[self.Columns[colnr]['info'].Name]=self.GetValue(i,colnr)
            lst.append(item)
        return lst

    def MergeTablesByKeyFrom(self, Table1, Table2, KeyColName, NeedRow1=False, NeedRow2=False):
        print('Merging tables by key')
        keycolnr1=Table1.GetColNr(KeyColName)
        keycolnr2=Table2.GetColNr(KeyColName)
        self.CopyDefinitionFrom(Table1)
        newcolnrs=[]
        colnrs2=[]
        for col in Table2.Columns:
            if col['info'].Name!=KeyColName:
                self.AddColumn(VTColumn(col['info']))
                colnrs2.append(Table2.GetColNr(col['info'].Name))
                newcolnrs.append(self.GetColNr(col['info'].Name))
        print('dict1')
        keydict1=Table1.BuildColDict(KeyColName,not(NeedRow2))
        print('dict2')
        keydict2=Table2.BuildColDict(KeyColName,not(NeedRow1))
        #loop over all rows in first table and map info from second table
        for i in range(0,Table1.GetRowCount()):
            keyvl=Table1.GetValue(i,keycolnr1)
            if not(NeedRow2) or (keyvl in keydict2):#copy row from first table
                for colnr in range(0,Table1.GetColCount()):
                    self.Columns[colnr]['data'].append(Table1.GetValue(i,colnr))
                if keyvl in keydict2:#copy row from second table
                    for newidx in range(0,len(colnrs2)):
                        self.Columns[newcolnrs[newidx]]['data'].append(Table2.GetValue(keydict2[keyvl],colnrs2[newidx]))
                else:
                    for colnr in newcolnrs: self.Columns[colnr]['data'].append(None)
        if not(NeedRow1):#loop over all rows in table 2 that are missing in table 1
            for i in range(0,Table2.GetRowCount()):
                keyvl=Table2.GetValue(i,keycolnr2)
                if not(keyvl in keydict1):
                    for colnr in range(0,Table1.GetColCount()):
                        self.Columns[colnr]['data'].append(None)
                    self.Columns[keycolnr1]['data'][self.GetRowCount()-1]=keyvl
                    for newidx in range(0,len(colnrs2)):
                        self.Columns[newcolnrs[newidx]]['data'].append(Table2.GetValue(i,colnrs2[newidx]))
        print('Finished merging tables by key')
        
    def DropCol(self, ColName):
        colnr=self.GetColNr(ColName)
        del self.Columns[colnr]
        self.BuildColIndex()
        
    def MoveCol(self, ColName, NewNr):
        colnr=self.GetColNr(ColName)
        thecol=self.Columns[colnr]
        del self.Columns[colnr]
        self.Columns.insert(NewNr,thecol)
        self.BuildColIndex()
        
    def BuildColIndex(self):
        for i in range(0,len(self.Columns)):
            self.ColIndex[self.Columns[i]['info'].Name]=i
        
    def RenameCol(self, OldName, NewName):
        colnr=self.GetColNr(OldName)
        self.Columns[colnr]['info'].Name=NewName
        del self.ColIndex[OldName]
        self.ColIndex[NewName]=colnr
        
    def ConvertColToString(self, ColName):
        col=self.Columns[self.GetColNr(ColName)]
        col['info'].MakeText()
        coldata=col['data']
        for i in range(0,len(coldata)):
            coldata[i]=str(coldata[i])
            
    def ConvertColToValue(self, ColName):
        col=self.Columns[self.GetColNr(ColName)]
        col['info'].MakeValue()
        coldata=col['data']
        for i in range(0,len(coldata)):
            if (coldata[i]!='None') and (coldata[i]!='NA') and (coldata[i]!=''):
                coldata[i]=float(coldata[i])
            else:
                coldata[i]=None
            
            
    def MergeColsToString(self, NewColName, MergeString, *ArgColNames):
        colargdata=[]
        for arg in ArgColNames: colargdata.append(self.Columns[self.GetColNr(arg)]['data'])
        self.AddColumn(VTColumn(NewColName,"Text"))
        coldatanew=self.Columns[self.GetColNr(NewColName)]['data']
        for i in range(0,self.GetRowCount()):
            argdata=[arg[i] for arg in colargdata]
            coldatanew.append(MergeString.format(*argdata))
            
    def ColSplitTokens(self, ColName, SepString, *NewColNames):
        newcoldata=[]
        for newcolname in NewColNames:
            newcoldata.append(self.AddColumn(newcolname,1)['data'])
        for val in self.Columns[self.GetColNr(ColName)]['data']:
            splitted=val.split(SepString)
            for i in range(0,len(newcoldata)):
                newcoldata[i].append(splitted[i])
            
            
    #e.g. Table.CalcCol("CalcCol",lambda x,y: x+y,"Val1",'Val2')
    def CalcCol(self, NewColName, Function, *ArgColNames):
        colargdata=[]
        for arg in ArgColNames: colargdata.append(self.Columns[self.GetColNr(arg)]['data'])
        self.AddColumn(VTColumn(NewColName,'Text'))
        coldatanew=self.Columns[self.GetColNr(NewColName)]['data']
        for i in range(0,self.GetRowCount()):
            argdata=[arg[i] for arg in colargdata]
            alldata=True
            for argval in argdata:
                if argval==None:
                    alldata=False
            if alldata:
                coldatanew.append(Function(*argdata))
            else:
                coldatanew.append(None)
    
    def AddIndexCol(self,ColName):
        data=self.AddColumn(VTColumn(ColName,'Value'))['data']
        for i in range(0,self.GetRowCount()):
            data.append(i)
        
    def GetColStateList(self, ColName):
        states={}
        for val in self.Columns[self.GetColNr(ColName)]['data']:
            states[val]=1
        return([state for state in states])
    
    def GetColStateCountList(self, ColName):
        states={}
        for val in self.Columns[self.GetColNr(ColName)]['data']:
            if val not in states:
                states[val]=0
            states[val]+=1
        return states
    
    
    def CreateAggregate(self, AggregateIDFunction, AggregateColumns):
        Result=VTTable()
        AggregateSourceColNr=[ self.GetColNr(AggregateColumn['OldColName']) for AggregateColumn in AggregateColumns]
        
        AggregateNewColNr=[]
        for aggr in AggregateColumns:
            newcol=Result.AddColumn(VTColumn(aggr['NewColInfo']))
            AggregateNewColNr.append(Result.GetColNr(newcol['info'].Name))
        
        aggregaterows=[]
        aggregaterowmap={}
        for i in range(0,self.GetRowCount()):
            aggrid=AggregateIDFunction(self,i)
            if not(aggrid in aggregaterowmap):
                aggregaterow=[]
                for AggregateColumn in AggregateColumns:
                    aggregaterow.append([])
                aggregaterows.append(aggregaterow)
                aggregaterowmap[aggrid]=len(aggregaterows)-1
            aggregaterow=aggregaterows[aggregaterowmap[aggrid]]
            for j in range(0,len(AggregateColumns)):
                aggregaterow[j].append(self.GetValue(i,AggregateSourceColNr[j]))

        for aggregaterow in aggregaterows:
            for i in range(0,len(AggregateColumns)):
                Result.Columns[AggregateNewColNr[i]]['data'].append(AggregateColumns[i]['SummaryFunction'](aggregaterow[i]))
                
        return(Result)
    
    def MapCol(self,ColName,MapFunction):
        data=self.Columns[self.GetColNr(ColName)]['data']
        for i in range(0,len(data)):
            data[i]=MapFunction(data[i])
            
    def ColumnRemoveQuotes(self,ColName):
        data=self.Columns[self.GetColNr(ColName)]['data']
        for i in range(0,len(data)):
            str=data[i]
            if (str!=None) and (len(str)>=2) and (str[0]=='"') and (str[len(str)-1]=='"'):
                str=str[1:len(str)-1]
                data[i]=str
                
    def RemoveRow(self,RowNr):
        if (RowNr<0) or (RowNr>=self.GetRowCount):
            raise Exception('Invalid row number') 
        for colnr in range(0,self.GetColCount()):
            del self.Columns[colnr]['data'][RowNr]
        
    def RemoveEmptyRows(self):
        RowNr=0;
        while RowNr<self.GetRowCount():
            IsEmpty=True
            for ColNr in range(self.GetColCount()):
                if len(str(self.GetValue(RowNr,ColNr)))>0:
                    IsEmpty=False
            if IsEmpty:
                self.RemoveRow(RowNr)
            else:
                RowNr+=1