define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var BarGraph = {};





        BarGraph.Create = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame(tableInfo.name + ' bargraph', {title:'Bar graph', blocking:false, sizeX:700, sizeY:550 });
            that.tableInfo = tableInfo;
            that.fetchCount = 0;

            that.eventids = [];

            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'QueryChanged'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reloadAll();
            } );

            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            };



            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,false);
            };

            that.createPanels = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                //that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...'}).setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.tableid);
                });

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlCatProperty1 = Controls.Combo(null,{ label:'Group by:', states: propList })
                that.ctrlCatProperty1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatProperty2 = Controls.Combo(null,{ label:'Secondary group:', states: propList })
                that.ctrlCatProperty2.setOnChanged(function() {
                    that.ctrlCatType.modifyEnabled(that.ctrlCatProperty2.getValue()!='');
                    that.fetchData();
                });

                that.ctrlCatType = Controls.Check(null,{ label:'Sum to 100%'  })
                that.ctrlCatType.setOnChanged(function() {
                    //that.fetchData();
                });
                that.ctrlCatType.modifyEnabled(false);

                that.panelButtons.addControl(Controls.CompoundVert([
                    buttonDefineQuery,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty1,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty2,
                    that.ctrlCatType,
                    Controls.VerticalSeparator(10)
//                    pickControls,
//                    that.colorLegend
                ]));

            };


            that.fetchData = function() {
                that.catpropid1 = that.ctrlCatProperty1.getValue();
                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propid1 = that.catpropid1;
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','categorycounts', data, function(resp) {
                    DQX.stopProcessing();
                    Msg.send({ type: 'ReloadChannelInfo' });
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    var decoder = DataDecoders.ValueListDecoder();
                    that.categories = decoder.doDecode(resp.categories);
                    that.categorycounts = decoder.doDecode(resp.categorycounts);
                    that.maxcount = 0;
                    $.each(that.categorycounts, function(idx, cnt) {
                        that.maxcount = Math.max(that.maxcount,cnt);
                    });
                    var sizeX = that.scaleW + that.categories.length * that.barW;
                    that.panelPlot.setFixedWidth(sizeX+20);
                    that.reDraw();
                });

            }


            that.reloadAll = function() {
            }

            that.reDraw = function() {
                that.panelPlot.invalidate();
            }



            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {
                var ctx = drawInfo.ctx;
                if (!that.categories) {
                    return;
                }

                that.plotH = drawInfo.sizeY - that.textH - 60;

                ctx.font="12px Arial";
                for (var i=0; i<that.categories.length; i++) {
                    ctx.fillStyle="rgb(220,220,220)";
                    var h = that.categorycounts[i]*1.0/that.maxcount * that.plotH;
                    var px1 = that.scaleW + i * that.barW + 0.5;
                    var px2 = that.scaleW + (i+1) * that.barW + 0.5;
                    var py1 = drawInfo.sizeY-that.textH + 0.5;
                    var py2 = drawInfo.sizeY-that.textH -Math.round(h) + 0.5;
                    ctx.beginPath();
                    ctx.moveTo(px1, py2);
                    ctx.lineTo(px1, py1);
                    ctx.lineTo(px2, py1);
                    ctx.lineTo(px2, py2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    //Draw label
                    ctx.fillStyle="black";
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate((px1+px2)/2,py1+5);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(that.categories[i],0,0);
                    ctx.restore();
                    //Draw count
                    ctx.fillStyle="rgb(150,150,150)";
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate((px1+px2)/2,py2-2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(that.categorycounts[i],0,0);
                    ctx.restore();


                }

                that.plotPresent = true;
            };




            that.create();
            return that;
        }



        return BarGraph;
    });


