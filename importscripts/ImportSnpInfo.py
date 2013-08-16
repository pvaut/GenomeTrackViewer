from TableUtils import VTTable
import sys


tb = VTTable.VTTable()
tb.allColumnsText=True
tb.LoadFile('/home/pvaut/Documents/Genome/PfPopgen30/snpInfo.tab')
#tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_create.sql','snpinfo')


tb.ConvertColToValue('Pos')


#tb.MapCol('CodonNum', convertdashtoabsent)
tb.ConvertColToValue('CodonNum')

tb.ConvertColToValue('NtPos')


tb.ConvertColToValue('Num')

tb.PrintRows(0,15)

tb.SaveSQLDump('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_dump.sql','snpinfo')
sys.exit()
