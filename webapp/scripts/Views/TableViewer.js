define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/SQL", "DQX/QueryTable", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers", "MetaData"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, SQL, QueryTable, QueryBuilder, DataFetchers, MetaData) {

        //A helper function, turning a fraction into a 3 digit text string
        var funcFraction2Text = function(vl) {
            if (vl==null)
                return '-'
            else
                return parseFloat(vl).toFixed(3);
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

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'tableviewer',  // View ID
                    'Table viewer'  // View title
                );

                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
                    this.frameQueriesContainer = rootFrame.addMemberFrame(Framework.FrameGroupTab('', 0.4));//Create frame that will contain the query panels
                    this.frameQueryAdvanced = this.frameQueriesContainer.addMemberFrame(Framework.FrameFinal(''))
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
                        MetaData.serverUrl,     //url of the DQXServer instance providing the data
                        MetaData.database,      //name of the database
                        'comb'   //name of the table containing the data
                    );
                    this.theTableFetcher.showDownload=true; //Allows the user to download the data in the table

                    this.createPanelTableViewer();

                    // Define an "advanced query" panel
                    this.panelTable.createPanelAdvancedQuery(this.frameQueryAdvanced);

                    // Create the "simple query" panel
                    this.createPanelSimpleQuery();

                    //Make sure that the query results are reset each time another type of query is chosen
                    Msg.listen('',{ type: 'ChangeTab', id: this.frameQueriesContainer.getFrameID() }, function() {
                        that.panelTable.invalidateQuery();
                    });


                };

                //Create the table viwer panel
                that.createPanelTableViewer = function () {
                    //Initialise the panel that will contain the table
                    this.panelTable = QueryTable.Panel(
                        this.frameTable,        // Frame this panel should be located in
                        this.theTableFetcher,   // Datafetcher that downloads the table info
                        {
                            leftfraction: 50    // Max size (in %) of the left, non-scrolling component of the table
                        }
                    );
                    this.myTable = this.panelTable.getTable();// A shortcut variable

                    // Add a column for chromosome
                    var comp = that.myTable.createTableColumn(
                        QueryTable.Column(
                            "Chrom.",       // Display name of the column
                            "chrom",        // ID (=Column name in the database table
                            0),             // Table part (1=right, scrolling)
                        "String",              // Transfer encoding: integer (see DataFetchers.CurveColumn for possible choices)
                        false               // Column is not sortable by itself (sorted via joint statement chrom+pos)
                    );
/*                    comp.CellToText = function(nr) {
                        return MetaData.chromosomes[nr-1].id;
                    }; // Converts the number to a chromosome name*/

                    // For the query tools, define this column as a multiple choice set
                    var chromPickList = [];
                    $.each(MetaData.chromosomes,function(idx,chrom) {
                        chromPickList.push({ id: idx+1, name: MetaData.chromosomes[idx].id });
                    })
                    //comp.setDataType_MultipleChoiceInt(chromPickList);

                    // Add a column for position
                    var comp = that.myTable.createTableColumn(QueryTable.Column("Position.","pos",0),"IntB64",false);
                    that.myTable.addSortOption("Position", SQL.TableSort(['chrom', 'pos'])); // Define a joint sort action on both columns chrom+pos


                    // Add a column for the SNP identifier
                    // NOTE: this is a more standard way of adding a table column
                    var comp = that.myTable.createTableColumn(QueryTable.Column("SNP ID","snpid",1),"String",true);
                    comp.setToolTip('SNP identifier');  // Hover tooltip
                    // Define a handler that will be called when a user clicks this column (note: this will turn this field into a hyperlink)
                    comp.setCellClickHandler(function(fetcher,downloadrownr) {
                        var snpid = fetcher.getColumnPoint(downloadrownr, 'snpid');  // get the snp id from the datafetcher
                        Msg.send({ type: 'ShowSNPPopup' }, snpid); // Send a message that should trigger showing the snp popup
                    })

                    //Create a column for each population frequency
                    $.each(['prop0', 'prop1', 'prop2', 'prop3', 'prop4'],function(idx,fld) {
                        var col = that.myTable.createTableColumn(
                            QueryTable.Column(
                                fld,       //Name of the column
                                fld,       //Id of the column in the database table
                                1),               //Table part (1=right, scrolling)
                            "Float3",             //Transfer encoding: float encoded in 3 base64 characters
                            true                  // Column is sortable
                        );
                        //col.setToolTip(pop.name); //Provide a tool tip for the column
                        //Define a callback when the user clicks on a column
                        col.setHeaderClickHandler(function(id) {
                            alert('column clicked '+id);
                        })
                        col.CellToText = funcFraction2Text //Show the frequency value with a fixed 3 digit format
                        col.CellToColor = funcFraction2Color; //Create a background color that reflects the value
                    })

                    //Add some  more columns
                    that.myTable.createTableColumn(QueryTable.Column("Gene description","GeneDescription",1),"String",true);
                    that.myTable.createTableColumn(QueryTable.Column("Mut type","MutType",1),"String",true);
                    that.myTable.createTableColumn(QueryTable.Column("Mut name","MutName",1),"String",true);
                                        //we start by defining a query that returns everything
                    that.myTable.queryAll();

                };


                that.createPanelSimpleQuery = function () {
                    this.panelSimpleQuery = Framework.Form(this.frameQuerySimple);
                    this.panelSimpleQuery.setPadding(10);
                    var theForm=this.panelSimpleQuery;

                }



                return that;
            }

        };

        return TableViewerModule;
    });