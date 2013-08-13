define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "MetaData"],
    function (require, Application, Framework, Controls, Msg, DocEl, DQX, MetaData) {

        var IntroModule = {

            init: function () {
                // Instantiate the view object
                var that = Application.View(
                    'start',        // View ID
                    'Start page'    // View title
                );

                //This function is called during the initialisation. Create the frame structure of the view here
                that.createFrames = function(rootFrame) {
                    rootFrame.makeFinal();//We have a single frame, no subdivisions
                    that.rootFrame=rootFrame;//Remember that frame for when we need to define the panel for it
                }

                // This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    //Create a single panel of the type 'form'. This is the start screen, and we will populate this with a number of buttons starting specific actions
                    this.panelForm = Framework.Form(this.rootFrame);
                    this.panelForm.setPadding(10);


                    that.ctrl_trackFile = Controls.FileUpload(null, {
                        serverUrl: MetaData.serverUrl               // Url of the server where DQXServer is running
                    });
                    that.ctrl_trackFile.setOnChanged(function() { // Callback when a file is uploaded
                        //alert('File uploaded to server file. Server file ID = '+that.ctrl_trackFile.getValue());
                    });

                    that.ctrl_trackName = Controls.Edit(null, { size: 30 });

                    that.ctrl_trackAdd = Controls.Button(null, { content: 'Add track' }).setOnChanged(that.addTrack);

                    var newTrackForm = Controls.CompoundVert([
                        that.ctrl_trackFile,
                        Controls.CompoundHor([Controls.Static('Track name:'),that.ctrl_trackName]),
                        that.ctrl_trackAdd
                    ]);
                    newTrackForm.setLegend('New track').setAutoFillX(false);




                    var browserButton = Application.getView('genomebrowser').createActivationButton({
                        content: "Genome browser",
                        bitmap: 'Bitmaps/circle_red_small.png'
                    });


                    this.panelForm.addControl(Controls.CompoundVert([ newTrackForm, browserButton ]));

//                    var buttonRows =[]; // Each element in this array will contain a row of buttons
//                    buttonRows.push(this.createViewButtons()); // Creates the row containing the buttons that will activate the different views in the app
//                    buttonRows.push(this.createMiscButtons()); // Creates the row containing a misc set of other buttons
//                    this.panelForm.addControl(Controls.CompoundVert(buttonRows)); // Add the rows of controls using a vertical stacker compound control
                }


                that.addTrack = function() {
                    if (!that.ctrl_trackFile.getValue()) {
                        alert('No file has been provided');
                        return;
                    }

                    var data={};
                    data.fileid = that.ctrl_trackFile.getValue();
                    data.name = that.ctrl_trackName.getValue();
                    data.database = MetaData.database;
                    DQX.customRequest(MetaData.serverUrl,'uploadtracks','addtrack',data,function(resp) {
                        alert(JSON.stringify(resp));
                    });

                }

/*
                that.createViewButtons = function() {
                    var viewButtons = [];

                    viewButtons.push(
                        Application.getView('genomebrowser').createActivationButton({       // View ID
                            content: "Genome browser",                                      // Button text
                            bitmap: 'Bitmaps/circle_red_small.png'                          // Button bitmap
                        }));

                    viewButtons.push(
                        Application.getView('tableviewer').createActivationButton({
                            content: "Table viewer",
                            bitmap: 'Bitmaps/circle_red_small.png'
                        }));

                    // Return a horizontal row containing the view buttons
                    return Controls.CompoundHor(viewButtons);
                }


                that.createMiscButtons = function() {
                    var buttons = [];

                    // Add a button that creates a popup frame demo
                    var bt = Controls.Button(null, {
                        buttonClass: 'DQXToolButton2',
                        content: "Popup frame demo",
                        bitmap:'Bitmaps/circle_blue_small.png',
                        width:120, height:50
                    });
                    bt.setOnChanged(function() { // Define an event handler called when the user clicks this button
                        Msg.send({ type: // Send a message. The event listener for this message will react by showing the popup
                            'ShowPopupFrameDemo' // Message ID
                        });
                    })
                    buttons.push(bt);

                    // Add a button that creates a wizard demo
                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Wizard demo", bitmap:'Bitmaps/circle_blue_small.png', width:120, height:50 });
                    bt.setOnChanged(function() {
                        Msg.send({ type: 'ShowWizardDemo' });
                    })
                    buttons.push(bt);

                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Post test", bitmap:'Bitmaps/circle_blue_small.png', width:120, height:50 });
                    bt.setOnChanged(function() {
                        var datastring='';
                        for (var i=0; i<1500; i++)
                            datastring+='AC01';
                        DQX.serverDataStore(MetaData.serverUrl,datastring,function(id) {
                            DQX.serverDataFetch(MetaData.serverUrl,id,function(content) {
                                alert('content length: '+content.length);
                            });
                        });
                    })
                    buttons.push(bt);


                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Test custom action", bitmap:'Bitmaps/circle_blue_small.png', width:120, height:50 });
                    bt.setOnChanged(function() {
                        var datastring='';
                        for (var i=0; i<1500; i++)
                            datastring+='AC01';
                        DQX.customRequest(
                            MetaData.serverUrl,
                            'uploadtracks',
                            'test',
                            {a:1,b:2},
                            function(resp) {
                                alert(JSON.stringify(resp));
                            }
                        );
                    })
                    buttons.push(bt);


                    // Return a horizontal row containing the buttons
                    return Controls.CompoundHor(buttons);
                }
*/

                return that;
            }

        };

        return IntroModule;
    });