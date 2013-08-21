define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Popup", "DQX/DocEl", "DQX/Utils", "MetaData", "Wizards/UploadSNPProperties"],
    function (require, Application, Framework, Controls, Msg, Popup, DocEl, DQX, MetaData, UploadSNPProperties) {


        waitForCompletion = function(calculationid, onCompleted, initialResponse) {
            var popupid = Popup.create('Processing','Server is processing. This may take a while!<p><div id="calculationprogressbox" style="min-width:400px"></div><p>', null, {canClose: false} );
            var poll = function() {
                data = {};
                DQX.customRequest(MetaData.serverUrl, 'uploadtracks', 'querycalculation', { calculationid: calculationid }, function(resp) {
                    if (resp.failed) {
                        alert(resp.status);
                        DQX.ClosePopup(popupid);
                    }
                    else {
                        if (resp.completed) {
                            DQX.ClosePopup(popupid);
                            if (onCompleted)
                                onCompleted(initialResponse);
                        }
                        else {
                            var str = resp.status;
                            if (resp.progress)
                                str+=' ('+(100*resp.progress).toFixed(0)+'%)';
                            $('#calculationprogressbox').html('<h3>'+str+'</h3>');
                            setTimeout(poll, 1000);
                        }
                    }
                });
            };
            poll();
        }

        asyncRequest = function(request, data, onCompleted) {
            DQX.customRequest(MetaData.serverUrl,'uploadtracks',request,data,function(resp) {
                waitForCompletion(resp.calculationid, onCompleted, resp);
            });
        }


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
                        asyncRequest('testasync', {}, function() {
                            alert("It's done!");
                        });
                    })

                    var bt_addsnpprops = Controls.Button(null, { content: 'Upload SNP properties...'});
                    bt_addsnpprops.setOnChanged(function() {
                        UploadSNPProperties.execute(function() {});
                    })



                    this.panelForm.addControl(Controls.CompoundVert([
                        Controls.CompoundHor([browserButton, tableViewerButton]) ,
                        Controls.CompoundHor([bt, bt_addsnpprops])
                    ]));

                }



                return that;
            }

        };

        return IntroModule;
    });