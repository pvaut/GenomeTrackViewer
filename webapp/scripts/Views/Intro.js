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



                    var browserButton = Application.getView('genomebrowser').createActivationButton({
                        content: "Genome browser",
                        bitmap: 'Bitmaps/circle_red_small.png'
                    });

                    var tableViewerButton = Application.getView('tableviewer').createActivationButton({
                        content: "Table viewer",
                        bitmap: 'Bitmaps/circle_red_small.png'
                    });

                    var bt = Controls.Button(null, { content: 'test async'});
                    bt.setOnChanged(function() {
                        data = {};
                        DQX.customRequest(MetaData.serverUrl,'uploadtracks','testasync',data,function(resp) {
                            alert(JSON.stringify(resp));
                        });
                    })


                    this.panelForm.addControl(Controls.CompoundVert([
                        Controls.CompoundHor([browserButton, tableViewerButton]) ,
                        bt
                    ]));

                }



                return that;
            }

        };

        return IntroModule;
    });