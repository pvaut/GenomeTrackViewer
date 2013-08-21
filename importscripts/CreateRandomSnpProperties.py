from TableUtils import VTTable
import sys
import math
import random


tb = VTTable.VTTable()
tb.allColumnsText=True
tb.LoadFile('/home/pvaut/Documents/Genome/PfPopgen30/snpInfo.tab')
tb.DropCol('Num')
tb.DropCol('Ref')
tb.DropCol('Nonref')
tb.DropCol('GeneId')
tb.DropCol('Strand')
tb.DropCol('CodonNum')
tb.DropCol('Codon')
tb.DropCol('NtPos')
tb.DropCol('RefAmino')
tb.DropCol('Mutation')
tb.DropCol('MutCodon')
tb.DropCol('MutAmino')
tb.DropCol('MutType')
tb.DropCol('MutName')
tb.DropCol('GeneDescription')
tb.ConvertColToValue('Pos')
tb.RenameCol('Chr','chrom')
tb.RenameCol('Pos','pos')
tb.RenameCol('SnpName','snpid')
#tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpinfo_create.sql','snpinfo')

for propnr in range(5):
    propname='prop'+str(propnr)
    tb.AddColumn(VTTable.VTColumn(propname,'Value'))
    tb.FillColumn(propname,0)
    propcolnr=tb.GetColNr(propname)
    ampl = 0.005+0.02*random.random()
    phase = random.random()*2*math.pi
    for rownr in tb.GetRowNrRange():
        pos = tb.GetValue(rownr,1)
        tb.SetValue(rownr,propcolnr,0.5+0.5*math.sin(ampl*pos+phase)+random.random()*0.1)


tb.DropCol('chrom')
tb.DropCol('pos')


tb.PrintRows(0,10)



tb.SaveFile('/home/pvaut/Documents/Genome/PfPopgen30/snpprops.txt')
tb.SaveSQLCreation('/home/pvaut/Documents/Genome/PfPopgen30/snpprops_create.sql','snpprops')
tb.SaveSQLDump('/home/pvaut/Documents/Genome/PfPopgen30/snpprops_dump.sql','snpprops')
sys.exit()
