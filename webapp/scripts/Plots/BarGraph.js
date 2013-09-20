define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var BarGraph = {};





        BarGraph.Create = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame(tableInfo.name + ' bargraph', {title:'Bar graph', blocking:false, sizeX:700, sizeY:550 });
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
                //that.panelPlot.getToolTipInfo = that.getToolTipInfo;
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
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Text') || (prop.datatype=='Boolean') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlCatProperty1 = Controls.Combo(null,{ label:'Group by:', states: propList })
                that.ctrlCatProperty1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatSort1 = Controls.Combo(null,{ label:'Sort by:', states: [{id:'cat', name:'Category'}, {id:'count', name:'Count'}] })
                that.ctrlCatSort1.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrlCatProperty2 = Controls.Combo(null,{ label:'Secondary group:', states: propList })
                that.ctrlCatProperty2.setOnChanged(function() {
                    that.ctrlCatType.modifyEnabled(that.ctrlCatProperty2.getValue()!='');
                    that.fetchData();
                });

                that.ctrlCatType = Controls.Check(null,{ label:'Sum to 100%'  })
                that.ctrlCatType.setOnChanged(function() {
                    that.showRelative = that.ctrlCatType.getValue();
                    that.reDraw();
                });
                that.ctrlCatType.modifyEnabled(false);

                that.colorLegend = Controls.Html(null,'');

                that.panelButtons.addControl(Controls.CompoundVert([
                    buttonDefineQuery,
                    that.ctrlQueryString,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty1,
                    that.ctrlCatSort1,
                    Controls.VerticalSeparator(20),
                    that.ctrlCatProperty2,
                    that.ctrlCatType,
                    Controls.VerticalSeparator(10),
                    that.colorLegend
                ]));

            };


            that.fetchData = function() {
                that.catpropid1 = that.ctrlCatProperty1.getValue();
                that.catpropid2 = that.ctrlCatProperty2.getValue();
                if (!that.catpropid1)
                    return;
                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propid1 = that.catpropid1;
                if (that.catpropid2)
                    data.propid2 = that.catpropid2;
                data.qry = SQL.WhereClause.encode(that.query);
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','categorycounts', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }
                    if (!that.catpropid2)
                        that.prepareData1Cat(resp);
                    else
                        that.prepareData2Cat(resp);
                    that.sortCats();
                    var sizeX = that.scaleW + that.categories.length * that.barW;
                    that.panelPlot.setFixedWidth(sizeX+20);
                    that.reDraw();
                });
            }

            that.prepareData1Cat = function(resp) {
                var decoder = DataDecoders.ValueListDecoder();
                var categories1 = decoder.doDecode(resp.categories1);
                var categorycounts = decoder.doDecode(resp.categorycounts);
                that.maxcount = 0;
                that.categories = [];
                $.each(categorycounts, function(idx, cnt) {
                    that.categories.push({ name:categories1[idx], count:cnt });
                    that.maxcount = Math.max(that.maxcount,cnt);
                });
                that.colorLegend.modifyValue('');
            }

            that.prepareData2Cat = function(resp) {
                var decoder = DataDecoders.ValueListDecoder();
                var categories1 = decoder.doDecode(resp.categories1);
                var categories2 = decoder.doDecode(resp.categories2);
                var categorycounts = decoder.doDecode(resp.categorycounts);
                that.categories = [];
                var catMap = {}
                var subCatMap = {}
                var subCats = [];
                $.each(categorycounts, function(idx, cnt) {
                    if (!(categories1[idx] in catMap)) {
                        var cat = { name:categories1[idx], count:0, subcats:[] };
                        that.categories.push(cat);
                        catMap[cat.name] = cat;
                    }
                    var cat = catMap[categories1[idx]];
                    if (!(categories2[idx] in subCatMap)) {
                        var subcat = { name:categories2[idx] };
                        subCats.push(subcat.name);
                        subCatMap[subcat.name] = subcat;
                    }
                    cat.count += cnt;
                    cat.subcats.push({ name:categories2[idx], count:cnt });

                    //that.categories.push({ name:categories1[idx], count:cnt });
                    //that.maxcount = Math.max(that.maxcount,cnt);
                });
                that.maxcount = 0;
                $.each(that.categories,function(idx, cat) {
                    that.maxcount = Math.max(that.maxcount,cat.count);
                });
                var colormapper = MetaData.findProperty(that.tableInfo.id,that.catpropid2).category2Color;
                colormapper.map(subCats);

                var legendStr = '';
                $.each(subCats,function(idx, subcat) {
                    var color = DQX.Color(0.5,0.5,0.5);
                    if (colormapper.get(subcat)>=0)
                        color = DQX.standardColors[colormapper.get(subcat)];
                    legendStr+='<span style="background-color:{cl}">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;{name}<br>'.DQXformat({
                        cl:color.toString(),
                        name:subcat
                    });
                });
                that.colorLegend.modifyValue(legendStr);

            }

            that.sortCats = function() {
                if (that.ctrlCatSort1.getValue()=='cat') {
                    that.categories = _.sortBy(that.categories, function(val) {
                        return val.name;
                    });
                }
                else {
                    that.categories = _.sortBy(that.categories, function(val) {
                        return -val.count;
                    });
                }
            };


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
                    ctx.fillText(cat.name,0,0);
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
                        });
                    }
                });


                that.plotPresent = true;
            };




            that.create();
            return that;
        }



        return BarGraph;
    });


