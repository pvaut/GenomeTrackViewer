define(["require", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Popup", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/DataFetcher/DataFetchers", "DQX/SQL", "MetaData", "Wizards/UploadSNPProperties", "Wizards/EditSNPProperty"],
    function (require, Application, Framework, Controls, Msg, Popup, DocEl, DQX, FrameTree, DataFetchers, SQL, MetaData, UploadSNPProperties, EditSNPProperty) {

        ////////////// Utilities for async server communication in case of lengthy operations

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
                    rootFrame.makeGroupHor();

                    this.frameButtons = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));
                    this.frameChannels = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.7)).setDisplayTitle("Workspace overview");
                }

                // This function is called during the initialisation. Create the panels that will populate the frames here
                that.createPanels = function() {
                    this.panelButtons = Framework.Form(this.frameButtons);
                    this.panelButtons.setPadding(10);

                    this.panelChannels = FrameTree.Tree(this.frameChannels);
                    that.updateChannelInfo();

                    var browserButton = Application.getView('genomebrowser').createActivationButton({
                        content: "Genome browser",
                        bitmap: 'Bitmaps/circle_red_small.png'
                    });

                    var tableViewerButton = Application.getView('tableviewer').createActivationButton({
                        content: "Table viewer",
                        bitmap: 'Bitmaps/circle_red_small.png'
                    });

                    var bt_addsnpprops = Controls.Button(null, { content: 'Upload SNP properties...'});
                    bt_addsnpprops.setOnChanged(function() {
                        UploadSNPProperties.execute(function() {});
                    })

                    var bt_refresh = Controls.Button(null, { content: 'Refresh'}).setOnChanged(function() {
                        Msg.send({ type: 'ReloadChannelInfo' });
                    })

                    this.panelButtons.addControl(Controls.CompoundVert([
                        Controls.CompoundHor([browserButton, tableViewerButton]) ,
                        Controls.CompoundHor([bt_addsnpprops, bt_refresh])
                    ]));

                }


                that.updateChannelInfo = function(proceedFunction) {

                    this.panelChannels.root.clear();
                    that.panelChannels.render();
                    var root_customsnpprops = this.panelChannels.root.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Custom SNP properties</span>')).setCanSelect(false);

                    var br = that.panelChannels.root.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Genomic values</span>')).setCanSelect(false);
                    var br1 = br.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Individual points</span>')).setCanSelect(false);
                    var br1 = br.addItem(FrameTree.Branch(null,'<span class="DQXLarge">Filterbank summarised</span>')).setCanSelect(false);

                    Application.getChannelInfo(function() {
                        $.each(MetaData.customSnpProperties, function(idx, snpprop) {
                            str = '<b>'+snpprop.propid+'</b>';
                            str += ' ('+snpprop.datatype+')';
                            var openButton = Controls.LinkButton(null,{smartLink : true }).setOnChanged(function() {
                                EditSNPProperty.execute(snpprop.propid);
                            });
                            var moveUpButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_up_1.png'), vertShift:-2 }).setOnChanged(function() {
                            });
                            var moveDownButton = Controls.LinkButton(null, { bitmap:DQX.BMP('triangle_down_1.png'), vertShift:-2 }).setOnChanged(function() {
                            });
                            root_customsnpprops.addItem(FrameTree.Control(Controls.CompoundHor([openButton,Controls.HorizontalSeparator(7),moveUpButton,Controls.HorizontalSeparator(0),moveDownButton,Controls.HorizontalSeparator(7),Controls.Static(str)])));
                        });

                        that.panelChannels.render();
                        if (proceedFunction) proceedFunction();
                    });


                }


                Msg.listen('', { type: 'ReloadChannelInfo' }, function () {
                    //MetaData.customSnpPropertiesChanged = true;
                    that.updateChannelInfo(function() {
                        Application.getView('tableviewer').uptodate = false;
                        Application.getView('genomebrowser').uptodate = false;
                    });
                });

                return that;
            }

        };

        return IntroModule;
    });