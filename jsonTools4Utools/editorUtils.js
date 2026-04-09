// 辨别数据类型（在 utils.js 之前定义，避免依赖问题）
const dataType = function (data) {
    if ((data === null) || data === undefined || typeof data === "null" || typeof data === "undefined") {
        return "null";
    } else if (typeof data === "string") {
        return "string";
    } else if (typeof data === "number" && LosslessJSON.stringify(data).indexOf(".") === -1 && data.toString().length <= 16) {
        return "int";
    } else if (typeof data === "bigint" || (typeof data === "number" && data.toString().length > 16)) {
        return "bigint";
    } else if (typeof data === "number" && LosslessJSON.stringify(data).indexOf(".") !== -1) {
        return "number";
    } else if (typeof data === "boolean") {
        return "boolean";
    } else if (typeof data === "object" && LosslessJSON.stringify(data).indexOf("{") === 0) {
        return "object";
    } else if (typeof data === "object" && LosslessJSON.stringify(data).indexOf("[") === 0) {
        return "array";
    } else {
        return "error";
    }
};

const myLosslessJSONReplacer = function (key, value) {
    if (typeof value === "number" && value.toString().includes(".")) {
        const decimalCount = value.toString().split(".")[1].length;
        return value.toFixed(decimalCount);
    }
    return value;
}

const myLosslessJSONReviver = function (key, value) {
    if (value && value.isLosslessNumber === true
        && JSON.stringify(Object.keys(value)) === JSON.stringify(["isLosslessNumber", "value"])
        && dataType(value.value) === "string") {
        if (value.value.length > 16 && !value.value.includes("e+") && !value.value.includes(".")) {
            return BigInt(value.value);
        } else if (value.value.length > 16 && value.value.includes("e+")) {
            return `${value.value}`;
        } else {
            // return new LosslessJSON.LosslessNumber(value.value);
            return Number(value.value);
        }
    } else {
        return value;
    }
}

// 转为 "<Long>value</Long>" 格式的 JSON 字符串, 方便在 JSONString 后面替换掉
const myJsonReviverLong = function (key, value) {
    if (value && value.isLosslessNumber === true) {
        if (value.value.length > 16 && !value.value.includes("e+") && !value.value.includes(".")) {
            return `<Long>${value.value}</Long>`;
        } else if (value.value.length > 16 && value.value.includes("e+")) {
            return `${value.value}`;
        } else if (value.value.includes(".") && value.value.endsWith("0")) {
            return `<Long>${value.value}</Long>`;
        } else {
            // return new LosslessJSON.LosslessNumber(value.value);
            return value.value;
        }
    } else {
        return value;
    }
}

const cleanLongXML = function (jsonStr) {
    const lines = jsonStr.split("\n");
    const result = [];
    lines.forEach(line => {
        const lineStr = line.replace(/<Long>(\d+)<\/Long>|<Long>(\d+\.\d+)<\/Long>/, "$1$2");
        result.push(lineStr);
    });
    return result.join("\n");
}

const myJsonParse = function (jsonStr, ...args) {
    return LosslessJSON.parse(jsonStr, myLosslessJSONReviver, ...args);
}

const myJsonStringify = function (jsonData, ...args) {
    return LosslessJSON.stringify(jsonData, ...args);
};

const editorGetValue = function (editor) {
    if (editor.getValue) {  // Ace editor
        return editor.getValue();
    } else {  // json editor
        return editor.getText();
    }
}

const editorGet = function (editor) {
    return myJsonParse(editorGetValue(editor));
}

const aceEditorInsertData = function (aceEditor, data) {
    const row = aceEditor.getSelectionRange().end.row;
    const column = aceEditor.getSelectionRange().end.column;
    // 方案1：优先尝试使用 getFullDocumentRange
    let range;
    try {
        // 部分 Ace 版本中方法命名为 getFullDocumentRange()
        range = aceEditor.session.getFullDocumentRange();
    } catch (e) {
        // 方案2：手动构造完整范围
        const lineCount = aceEditor.session.getLength();
        if (lineCount === 0) {
            range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
        } else {
            const lastLineIndex = lineCount - 1;
            const lastLineLength = aceEditor.session.getLine(lastLineIndex).length;
            range = {
                start: { row: 0, column: 0 },
                end: { row: lastLineIndex, column: lastLineLength }
            };
        }
    }
    let targetData = data;
    if (dataType(data) === "string") {
        targetData = LosslessJSON.parse(data);
    }
    const jsonStr = myJsonStringify(targetData, null, 2);
    // 行数一样多，数据才是准确的
    if (jsonStr.split("\n").length == range.end.row + 1) {
        aceEditor.session.replace(range, jsonStr);
    } else {
        aceEditor.setValue(jsonStr);
    }
    // 可选：保持光标位置
    aceEditor.gotoLine(row + 1, column);
}


