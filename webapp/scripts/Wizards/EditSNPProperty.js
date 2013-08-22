define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, MetaData) {

        var EditSNPProperty = {};

//        EditSNPProperty.init = function() {
//        }

        EditSNPProperty.execute = function(propid) {
            var str = 'Property identifier: "'+propid+'"<p>';

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Edit definition...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
            });
            str += bt.renderHtml();

            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "<b>Delete...</b>", /*bitmap:settings.bitmap,*/ width:120, height:25 }).setOnChanged(function() {
                DQX.ClosePopup(popupid);
                EditSNPProperty.delProperty(propid);
            });
            str += bt.renderHtml();

            var popupid = Popup.create('Edit SNP property',str);
        }

        EditSNPProperty.delProperty = function(propid) {
            if (confirm('Are you sure you want to permanently delete property "{id}"'.DQXformat({ id:propid }))) {
                asyncRequest("delsnpproperty",{ database: MetaData.database, workspaceid:MetaData.workspaceid, propid:propid }, function() {
                    Msg.send({ type: 'ReloadChannelInfo' });
                });
            }
        }



        return EditSNPProperty;
    });



