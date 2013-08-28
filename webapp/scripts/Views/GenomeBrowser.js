define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var GenomeBrowserModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'genomebrowser',    // View ID
                    'Genome browser'    // View title
                );

                that.fetchers={};


                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    that.filterByQuery = false;
                    that.currentUserQuery = null;
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));//Create frame that will contain the controls panel
                    this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7));//Create frame that will contain the genome browser panel

                    Msg.listen("", { type: 'JumpgenomeRegion' }, that.onJumpGenomeRegion);
                    Msg.listen("", { type: 'JumpgenomePosition' }, that.onJumpGenomePosition);

                    Msg.listen("", {type: 'QueryChanged'}, function(scope,query) {
                        that.currentUserQuery = query;
                        if (that.filterByQuery) {
                            that.dataFetcherSNPProperties.setUserQuery2(query);
                        }
                    });

                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);//This panel will contain controls for switching on/off channels on the genome browser
                    this.panelControls.setPadding(10);

                    this.createPanelBrowser();

                };


                //Create the genome browser panel
                that.createPanelBrowser = function() {
                    //Browser configuration settings
                    var browserConfig = {
                        serverURL: MetaData.serverUrl,              //Url of the DQXServer instance used
                        database: MetaData.database,                //Database name
                        annotTableName: MetaData.tableAnnotation,   //Name of the table containing the annotation
                        chromoIdField: 'chrom',                      //Specifies that chromosomes are identifier by *numbers* in the field 'chrom'
                                                                    //*NOTE*: chromosome identifiers can be used by specifying chromoIdField: 'chromid'
                        viewID: '',
                        canZoomVert: true                           //Viewer contains buttons to alter the vertical size of the channels
                    };

                    //Initialise a genome browser panel
                    this.panelBrowser = GenomePlotter.Panel(this.frameBrowser, browserConfig);

                    //Define chromosomes
                    $.each(MetaData.chromosomes,function(idx,chromosome) {
                        that.panelBrowser.addChromosome(chromosome.id, chromosome.id, chromosome.len);//provide identifier, name, and size in megabases
                    });

                    this.panelBrowser.getAnnotationFetcher().setFeatureType('gene', 'CDS');


                    //Define the action when a user clicks on a gene in the annotation channel
                    this.panelBrowser.getAnnotationChannel().handleFeatureClicked = function (geneID) {
                        Msg.send({type:'GenePopup'}, geneID);
                    }

                    var ctrl_filtertype = Controls.RadioGroup('', { label:'Filter method', states:[{id:'all', name:'All SNPs'}, {id:'query', name:'Currently query'}], value:'all'}).setOnChanged(function() {
                        that.filterByQuery = (ctrl_filtertype.getValue()=='query');
                        if (that.filterByQuery)
                            that.dataFetcherSNPProperties.setUserQuery2(that.currentUserQuery);
                        else
                            that.dataFetcherSNPProperties.setUserQuery2(null);
                        that.panelBrowser.render();
                    });
                    this.panelControls.addControl(ctrl_filtertype);
                    that.visibilityControlsGroup = this.panelControls.addControl(Controls.CompoundVert([]));



                    that.createSnpPositionChannel();

                    that.reLoad();

                };


                that.onBecomeVisible = function() {
                    that.reLoad();
                }



                //Call this function to jump to & highlight a specific region on the genome
                that.onJumpGenomeRegion = function (context, args) {
                    if ('chromoID' in args)
                        var chromoID = args.chromoID;
                    else {
                        DQX.assertPresence(args, 'chromNr');
                        var chromoID = that.panelBrowser.getChromoID(args.chromNr);
                    }
                    DQX.assertPresence(args, 'start'); DQX.assertPresence(args, 'end');
                    that.activateState();
                    that.panelBrowser.highlightRegion(chromoID, (args.start + args.end) / 2, args.end - args.start);
                };

                //Call this function to jump to & highlight a specific region on the genome
                that.onJumpGenomePosition = function (context, args) {
                    if ('chromoID' in args)
                        var chromoID = args.chromoID;
                    else {
                        DQX.assertPresence(args, 'chromNr');
                        var chromoID = that.panelBrowser.getChromoID(args.chromNr);
                    }
                    DQX.assertPresence(args, 'position');
                    that.activateState();
                    that.panelBrowser.highlightRegion(chromoID, args.position, 0);
                };



                //Creates a channel that shows the SNP positions
                that.createSnpPositionChannel = function() {

                    that.dataFetcherSNPs = new DataFetchers.Curve(
                        MetaData.serverUrl,
                        MetaData.database,
                        'SNP'
                    );

                    var theChannel = ChannelPositions.Channel(null,
                        that.dataFetcherSNPs,   // The datafetcher containing the positions of the snps
                        'snpid'                 // Name of the column containing a unique identifier for each snp
                    );
                    theChannel
                        .setTitle("SNP positions")        //sets the title of the channel
                        .setMaxViewportSizeX(5.0e5);     //if more than 5e5 bases are in the viewport, this channel is not shown
                    theChannel.makeCategoricalColors(//Assign a different color to silent/nonsilent snps
                        'MutType',               // Name of the column containing a categorical string value that determines the color of the snp
                        { 'S' :  DQX.Color(1,1,0) , 'N' : DQX.Color(1,0.4,0) }   //Map of value-color pairs
                    );
                    //Define a custom tooltip
                    theChannel.setToolTipHandler(function(snpid) {
                        return 'SNP: '+snpid;
                    })
                    //Define a function tht will be called when the user clicks a snp
                    theChannel.setClickHandler(function(snpid) {
                        Msg.send({ type: 'SnpPopup' }, snpid);//Send a message that should trigger showing the snp popup
                    })
                    that.panelBrowser.addChannel(theChannel, false);//Add the channel to the browser
                }


                that.reLoad = function() {
                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    if (this.dataFetcherSNPProperties) {//Remove any existing channels
                        $.each(that.currentCustomSnpProperties,function(idx,propid) {
                            that.panelBrowser.delChannel(propid);
                        });
                        that.panelBrowser.delDataFetcher(this.dataFetcherSNPProperties);
                    }

                    //Initialise the data fetcher that will download the data for the table
                    this.dataFetcherSNPProperties = new DataFetchers.Curve(
                        MetaData.serverUrl,
                        MetaData.database,
                        'SNPCMB_'+MetaData.workspaceid
                    );

                    if (that.filterByQuery)
                        this.dataFetcherSNPProperties.setUserQuery2(that.currentUserQuery);

                    //Create a column for each population frequency
                    that.currentCustomSnpProperties = [];
                    that.visibilityControlsGroup.clear();
                    $.each(MetaData.customProperties,function(idx,propInfo) {
                        if ((propInfo.tableid=='SNP') && (propInfo.datatype=='float')) {
                            that.currentCustomSnpProperties.push(propInfo.propid);
                            //Create the channel in the browser that will contain the frequency values
                            var theChannel = ChannelYVals.Channel(propInfo.propid,
                                { minVal: -0.5, maxVal: 1.5 } // range
                            );
                            theChannel
                                .setTitle(propInfo.propid)
                                .setHeight(150,true)
                                .setMaxViewportSizeX(5.0e5)
                                .setChangeYScale(true,true);
                            that.panelBrowser.addChannel(theChannel, false);

                            var plotcomp = theChannel.addComponent(ChannelYVals.Comp(null, that.dataFetcherSNPProperties, propInfo.propid), true);//Create the component
                            plotcomp.myPlotHints.pointStyle = 1;//chose a sensible way of plotting the points
    //                        if (trackInfo.propertyDict.connect)
    //                            plotcomp.myPlotHints.makeDrawLines(1.0e99);
                            var ctrl_onoff = theChannel.createComponentVisibilityControl(propInfo.propid, propInfo.propid, false);
                            that.visibilityControlsGroup.addControl(ctrl_onoff);
                        }
                    });

                    this.panelControls.render();

                    that.panelBrowser.handleResize();
                    that.panelBrowser.setChromosome(MetaData.chromosomes[0].id,true,true);

                }


