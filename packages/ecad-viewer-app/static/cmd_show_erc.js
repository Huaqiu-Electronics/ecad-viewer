window.dispatchEvent(
    new CustomEvent("sch:erc:component", {
        detail: {
            designator: "U1",
            pins: [
                {
                    message: "需要LDO U1的Datasheet来验证其输入电容要求。",
                    severity: "warning",
                    pin_num: "2",
                },
                {
                    pin_num: "1",
                    message: "PIN 1 未连接。",
                    severity: "error",
                },
            ],
        },
    }),
);
