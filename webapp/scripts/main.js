
//Versionstring is supposed to be defined in main.html
//It is used to differentiate different versions, preventing them from being cached
if (typeof versionString == 'undefined')
    alert('Fatal error: versionString is missing');

//Configuration of require.js
require.config({
    baseUrl: "scripts",
    paths: {
        jquery: "DQX/Externals/jquery",
        d3: "DQX/Externals/d3",
        handlebars: "DQX/Externals/handlebars",
        markdown: "DQX/Externals/markdown",
        DQX: "DQX"
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        handlebars: {
            exports: 'Handlebars'
        }
    },
    waitSeconds: 15,
    urlArgs: "version="+versionString
});






require(["jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/SQL", "DQX/DataFetcher/DataFetchers", "MetaData", "Views/Intro", "Views/GenomeBrowser", "Views/TableViewer", "InfoPopups/GenePopup", "InfoPopups/ItemPopup", "Wizards/PromptWorkspace" ],
    function ($, Application, Framework, Msg, DQX, SQL, DataFetchers, MetaData, Intro, GenomeBrowser, TableViewer, GenePopup, ItemPopup, PromptWorkspace) {
        $(function () {

            var getter = DataFetchers.ServerDataGetter();
            getter.addTable('tablecatalog',['id','name','primkey'],'id');
            getter.execute(MetaData.serverUrl,MetaData.database,
                function() { // Upon completion of data fetching
                    MetaData.tableCatalog = getter.getTableRecords('tablecatalog');
                    MetaData.mapTableCatalog = {};
                    $.each(MetaData.tableCatalog, function(idx, table) {
                        MetaData.mapTableCatalog[table.id] = table;
                    });

                    GenePopup.init();
                    ItemPopup.init();

                    // Initialise all the views in the application
                    Intro.init();
                    GenomeBrowser.init();
                    $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                        TableViewer.init(tableInfo.id);
                        tableInfo.tableViewId = 'table_'+tableInfo.id;
                    })

                    // Create a custom 'navigation button' that will appear in the right part of the app header
                    Application.addNavigationButton('Test','Bitmaps/Icons/Small/MagGlassG.png', 80, function(){
                        alert('Navigation button clicked');
                    });


                    //Define the header content (visible in the top-left corner of the window)
                    Application.setHeader('<a href="http://www.malariagen.net" target="_blank"><img src="Bitmaps/malariagen_logo.png" alt="MalariaGEN logo" align="top" style="border:0px;margin:7px"/></a>');


                    //Provide a hook to fetch some data upfront from the server. Upon completion, 'proceedFunction' should be called;
                    Application.customInitFunction = function(proceedFunction) {
                        // Here, we will fetch the full data of a couple of tables on the servers proactively
                        var getter = DataFetchers.ServerDataGetter();//Instantiate the fetcher object
                        // Declare a first table for fetching
                        /*                getter.addTable(
                         'customtracks',
                         [
                         'id',
                         'name'
                         ],
                         'name'
                         );*/

                        // Execute the fetching
                        getter.execute(
                            MetaData.serverUrl,
                            MetaData.database,
                            function() {
                                PromptWorkspace.execute(proceedFunction);
                                //MetaData.tracks = getter.getTableRecords('customtracks');
                            }
                        );
                    }


                    //Initialise the application
                    Application.init('Test application');


                    Application.getChannelInfo = function(proceedFunction) {
                        var getter = DataFetchers.ServerDataGetter();
                        getter.addTable('propertycatalog',['propid','datatype','tableid','source','name', 'settings'],'ordr',
                            SQL.WhereClause.OR([SQL.WhereClause.CompareFixed('workspaceid','=',MetaData.workspaceid),SQL.WhereClause.CompareFixed('workspaceid','=','')])
                            );
                        getter.execute(MetaData.serverUrl,MetaData.database,
                            function() { // Upon completion of data fetching
                                MetaData.customProperties = getter.getTableRecords('propertycatalog');
                                $.each(MetaData.customProperties, function(idx, prop) {
                                    prop.isCustom = (prop.source=='custom');
                                    if (prop.datatype=='Value')
                                        prop.isFloat = true;
                                    if (!prop.name) prop.name = prop.propid;
                                    var settings = { showInTable: true, showInBrowser: false, channelName: '', channelColor:'rgb(0,0,0)', connectLines: false };
                                    if (prop.isFloat) {
                                        settings.showInBrowser = true;
                                        settings.minval = 0;
                                        settings.maxval = 1;
                                        settings.decimDigits = 2;
                                    };
                                    if (prop.propid == MetaData.mapTableCatalog[prop.tableid].primkey)
                                        prop.isPrimKey = true;
                                    if (prop.settings)
                                        settings = $.extend(settings,JSON.parse(prop.settings));
                                    prop.settings = settings;
                                });
                                if (proceedFunction) proceedFunction();
                            }
                        );
                    }


                });




        });
    });
