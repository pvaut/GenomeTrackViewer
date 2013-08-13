define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var GenomeBrowserModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'genomebrowser',    // View ID
                    'Genome browser'    // View title
                );



                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));//Create frame that will contain the controls panel
                    this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7));//Create frame that will contain the genome browser panel
                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelControls = Framework.Form(this.frameControls);//This panel will contain controls for switching on/off channels on the genome browser
                    this.channelControls=[];//this will accumulate the check boxes that control the visibility of channels
                    this.createPanelBrowser();
                    that.panelControls.addControl(Controls.CompoundVert(this.channelControls));//Add the controls to the form, as a vertical stack
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
                    //NOTE: the annotation table should have the following fields:
                    //    chromid: (varchar) identifier of the chromosome
                    //    fstart,fstop: (int) start & stop of the feature
                    //    fid: (varchar) feature identifier
                    //    ftype: (varchar) feature type identifier, can be 'gene' or 'exon'
                    //    fparentid: (varchar) in case of exon, identifier of the feature it belongs to
                    //    fname: (varchar) display name of the feature
                    //    fnames: (varchar) ;-separated list of alternative names (may be empty)
                    //    descr: (varchar) description of the gene (may be empty)

                    //Initialise a genome browser panel
                    this.panelBrowser = GenomePlotter.Panel(this.frameBrowser, browserConfig);

                    //Define chromosomes
                    $.each(MetaData.chromosomes,function(idx,chromosome) {
                        that.panelBrowser.addChromosome(chromosome.id, chromosome.id, chromosome.len);//provide identifier, name, and size in megabases
                    });

                    this.panelBrowser.getAnnotationFetcher().setFeatureType('gene', 'CDS');


                    //Define the action when a user clicks on a gene in the annotation channel
                    this.panelBrowser.getAnnotationChannel().handleFeatureClicked = function (geneID) {
                        alert('Clicked on gene '+geneID);
                    }

                    //Create the data fetcher that will get the frequency values from the server
                    //NOTE: the values table should have the following fields:
                    //        chrom: (int) index number of the chromosome (1-based) (note: this can be changed to chromosome id strings by changing the browser configuration
                    //        pos: (int) position in bp on the chromosome (1-based)
                    //        various values to be plotted (float)
                    this.dataFetcherSNPs = new DataFetchers.Curve(
                        MetaData.serverUrl,     //url of the DQXServer instance providing the data
                        MetaData.database,      //name of the database
                        'TRc4b81cf4_0433_11e3_933c_180373dac87c'   //name of the table containing the data
                    );

                    //add snpid column to the datafetcher, not plotted but needed for the tooltip & click actions
//                    this.dataFetcherSNPs.addFetchColumnActive("snpid", "String");

                    //Fill with channels

                    //Define a channel displaying the reference sequence
//                    this.panelBrowser.addChannel(ChannelSequence.Channel(MetaData.serverUrl, MetaData.summaryFolder+'/'+'Sequence', 'Summ01'), true);

//                    that.createSnpPositionChannel();
                    that.createFrequencyChannels();
//                    that.createSummaryChannels();
                };

                //Creates a channel that shows the SNP positions
                that.createSnpPositionChannel = function() {
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
                        Msg.send({ type: 'ShowSNPPopup' }, snpid);//Send a message that should trigger showing the snp popup
                    })
                    that.panelBrowser.addChannel(theChannel, false);//Add the channel to the browser
                }

                //Creates the channel in the browser that displays allele frequencies
                that.createFrequencyChannels = function() {

                    //Create the channel in the browser that will contain the frequency values
                    var theChannel = ChannelYVals.Channel(null, { minVal: 0, maxVal: 1 });
                    theChannel
                        .setTitle("Frequencies")        //sets the title of the channel
                        .setHeight(120)                 //sets the height of the channel, in pixels
                        .setMaxViewportSizeX(5.0e5)     //if more than 5e5 bases are in the viewport, this channel is not shown
                        .setChangeYScale(false,true);   //makes the scale adjustable by dragging it
                    that.panelBrowser.addChannel(theChannel, false);//Add the channel to the browser

                    var plotcomp = theChannel.addComponent(ChannelYVals.Comp(null, that.dataFetcherSNPs, 'value'), true);//Create the component
                    //plotcomp.myPlotHints.color = population.color;//define the color of the component
                    plotcomp.myPlotHints.pointStyle = 1;//chose a sensible way of plotting the points
                    //that.channelControls.push(theChannel.createComponentVisibilityControl(population.freqid, population.name, true));//Create a visibility checkbox for the component, and add to the list of controls
                }




                //Creates channels in the browser that displaying various summary properties
                that.createSummaryChannels = function() {
                    //Create the data fetcher that will get the summary values from the server
                    this.dataFetcherProfiles = new DataFetcherSummary.Fetcher(
                        MetaData.serverUrl,     //url of the DQXServer instance providing the data
                        1,                      //minimum block size of the finest grained block
                        800                     //desired number of data points filling the viewport
                    );

                    //Iterate over all summary profiles shown by the app
                    $.each(MetaData.summaryProfiles,function(idx,profile) {
                        var folder=MetaData.summaryFolder+'/'+profile.id;//The server folder where to find the info, relative to the DQXServer base path
                        var SummChannel = ChannelYVals.Channel(null, { minVal: 0, maxVal: 100 });//Create the channel
                        SummChannel
                            .setTitle(profile.name).setHeight(120, true)
                            .setChangeYScale(true,true);//makes the scale adjustable by dragging it
                        that.panelBrowser.addChannel(SummChannel);//Add the channel to the browser
                        that.channelControls.push(SummChannel.createVisibilityControl());//Create a visibility checkbox for the component, and add to the list of controls

                        //Create the min-max range
                        var colinfo_min = that.dataFetcherProfiles.addFetchColumn(folder, MetaData.summaryConfig, profile.id + "_min");//get the min value from the fetcher
                        var colinfo_max = that.dataFetcherProfiles.addFetchColumn(folder, MetaData.summaryConfig, profile.id + "_max");//get the max value from the fetcher
                        SummChannel.addComponent(ChannelYVals.YRange(null,//Define the range component
                            that.dataFetcherProfiles,               // data fetcher containing the profile information
                            colinfo_min.myID,                       // fetcher column id for the min value
                            colinfo_max.myID,                       // fetcher column id for the max value
                            DQX.Color(0.3, 0.3, 0.7, 0.35)          // color of the range
                        ), true );

                        //Create the average value profile
                        var colinfo_avg = that.dataFetcherProfiles.addFetchColumn(folder, MetaData.summaryConfig, profile.id + "_avg");//get the avg value from the fetcher
                        var comp = SummChannel.addComponent(ChannelYVals.Comp(null,//Add the profile to the channel
                            that.dataFetcherProfiles,               // data fetcher containing the profile information
                            colinfo_avg.myID                        // fetcher column id containing the average profile
                        ), true);
                        comp.setColor(DQX.Color(0, 0, 0.5));//set the color of the profile
                        comp.myPlotHints.makeDrawLines(3000000.0); //that causes the points to be connected with lines
                        comp.myPlotHints.interruptLineAtAbsent = true;
                        comp.myPlotHints.drawPoints = false;//only draw lines, no individual points

                    })

                }


                return that;
            }

        };

        return GenomeBrowserModule;
    });