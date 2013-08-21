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

            var controls = Controls.CompoundVert([
                Controls.Static('Select a TAB delimited file from your local hard disk, containing SNP properties that you want to upload'),
                ctrl_trackFile
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
                asyncRequest('addsnpproperties', { database: MetaData.database, workspaceid: MetaData.workspaceid, fileid:wiz.getResultValue(ctrl_trackFile.getID()), props:propChoiceString }, function(resp) {
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
                        var choice  = Controls.Combo('propchoice_'+colname,{label:'', states:[{id:'', name:'Do not use'}, {id:'Value', name:'Use as numerical value'}], val:['']});
                        UploadSNPProperties.propControls.addControl(Controls.CompoundHor([
                            Controls.Static(colname),
                            Controls.HorizontalSeparator(15),
                            choice
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
            });
        }


        return UploadSNPProperties;
    });



