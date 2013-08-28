define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var UploadSNPProperties = {};

        UploadSNPProperties.init = function() {
        }

        UploadSNPProperties.execute = function(proceedFunction) {
            UploadSNPProperties.proceedFunction = proceedFunction;
            var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
            getter.addTable('workspaces',['id','name'],'name');
            getter.execute(
                MetaData.serverUrl,
                MetaData.database,
                function() {
                    UploadSNPProperties.workspaces = getter.getTableRecords('workspaces');
                    UploadSNPProperties.execute2();
                }
            );

        }

        UploadSNPProperties.execute2 = function() {
            var wiz=Wizard.Create('UploadSNPProperties', {title:'Upload SNP properties', sizeX:450, sizeY: 400});

            var ctrl_trackFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
                UploadSNPProperties.getFileInfo(ctrl_trackFile.getValue());
            });

            UploadSNPProperties.ctrl_uploadresults = Controls.Html(null,"");

            var controls = Controls.CompoundVert([
                Controls.Static('Select a TAB delimited file from your local hard disk, containing SNP properties that you want to upload'),
                ctrl_trackFile,
                UploadSNPProperties.ctrl_uploadresults
            ]);

            UploadSNPProperties.propControls = Controls.CompoundVert([]);


            wiz.addPage({
                id: 'page1',
                form: controls,
                reportValidationError: function() {
                    if (!ctrl_trackFile.getValue())
                        return "No file selected";
                    if (!UploadSNPProperties.correctFileUploaded)
                        return "Invalid file";
                }
            });

            wiz.addPage({
                id: 'page2',
                form: UploadSNPProperties.propControls,
                reportValidationError: function() {
                    var uploadingProperty = false;
                    $.each(UploadSNPProperties.columns,function(idx,colname) {
                        if (colname!='snpid') {
                            var propChoice=UploadSNPProperties.propControls.findControl('propchoice_'+colname).getValue();
                            if (propChoice) uploadingProperty = true;
                        }
                    });
                    if (!uploadingProperty) return "No property is selected for upload";
                }
            });


            wiz.run(function() {
                var propChoiceString = '';
                $.each(UploadSNPProperties.columns,function(idx,colname) {
                    if (colname!='snpid') {
                        var propChoice=wiz.getResultValue('propchoice_'+colname);
                        if (propChoice) {
                            if (propChoiceString) propChoiceString += '~';
                            propChoiceString += colname+'~';
                            propChoiceString += propChoice;
                        }
                    }
                });
                var data = {};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.fileid = wiz.getResultValue(ctrl_trackFile.getID());
                data.props = propChoiceString;
                data.tableid = 'SNP';
                asyncRequest('property_add', data, function(resp) {
                    Msg.send({ type: 'ReloadChannelInfo' });
                    UploadSNPProperties.proceedFunction();
                });

            });
        }


        UploadSNPProperties.getFileInfo = function(fileid) {
            UploadSNPProperties.correctFileUploaded = false;
            DQX.setProcessing();
            DQX.customRequest(MetaData.serverUrl,'uploadtracks','gettabfileinfo',{ database: MetaData.database, fileid: fileid },function(resp) {
                DQX.stopProcessing();
                if ('Error' in resp) {
                    alert(resp.Error);
                    return;
                }
                UploadSNPProperties.columns = resp['columns'].split(';');
                var hasSnpId = false;
                UploadSNPProperties.propControls.clear();
                $.each(UploadSNPProperties.columns,function(idx,colname) {
                    if (colname=='snpid')
                        hasSnpId = true;
                    else {
                        var choice  = Controls.Combo('propchoice_'+colname,{label:'', states:[{id:'', name:'Ignore'}, {id:'Value', name:'Upload (value)'}], val:['']});
                        var fieldStatus = 'New field';
                        if (colname in MetaData.mapCustomSnpProperties)
                            var fieldStatus = '<span style="color:red">Present in workspace</span>';
                        UploadSNPProperties.propControls.addControl(Controls.CompoundHor([
                            Controls.Static(colname),
                            Controls.HorizontalSeparator(15),
                            choice,
                            Controls.HorizontalSeparator(15),
                            Controls.Static(fieldStatus),
                        ]));
                        UploadSNPProperties.propControls.addControl(Controls.VerticalSeparator(7));
                    }
                });
                if (!hasSnpId) {
                    alert('File does not have a column "snpid"');
                    return;
                }
                UploadSNPProperties.correctFileUploaded = true;
                //alert(JSON.stringify(resp));
                UploadSNPProperties.ctrl_uploadresults.modifyValue('<b><br/>Click "Next" to proceed.</b>');
            });
        }


        return UploadSNPProperties;
    });



