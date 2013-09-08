define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, MetaData) {

        var EditQuery = {};

        EditQuery.init = function() {
            Msg.listen('',{type:'EditQuery'}, function(scope, tableid) {
                var frame = EditQuery.CreateDialogBox(tableid);
                frame.create();
            });

        }




        EditQuery.CreateDialogBox = function(tableid) {
            var that = PopupFrame.PopupFrame('editquery', {title:'Edit query', blocking:true, sizeX:700, sizeY:600 });
            that.tableInfo = MetaData.mapTableCatalog[tableid];

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 90);
            };

            that.createPanels = function() {
                that.panelBody = Framework.Form(that.frameBody).setPadding(10);
                that.panelButtons = Framework.Form(that.frameButtons);

            };

            that.onOK = function() {


                that.close();

            }

            return that;
        }



        return EditQuery;
    });



