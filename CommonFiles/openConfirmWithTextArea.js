sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Text",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/DialogType",
    "sap/m/MessageToast"
], function (Dialog, Text, TextArea, Button, ButtonType, DialogType, MessageToast) {
    "use strict";
    
    /**
    示例用法
    openConfirmWithTextArea(
        "打回原因",
        "是否打回让项目重新提报，打回后项目待办重发?",
        {
            required: false,
            rows: 4,
            placeholder: "请输入打回原因"
        },
        function (sBtn, sReason) {
            if (sBtn === "确认") {
                // sReason 就是拿到的打回原因
                
            }
        }.bind(this) // 绑定 this，否则里面拿不到 controller
    );
    */

    /** 带多行输入的确认弹窗
     * @param {string} sMessage
     * @param {string} sTitle
     * @param {object} [oOpts]
     * @param {Function} [fnOnClose]
     */
    function openConfirmWithTextArea (sMessage, sTitle, oOpts, fnOnClose) {
        oOpts = Object.assign({
            defaultValue: "",
            required: false,
            rows: 3,
            placeholder: "请输入打回原因"
        }, oOpts || {});

        const oTextArea = new TextArea({
            value: oOpts.defaultValue,
            placeholder: oOpts.placeholder,
            rows: oOpts.rows,
            width: "100%"
        });

        const oMessageText = new Text({
            text: sMessage,
            width: "100%"
        });

        const oCancelBtn = new Button({
            text: "取消",
            type: ButtonType.Default,
            press: function () {
                oDialog.close();
            }
        });

        const oConfirmBtn = new Button({
            text: "确认",
            type: ButtonType.Emphasized,
            press: function () {
                const sVal = oTextArea.getValue().trim();
                if (oOpts.required && !sVal) {
                    MessageToast.show("请填写打回原因");
                    return;
                }
                oDialog.close();
                fnOnClose && fnOnClose("确认", sVal);
            }
        });

        const oDialog = new Dialog({
            title: sTitle,
            type: DialogType.Message,
            stretch: false,
            contentWidth: "420px",
            contentHeight: "auto",
            verticalScrolling: false,
            horizontalScrolling: false,
            initialFocus: oTextArea,
            afterClose: function () {
                oDialog.destroy();
            }
        });

        oDialog.addContent(oMessageText);
        oDialog.addContent(oTextArea);
        oDialog.setBeginButton(oConfirmBtn);
        oDialog.setEndButton(oCancelBtn);

        oDialog.open();
    }


    return openConfirmWithTextArea;
});