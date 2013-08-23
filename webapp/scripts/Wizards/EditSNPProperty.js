define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, MetaData) {

        var EditSNPProperty = {};

//        EditSNPProperty.init = function() {
//        }

        EditSNPProperty.execute = function(propid) {
            var str = 'Property identifier: "'+propid+'"<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Edit definition...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
                EditSNPProperty.editProperty(propid);
            });
            str += bt.renderHtml();

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Delete...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
                EditSNPProperty.delProperty(propid);
            });
            str += bt.renderHtml();

            var popupid = Popup.create('Edit SNP property',str);
        };

        EditSNPProperty.delProperty = function(propid) {
            if (confirm('Are you sure you want to permanently delete property "{id}"'.DQXformat({ id:propid }))) {
                asyncRequest("delsnpproperty",{ database: MetaData.database, workspaceid:MetaData.workspaceid, propid:propid }, function() {
                    Msg.send({ type: 'ReloadChannelInfo' });
                });
            }
        };

        EditSNPProperty.editProperty = function(propid) {
            var frame = EditSNPProperty.CreateSNPPropertyDialogBox(propid);
            frame.create();
        };



        EditSNPProperty.CreateSNPPropertyDialogBox = function(propid) {
            var that = PopupFrame.PopupFrame('snppropedit', {title:'Edit SNP', blocking:true });

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(false,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 90);
            };

            that.createPanels = function() {
                that.panelButtons = Framework.Form(that.frameButtons);

                var bt_ok = Controls.Button(null, { content: 'OK'}).setOnChanged(function() {
                    that.close();
                });
                that.panelButtons.addControl(bt_ok);
            };

            return that;
        }



        return EditSNPProperty;
    });



