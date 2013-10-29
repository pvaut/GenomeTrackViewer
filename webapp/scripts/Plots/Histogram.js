define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var Histogram = {};





        Histogram.Create = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame(tableInfo.name + ' Histogram', {title:'Histogram', blocking:false, sizeX:700, sizeY:550 });
            that.tableInfo = tableInfo;
            that.query = SQL.WhereClause.Trivial();
            if (tableInfo.currentQuery)
                that.query = tableInfo.currentQuery;
            that.fetchCount = 0;
            that.showRelative = false;

            that.eventids = [];

            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;


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
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var buttonDefineQuery = Controls.Button(null, { content: 'Define query...', buttonClass: 'DQXToolButton2', width:120, height:40, bitmap: DQX.BMP('filter1.png') });
                buttonDefineQuery.setOnChanged(function() {
                    EditQuery.CreateDialogBox(that.tableInfo.id, that.query, function(query) {
                        that.query = query;
                        that.ctrlQueryString.modifyValue(tableInfo.tableViewer.getQueryDescription(query));
                        that.fetchData();
                    });
                });

                that.ctrlQueryString = Controls.Html(null,tableInfo.tableViewer.getQueryDescription(that.query));

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Value') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlValueProperty = Controls.Combo(null,{ label:'Value:', states: propList })
                that.ctrlValueProperty.setOnChanged(function() {
                    that.fetchData();
                });



                that.panelButtons.addControl(Controls.CompoundVert([
                    buttonDefineQuery,
                    that.ctrlQueryString,
                    Controls.VerticalSeparator(20),
                    that.ctrlValueProperty
                ]));

            };


            that.fetchData = function() {
                that.propidValue = that.ctrlValueProperty.getValue();

                if (!that.propidValue)
                    return;

                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propid = that.propidValue;
                data.qry = SQL.WhereClause.encode(that.query);
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','histogram', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    var decoder = DataDecoders.ValueListDecoder();
                    var buckets = decoder.doDecode(resp.buckets);
                    var counts = decoder.doDecode(resp.counts);
                    var binsize = resp.binsize;

//                    var sizeX = that.scaleW + that.categories.length * that.barW;
//                    that.panelPlot.setFixedWidth(sizeX+20);
//                    that.reDraw();
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
/*
                var ctx = drawInfo.ctx;
                if (!that.categories) {
                    return;
                }
                var propInfo1 = MetaData.findProperty(that.tableInfo.id,that.catpropid1);
                if (that.catpropid2)
                    var propInfo2 = MetaData.findProperty(that.tableInfo.id,that.catpropid2);

                that.plotH = drawInfo.sizeY - that.textH - 60;

                that.hoverItems = [];

                var totcount  = 0;
                $.each(that.categories, function(idx, cat) {
                    totcount += cat.count;
                });

                ctx.font="12px Arial";
                $.each(that.categories, function(idx, cat) {
                    var sumcount = that.maxcount;
                    if (that.showRelative && (that.catpropid2) )
                        sumcount = cat.count;
                    sumcount = Math.max(1,sumcount);

                    ctx.fillStyle="rgb(220,220,220)";
                    var h = cat.count*1.0/sumcount * that.plotH;
                    var px1 = that.scaleW + idx * that.barW + 0.5;
                    var px2 = that.scaleW + (idx+1) * that.barW + 0.5;
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
                    ctx.fillText(propInfo1.toDisplayString(cat.name),0,0);
                    ctx.restore();
                    //Draw count
                    ctx.fillStyle="rgb(150,150,150)";
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate((px1+px2)/2,py2-2);
                    ctx.rotate(-Math.PI/2);
                    ctx.fillText(cat.count,0,0);
                    ctx.restore();

                    var label = propInfo1.name+': '+propInfo1.toDisplayString(cat.name);
                    label += '<br>Count: {ct} ({fr}%)'.DQXformat({ ct:cat.count, fr:(cat.count/totcount*100).toFixed(2)});
                    that.hoverItems.push({
                        //itemid: ids[bestidx],
                        ID: 'i'+DQX.getNextUniqueID(),
                        px: (px1+px2)/2,
                        py: (py1+py2)/2,
                        //showPointer:true,
                        content: label,
                        px1:px1, px2:px2, py1:py1, py2:py2
                    });

                    if (that.catpropid2) {
                        var colorMapper = MetaData.findProperty(that.tableInfo.id,that.catpropid2).category2Color;
                        var cumulcount = 0;
                        $.each(cat.subcats, function(idx, subcat) {
                            var h1 = cumulcount*1.0/sumcount * that.plotH;
                            var h2 = (cumulcount+subcat.count)*1.0/sumcount * that.plotH;
                            var py1 = drawInfo.sizeY-that.textH - Math.round(h1) + 0.5;
                            var py2 = drawInfo.sizeY-that.textH - Math.round(h2) + 0.5;
                            var colNr = colorMapper.get(subcat.name);
                            if (colNr>=0)
                                ctx.fillStyle=DQX.standardColors[colNr].toStringCanvas();
                            else
                                ctx.fillStyle='rgb(100,100,100)';
                            ctx.beginPath();
                            ctx.moveTo(px1, py2);
                            ctx.lineTo(px1, py1);
                            ctx.lineTo(px2, py1);
                            ctx.lineTo(px2, py2);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                            cumulcount += subcat.count;

                            var label = propInfo1.name+': '+propInfo1.toDisplayString(cat.name);
                            label += '<br>'+propInfo2.name+': '+propInfo2.toDisplayString(subcat.name);
                            label += '<br>Count: {ct} (of class: {fr1}%, of total: {fr2}%)'.DQXformat({
                                ct:subcat.count,
                                fr1:(subcat.count/sumcount*100).toFixed(2),
                                fr2:(subcat.count/totcount*100).toFixed(2)
                            });
                            that.hoverItems.push({
                                //itemid: ids[bestidx],
                                ID: 'i'+DQX.getNextUniqueID(),
                                px: (px1+px2)/2,
                                py: (py1+py2)/2,
                                //showPointer:true,
                                content: label,
                                px1:px1, px2:px2, py1:py1, py2:py2
                            });

                        });
                    }
                });
*/

                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                return null;
/*                var hoverItem = null;
                $.each(that.hoverItems, function(idx, item) {
                    if ( (px0>=item.px1) && (px0<=item.px2) && (py0>=item.py2) && (py0<=item.py1) )
                        hoverItem = item;
                });
                return $.extend({},hoverItem);*/
            };



            that.create();
            return that;
        }



        return Histogram;
    });


