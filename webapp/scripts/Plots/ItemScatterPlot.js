define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/DataFetcher/DataFetchers", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, DataFetchers, MetaData) {

        var ItemScatterPlot = {};





        ItemScatterPlot.Create = function(tableid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var that = PopupFrame.PopupFrame(tableInfo.name + ' scatterplot', {title:'Scatter plot', blocking:false, sizeX:700, sizeY:550 });
            that.tableInfo = tableInfo;
            that.fetchCount = 0;

            that.plotAspects = [
                { id: 'id', name: 'ID', datatype: 'Text', propid: that.tableInfo.primkey, data: null, visible:false, required:true },
                { id: 'xaxis', name: 'X axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'yaxis', name: 'Y axis', datatype: 'Value', propid: null, data: null, visible:true, required:true },
                { id: 'color', name: 'Point color', datatype: 'Text', propid: null, visible:true, data: null },
                { id: 'size', name: 'Point size', datatype: 'Value', propid: null, visible:true, data: null },
                { id: 'style', name: 'Point style', datatype: 'Text', propid: null, visible:true, data: null },
            ];

            that.mapPlotAspects = {};
            $.each(that.plotAspects, function(idx, aspect) {
                that.mapPlotAspects[aspect.id] = aspect;
            });


            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,true);
            };

            that.createPanels = function() {
                that.panelPlot = Framework.Canvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseDown = that.onMouseDown;
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var controls = [];
                $.each(that.plotAspects,function(idx, plotAspect) {
                    if (plotAspect.visible) {
                        var propList = [ {id:'', name:'-- None --'}];
                        $.each(MetaData.customProperties, function(idx, prop) {
                            if ( (prop.datatype==plotAspect.datatype) && (prop.tableid==that.tableInfo.id) )
                                propList.push({ id:prop.propid, name:prop.name });
                        });
                        plotAspect.picker = Controls.Combo(null,{ label:'', states: propList }).setOnChanged( function() { that.fetchData(plotAspect.id)} );
                        controls.push( Controls.CompoundVert([Controls.Static(plotAspect.name+':'), plotAspect.picker]).setTreatAsBlock() );
                        controls.push(Controls.HorizontalSeparator(15));
                    }
                });

                that.panelButtons.addControl(Controls.CompoundHor(controls));

                that.fetchData('id');
            };


            that.fetchData = function(plotAspectID) {
                var aspectInfo = that.mapPlotAspects[plotAspectID];
                aspectInfo.data = null;
                if (aspectInfo.visible)
                    aspectInfo.propid = aspectInfo.picker.getValue();
                if (aspectInfo.propid) {
                    var fetcher = DataFetchers.RecordsetFetcher(MetaData.serverUrl, MetaData.database, that.tableInfo.id + 'CMB_' + MetaData.workspaceid);
                    var encoding='ST';
                    if (aspectInfo.datatype=='Value')
                        encoding = 'F3';
                    fetcher.addColumn(aspectInfo.propid, encoding);
                    that.fetchCount += 1;
                    that.panelPlot.render();
                    fetcher.getData(SQL.WhereClause.Trivial(), that.tableInfo.primkey, function (data) {
                        aspectInfo.data = data[aspectInfo.propid];
                        that.processAspectData(plotAspectID);
                        that.fetchCount -= 1;
                        that.panelPlot.render();
                    });
                }
                else {
                    that.processAspectData(plotAspectID);
                    that.panelPlot.render();
                }
            };

            that.processAspectData = function(plotAspectID) {
                var aspectInfo = that.mapPlotAspects[plotAspectID];
                var values = aspectInfo.data;
                if ((aspectInfo.datatype == 'Value')&&(values)) {
                    var minval=1.0e99;
                    var maxval= -1.0e99;
                    for (var i=0; i<values.length; i++) {
                        if (values[i]!=null) {
                            if (minval > values[i]) minval = values[i];
                            if (maxval < values[i]) maxval = values[i];
                        }
                    }
                    aspectInfo.minval = minval;
                    aspectInfo.maxval = maxval;
                    var range = aspectInfo.maxval-aspectInfo.minval;
                    aspectInfo.maxval += range/20;
                    aspectInfo.minval -= range/20;
                }

                if (plotAspectID=='id') {
                    var sortIndex = [];
                    for (var i=0; i<values.length; i++)
                        sortIndex.push(i);
                    that.sortIndex = sortIndex;
                }

                if (plotAspectID=='size') {

                    if (values) {// Make sure the points are sorted largest to smallest
                        var sortWithIndeces = function (toSort) {
                            for (var i = 0; i < toSort.length; i++) {
                                toSort[i] = [toSort[i], i];
                            }
                            toSort.sort(function(left, right) {
                                return left[0] < right[0] ? -1 : 1;
                            });
                            toSort.sortIndices = [];
                            for (var j = 0; j < toSort.length; j++) {
                                toSort.sortIndices.push(toSort[j][1]);
                                toSort[j] = toSort[j][0];
                            }
                            return toSort;
                        }

                        var tosort = [];
                        for (var i=0; i<values.length; i++) tosort.push(-values[i]);

                        sortWithIndeces(tosort);
                        that.sortIndex = tosort.sortIndices;
                    }


                }


                if (plotAspectID=='color') {// Create categorical data
                    aspectInfo.catData = null;
                    if (values) {
                        var maxCatCount = DQX.niceColours.length;
                        var catMap = {};
                        var catData = [];
                        var catCount = 0;
                        for (var i=0; i<values.length; i++) {
                            if (values[i] in catMap)
                                catData.push(catMap[values[i]])
                            else {
                                if (catCount<maxCatCount) {
                                    catMap[values[i]] = catCount;
                                    catData.push(catCount);
                                    catCount++;
                                }
                                else
                                    catData.push(-1)
                            }
                        }
                        aspectInfo.catData = catData;
                    }
                }
            }


            that.draw = function(drawInfo) {
                that.plotPresent = false;
                var ctx = drawInfo.ctx;
                if (that.fetchCount > 0) {
                    ctx.font="20px Arial";
                    ctx.fillStyle="rgb(140,140,140)";
                    ctx.fillText("Fetching data ...",10,50);
                    return;
                }

                var missingAspects =[];
                $.each(that.plotAspects, function(idx, aspect) {
                    if (aspect.required&&(!aspect.data))
                        missingAspects.push(aspect.name);
                });
                if (missingAspects.length>0) {
                    ctx.font="italic 14px Arial";
                    ctx.fillStyle="rgb(0,0,0)";
                    ctx.fillText("Please provide data for "+missingAspects.join(', '),10,50);
                    return;
                }

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeX);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;
                var valColorCat = that.mapPlotAspects['color'].catData;
                var valSize = that.mapPlotAspects['size'].data;
                var scaleX = (drawInfo.sizeX-marginX) / (aspectX.maxval - aspectX.minval);
                var offsetX = marginX - aspectX.minval*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (aspectY.maxval - aspectY.minval);
                var offsetY = (drawInfo.sizeY-marginY) - aspectY.minval*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                // Draw x scale
                ctx.save();
                ctx.font="12px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(20/scaleX);
                for (var i=Math.ceil(aspectX.minval/scale.Jump1); i<=Math.floor(aspectX.maxval/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var px = Math.round(vl * scaleX + offsetX)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(px,0);
                    ctx.lineTo(px,drawInfo.sizeY-marginY);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.fillText(vl.toFixed(scale.textDecimalCount),px,drawInfo.sizeY-marginY+13);
                    }
                }
                ctx.restore();

                // Draw y scale
                ctx.save();
                ctx.font="12px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(20/Math.abs(scaleY));
                for (var i=Math.ceil(aspectY.minval/scale.Jump1); i<=Math.floor(aspectY.maxval/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var py = Math.round(vl * scaleY + offsetY)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(marginX,py);
                    ctx.lineTo(drawInfo.sizeX,py);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.save();
                        ctx.translate(marginX-5,py);
                        ctx.rotate(-Math.PI/2);
                        ctx.fillText(vl.toFixed(scale.textDecimalCount),0,0);
                        ctx.restore();
                    }
                }
                ctx.restore();


                // Draw points
                ctx.fillStyle="#000000";
                ctx.strokeStyle="#000000";

                var smallPoints = (!valSize)&&(valX.length>10000);
                var sortIndex = that.sortIndex;

                if (smallPoints) {
                    for (var i=0; i<valX.length; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = Math.round(valX[ii] * scaleX + offsetX);
                            var py = Math.round(valY[ii] * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.strokeStyle=DQX.niceColours[valColorCat[ii]];
                            }
                            ctx.beginPath();
                            ctx.moveTo(px - 2, py - 0.5);
                            ctx.lineTo(px + 1, py - 0.5);
                            ctx.moveTo(px - 0.5, py - 2);
                            ctx.lineTo(px - 0.5, py + 1);
                            ctx.stroke();
                        }
                    }
                }

                if ((!smallPoints) && (!valSize)) {
                    for (var i=0; i<valX.length; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            if (valColorCat) {
                                ctx.fillStyle=DQX.niceColours[valColorCat[ii]];
                                ctx.strokeStyle=DQX.niceColours[valColorCat[ii]];
                            }
                            ctx.beginPath();
                            ctx.arc(px, py, 2, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                    }
                }

                if (valSize) {
                    ctx.fillStyle='rgb(220,220,220)';
                    ctx.strokeStyle='rgb(128,128,128)';
                    var sizeMin = that.mapPlotAspects['size'].minval;
                    var sizeMax = that.mapPlotAspects['size'].maxval;
                    for (var i=0; i<valX.length; i++) {
                        var ii = sortIndex[i];
                        if ( (valX[ii]!=null) && (valY[ii]!=null) ) {
                            var px = /*Math.round*/(valX[ii] * scaleX + offsetX);
                            var py = /*Math.round*/(valY[ii] * scaleY + offsetY);
                            var rd = (valSize[ii]-sizeMin)/(sizeMax-sizeMin)*10+2;
                            if (valColorCat) {
                                ctx.fillStyle=DQX.niceColours[valColorCat[ii]];
                            }
                            ctx.beginPath();
                            ctx.arc(px, py, rd, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                    }
                }


                that.plotPresent = true;
            };



            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                scaleX = that.scaleX; offsetX = that.offsetX;
                scaleY = that.scaleY; offsetY = that.offsetY;
                var ids =that.mapPlotAspects['id'].data;
                var aspectX = that.mapPlotAspects['xaxis'];
                var aspectY = that.mapPlotAspects['yaxis'];
                var valX = aspectX.data;
                var valY = aspectY.data;
                var mindst=10;
                var bestidx = -1;
                for (var i=0; i<valX.length; i++) {
                    if ( (valX[i]!=null) && (valY[i]!=null) ) {
                        var px = valX[i] * scaleX + offsetX;
                        var py = valY[i] * scaleY + offsetY;
                        var dst=Math.abs(px-px0) + Math.abs(py-py0);
                        if (dst<=mindst) {
                            mindst=dst;
                            bestidx = i;
                        }
                    }
                }
                if (bestidx<0) return null;
                return {
                    itemid: ids[bestidx],
                    ID: 'IDX'+bestidx,
                    px: valX[bestidx] * scaleX + offsetX,
                    py: valY[bestidx] * scaleY + offsetY,
                    showPointer:true,
                    content: ids[bestidx]
                };
            };

            that.onMouseDown = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    Msg.send({ type: 'ItemPopup' }, { tableid: that.tableInfo.id, itemid: tooltip.itemid } );
                }
            }




            that.create();
            return that;
        }



        return ItemScatterPlot;
    });


