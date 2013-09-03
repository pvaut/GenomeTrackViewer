define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "MetaData"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, SQL, QueryTable, QueryBuilder, DataFetchers, MetaData) {

        //A helper function, turning a fraction into a 3 digit text string
        var createFuncVal2Text = function(digits) {
            return function(vl) {
                if (vl==null)
                    return '-';
                else
                    return parseFloat(vl).toFixed(digits);
            }
        }

        //A helper function, turning a fraction into a color string
        var funcFraction2Color = function (vl) {
            if (vl == null)
                return "white";
            else {
                vl=parseFloat(vl);
                var vl = Math.abs(vl);
                vl = Math.min(1, vl);
                if (vl > 0) vl = 0.05 + vl * 0.95;
                vl = Math.sqrt(vl);
                var b = 255 ;
                var g = 255 * (1 - 0.3*vl * vl);
                var r = 255 * (1 - 0.6*vl);
                return "rgb(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ")";
            }
        };




        var TableViewerModule = {

            init: function (tableid) {
                // Instantiate the view object
                var that = Application.View(
                    'table_'+tableid,  // View ID
                    'Table viewer'  // View title
                );

                that.tableid = tableid;

                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameQueriesContainer = rootFrame.addMemberFrame(Framework.FrameGroupTab('', 0.4));//Create frame that will contain the query panels
                    this.frameQueryAdvanced = this.frameQueriesContainer.addMemberFrame(Framework.FrameFinal('')).setAllowScrollBars(true,true)
                        .setDisplayTitle('Advanced query');//Create frame that will contain the query panels
                    this.frameQuerySimple = this.frameQueriesContainer.addMemberFrame(Framework.FrameFinal(''))
                        .setDisplayTitle('Simple query');//Create frame that will contain the query panels
                    this.frameTable = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.6))//Create frame that will contain the table viewer
                        .setAllowScrollBars(false,true);
                }



                //This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {

                    //Initialise the data fetcher that will download the data for the table
                    this.theTableFetcher = DataFetchers.Table(
                        MetaData.serverUrl,
                        MetaData.database,
                        that.tableid + 'CMB_' + MetaData.workspaceid
                    );
                    this.theTableFetcher.showDownload=true; //Allows the user to download the data in the table

                    this.createPanelTableViewer();


                    this.reLoad();

                    // Create the "simple query" panel
                    this.createPanelSimpleQuery();

                    //Make sure that the query results are reset each time another type of query is chosen
                    Msg.listen('',{ type: 'ChangeTab', id: this.frameQueriesContainer.getFrameID() }, function() {
                        that.panelTable.invalidateQuery();
                    });

                };

                that.onBecomeVisible = function() {
                    that.reLoad();
                }

                //Create the table viwer panel
                that.createPanelTableViewer = function () {
                    //Initialise the panel that will contain the table
                    this.panelTable = QueryTable.Panel(
                        this.frameTable,
                        this.theTableFetcher,
                        { leftfraction: 50 }
                    );
                    this.myTable = this.panelTable.getTable();// A shortcut variable

                    // Add a column for chromosome
                    var comp = that.myTable.createTableColumn(
                        QueryTable.Column("Chrom.","chrom",0),
                        "String",
                        false
                    );

                    // For the query tools, define this column as a multiple choice set
                    var chromPickList = [];
                    $.each(MetaData.chromosomes,function(idx,chrom) {
                        chromPickList.push({ id: idx+1, name: MetaData.chromosomes[idx].id });
                    })
                    //comp.setDataType_MultipleChoiceInt(chromPickList);

                };


                that.createPanelSimpleQuery = function () {
                    this.panelSimpleQuery = Framework.Form(this.frameQuerySimple);
                    this.panelSimpleQuery.setPadding(10);
                }

                that.reLoad = function() {
                    var tableInfo = MetaData.mapTableCatalog[that.tableid];

                    if (that.uptodate)
                        return;
                    that.uptodate = true;

                    this.theTableFetcher.resetAll();
                    that.myTable.clearTableColumns();

                    // Add a column for chromosome
//                    var comp = that.myTable.createTableColumn(QueryTable.Column("Chrom.","chrom",0),"String",false);

                    // Add a column for position
//                    var comp = that.myTable.createTableColumn(QueryTable.Column("Position.","pos",0),"IntB64",false);
//                    that.myTable.addSortOption("Position", SQL.TableSort(['chrom', 'pos'])); // Define a joint sort action on both columns chrom+pos


                    //Create a column for each population frequency
                    $.each(MetaData.customProperties,function(idx,propInfo) {
                        if ((propInfo.tableid == that.tableid) && (propInfo.settings.showInTable)) {
                            var encoding  = 'String';
                            //var encoding  = 'Generic';
                            var tablePart = 1;
                            if (propInfo.datatype=='Value') {
                                encoding  = 'Float3';
                            }
                            if (propInfo.datatype=='Boolean') {
                                encoding  = 'Int';
                            }
                            if (propInfo.isPrimKey)
                                tablePart = 0;
                            var col = that.myTable.createTableColumn(
                                QueryTable.Column(
                                    propInfo.name,propInfo.propid,tablePart),
                                encoding,
                                true
                            );

                            if (propInfo.datatype=='Boolean') {
                                col.setDataType_MultipleChoiceInt([{id:0, name:'No'}, {id:1, name:'Yes'}]);
                            }

                            //col.setToolTip(pop.name); //Provide a tool tip for the column
                            //Define a callback when the user clicks on a column
                            col.setHeaderClickHandler(function(id) {
                                alert('column clicked '+id);
                            })

                            if (propInfo.isPrimKey) {
                                col.setCellClickHandler(function(fetcher,downloadrownr) {
                                    var itemid=that.panelTable.getTable().getCellValue(downloadrownr,propInfo.propid);
                                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableid, itemid: itemid } );
                                })
                            }

                            if (propInfo.isFloat) {
                                col.CellToText = createFuncVal2Text(propInfo.settings.decimDigits);
                                col.CellToColor = funcFraction2Color; //Create a background color that reflects the value
                            }
                            if (propInfo.isBoolean) {
                                col.CellToText = function(vl) { return vl?'Yes':'No'; };
                                col.CellToColor = function(vl) { return vl?DQX.Color(0.75,0.85,0.75):DQX.Color(1.0,0.9,0.8); }
                            }
                        }
                    });

                    //we start by defining a query that returns everything
                    that.myTable.queryAll();

                    // Define an "advanced query" panel
                    this.panelTable.createPanelAdvancedQuery(this.frameQueryAdvanced, function() {
                        var theQuery = that.panelTable.panelAdvancedQueryBuilder.getQuery();
                        if (theQuery.isTrivial)
                            theQuery = null;
                        MetaData.mapTableCatalog[that.tableid].currentQuery = theQuery;
                        Msg.send({ type: 'QueryChanged'}, that.tableid );
                    });

                }



                return that;
            }

        };

        return TableViewerModule;
    });