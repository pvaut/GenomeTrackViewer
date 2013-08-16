
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






require(["jquery", "DQX/Application", "DQX/Framework", "DQX/Msg", "DQX/Utils", "DQX/DataFetcher/DataFetchers", "MetaData", "Views/Intro", "Views/GenomeBrowser", "Views/TableViewer", "InfoPopups/GenePopup", "InfoPopups/SnpPopup" ],
    function ($, Application, Framework, Msg, DQX, DataFetchers, MetaData, Intro, GenomeBrowser, TableViewer, GenePopup, SnpPopup) {
        $(function () {

            GenePopup.init();
            SnpPopup.init();

            // Initialise all the views in the application
            //Intro.init();
            GenomeBrowser.init();
            TableViewer.init();

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
                        //MetaData.tracks = getter.getTableRecords('customtracks');
                        proceedFunction();
                    }
                );
            }


            //Initialise the application
            Application.init('Test application');


        });
    });