//                that.addTrack = function() {
//                    var wiz=Wizard.Create('AddTrack', {title:'Add new track', sizeX:400, sizeY: 300});
//
//                    var ctrl_trackFile = Controls.FileUpload(null, { serverUrl: MetaData.serverUrl }).setOnChanged(function() {
//                        if (!ctrl_trackName.getValue())
//                            ctrl_trackName.modifyValue(ctrl_trackFile.getFileName());
//                    });
//                    var ctrl_trackName = Controls.Edit(null, { size: 30 });
//
//                    var controls = Controls.CompoundVert([
//                        ctrl_trackFile,
//                        Controls.CompoundHor([Controls.Static('Track name:'),ctrl_trackName])
//                    ]);
//
//                    wiz.addPage({
//                        id: 'page1',
//                        form: controls,
//                        reportValidationError: function() {
//                            if (!ctrl_trackFile.getValue())
//                                return 'No file uploaded';
//                            if (!ctrl_trackName.getValue())
//                                return 'No track name provided';
//                        }
//                    });
//
//                    wiz.run(function() {
//                        var data={};
//                        data.fileid = wiz.getResultValue(ctrl_trackFile.getID());
//                        data.name = wiz.getResultValue(ctrl_trackName.getID());
//                        data.database = MetaData.database;
//                        data.workspaceid = MetaData.workspaceid;
//                        DQX.setProcessing();
//                        DQX.customRequest(MetaData.serverUrl,'uploadtracks','addtrack',data,function(resp) {
//                            DQX.stopProcessing();
//                            if ('Error' in resp) {
//                                alert(resp.Error);
//                                return;
//                            }
//                            that.loadStatus(function() {
//                                that.editTrack(resp.trackid);
//                            });
//                        });
//                    });
//                }
//
//
//                that.loadStatus = function(proceedFunction) {
//                    var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
//                    // Declare a first table for fetching
//                    getter.addTable('customtracks', ['id','name', 'properties'], 'name',SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid));
//
//                    // Execute the fetching
//                    getter.execute(MetaData.serverUrl,MetaData.database,
//                        function() {
//                            MetaData.tracks = getter.getTableRecords('customtracks');
//                            that.loadStatus_sub1(proceedFunction);
//                        }
//                    );
//
//                }
//
//                that.loadStatus_sub1 = function(proceedFunction) {
//
//                    that.channelControls=[];//this will accumulate the check boxes that control the visibility of channels
//                    that.ctrl_trackAdd = Controls.Button(null, { content: 'Add track...' }).setOnChanged(that.addTrack);
//                    that.channelControls.push(that.ctrl_trackAdd);
//
//                    //Remove any existing channels
//                    $.each(that.fetchers,function(id,fetcher) {
//                        that.panelBrowser.delChannel(id);
//                        that.panelBrowser.delDataFetcher(fetcher);
//                    });
//
//                    that.fetchers={};
//                    $.each(MetaData.tracks,function(idx,trackInfo) {
//                        trackInfo.propertyDict={ minval:0, maxval:1, connect:false, ylines:'' };
//                        if (trackInfo.properties) {
//                            var st = base64.decode(trackInfo.properties);
//                            trackInfo.propertyDict = JSON.parse(st);
//                        }
//                        var dataFetcherSNPs = new DataFetchers.Curve(
//                            MetaData.serverUrl,
//                            MetaData.database,
//                            trackInfo.id
//                        );
//
//                        //Create the channel in the browser that will contain the frequency values
//                        var theChannel = ChannelYVals.Channel(trackInfo.id,
//                            { minVal: trackInfo.propertyDict.minval, maxVal: trackInfo.propertyDict.maxval } // range
//                        );
//                        theChannel
//                            .setTitle(trackInfo.name)
//                            .setHeight(200,true)
//                            .setMaxViewportSizeX(50.0e5)
//                            .setChangeYScale(true,true);
//                        that.panelBrowser.addChannel(theChannel, false);
//
//                        if (trackInfo.propertyDict.ylines) {
//                            $.each(trackInfo.propertyDict.ylines.split(','),function(idx,token) {
//                                theChannel.addComponent(ChannelYVals.YColorZone(null,parseFloat(token),parseFloat(token),DQX.Color(1,0,0)));
//                            });
//                        }
//
//                        var plotcomp = theChannel.addComponent(ChannelYVals.Comp(null, dataFetcherSNPs, trackInfo.id), true);//Create the component
//                        plotcomp.myPlotHints.pointStyle = 1;//chose a sensible way of plotting the points
//                        if (trackInfo.propertyDict.connect)
//                            plotcomp.myPlotHints.makeDrawLines(1.0e99);
//                        that.fetchers[trackInfo.id]=dataFetcherSNPs;
//
//
//
//                        //Define the tooltip shown when a user hovers the mouse over a point in the channel
//                        theChannel.getToolTipContent = function(compID, pointIndex) {
//                            var pos = that.fetchers[compID].getPosition(pointIndex);
//                            var value = that.fetchers[compID].getColumnPoint(pointIndex, compID);
//                            return 'Position= '+pos+'<br/>Value= '+value.toFixed(4);
//                        };
//
//                        //Define the action when a user clicks on a point in the channel
//                        theChannel.handlePointClicked = function(compID, pointIndex) {
//                            var snpid = that.panelBrowser.getCurrentChromoID()+':'+that.fetchers[compID].getPosition(pointIndex);
//                            Msg.send({ type: 'SnpPopup' }, snpid);
//                        };
//
//
//
//                        var ctrl_onoff = theChannel.createComponentVisibilityControl(trackInfo.id, 'Display', false);
//                        var ctrl_del = Controls.Button(null, { content: 'Delete...' }).setOnChanged(function() { that.delTrack(trackInfo.id) });
//                        var ctrl_edit = Controls.Button(null, { content: 'Edit...' }).setOnChanged(function() { that.editTrack(trackInfo.id) });
//
//                        var controlGroup = Controls.CompoundHor([ctrl_onoff, Controls.HorizontalSeparator(30), ctrl_del, Controls.HorizontalSeparator(30), ctrl_edit]);
//                        controlGroup.setLegend('<h3>'+trackInfo.name+'</h3>');
//
//                        that.channelControls.push(controlGroup);
//
//                    })
//
//                    that.panelBrowser.handleResize();
//                    that.panelBrowser.setChromosome(MetaData.chromosomes[0].id,true,true);
//
//                    that.panelControls.clear();
//                    that.panelControls.addControl(Controls.CompoundVert(that.channelControls));
//                    that.panelControls.render();
//                    if (proceedFunction) proceedFunction();
//                }
//
//
//                that.delTrack = function(trackid) {
//                    var trackInfo=null;
//                    $.each(MetaData.tracks,function(idx,trackinf) {
//                        if (trackinf.id==trackid)
//                            trackInfo = trackinf;
//                    });
//
//                    if (confirm('Are you sure you want to permanently delete track "{name}"'.DQXformat({name:trackInfo.name}))) {
//                        var data = {database:MetaData.database, workspaceid: MetaData.workspaceid, trackid:trackid };
//                        DQX.customRequest(MetaData.serverUrl,'uploadtracks','deltrack',data,function() {
//                            that.loadStatus();
//                        })
//                    }
//                }
//
//                that.editTrack = function(trackid) {
//                    var trackInfo=null;
//                    $.each(MetaData.tracks,function(idx,trackinf) {
//                        if (trackinf.id==trackid)
//                            trackInfo = trackinf;
//                    });
//
//                    var wiz=Wizard.Create('EditTrack', {title:'Edit track', sizeX:400, sizeY: 400});
//
//                    var ctrl_trackName = Controls.Edit(null, { size: 30 });
//                    ctrl_trackName.modifyValue(trackInfo.name);
//
//                    var ctrl_minval = Controls.Edit(null, { size: 10, value:trackInfo.propertyDict.minval });
//                    var ctrl_maxval = Controls.Edit(null, { size: 10, value:trackInfo.propertyDict.maxval });
//
//                    var ctrl_ylines = Controls.Edit(null, { size: 30, value:trackInfo.propertyDict.ylines });
//
//                    var ctrl_connect = Controls.Check(null, { label:'Connect points', value:trackInfo.propertyDict.connect });
//
//                    var controls = Controls.CompoundVert([
//                        Controls.CompoundHor([Controls.Static('Track name:'),ctrl_trackName]),
//                        Controls.VerticalSeparator(15),
//                        Controls.CompoundHor([Controls.Static('Min value:'),ctrl_minval]),
//                        Controls.VerticalSeparator(15),
//                        Controls.CompoundHor([Controls.Static('Max value:'),ctrl_maxval]),
//                        Controls.VerticalSeparator(15),
//                        Controls.CompoundHor([Controls.Static('Y value lines (comma separated) :'),ctrl_ylines]),
//                        Controls.VerticalSeparator(15),
//                        ctrl_connect
//                    ]);
//
//                    wiz.addPage({
//                        id: 'page1',
//                        form: controls,
//                        reportValidationError: function() {
//                        }
//                    });
//
//                    wiz.run(function() {
//
//                        var props={
//                            minval:wiz.getResultValue(ctrl_minval.getID()),
//                            maxval:wiz.getResultValue(ctrl_maxval.getID()),
//                            connect:wiz.getResultValue(ctrl_connect.getID()),
//                            ylines:wiz.getResultValue(ctrl_ylines.getID())
//                        };
//
//                        var data={};
//                        data.workspaceid = MetaData.workspaceid;
//                        data.trackid = trackInfo.id;
//                        data.name = wiz.getResultValue(ctrl_trackName.getID());
//                        data.database = MetaData.database;
//                        data.properties = base64.encode(JSON.stringify(props));
//                        DQX.setProcessing();
//                        DQX.customRequest(MetaData.serverUrl,'uploadtracks','modifytrack',data,function(resp) {
//                            DQX.stopProcessing();
//                            that.loadStatus();
//                        });
//                    });
//
//
//                }


                return that;
            }

        };

        return GenomeBrowserModule;
    });