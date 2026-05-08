// 辨别数据类型（在 utils.js 之前定义，避免依赖问题）
// 优化：使用 typeof + Array.isArray 替代 LosslessJSON.stringify，避免序列化开销
const dataType = function (data) {
    if (data === null || data === undefined) {
        return "null";
    } else if (typeof data === "string") {
        return "string";
    } else if (typeof data === "number") {
        const s = data.toString();
        if (s.length > 16) return "bigint";
        if (s.includes(".") || s.includes("e") || s.includes("E")) return "number";
        return "int";
    } else if (typeof data === "bigint") {
        return "bigint";
    } else if (typeof data === "boolean") {
        return "boolean";
    } else if (Array.isArray(data)) {
        return "array";
    } else if (typeof data === "object") {
        return "object";
    } else {
        return "error";
    }
};

const myLosslessJSONReplacer = function (key, value) {
    if (typeof value === "number" && value.toString().includes(".")) {
        const s = value.toString();
        const decimalCount = s.split(".")[1].length;
        return value.toFixed(decimalCount);
    }
    return value;
}

const myLosslessJSONReviver = function (key, value) {
    if (value && value.isLosslessNumber === true
        && Object.keys(value).length === 2
        && "isLosslessNumber" in value && "value" in value
        && dataType(value.value) === "string") {
        const val = value.value;
        if (val.length > 16 && !val.includes("e+") && !val.includes(".")) {
            return BigInt(val);
        } else if (val.length > 16 && val.includes("e+")) {
            return val;
        }
        return Number(val);
    }
    return value;
}

const myJsonReviverLong = function (key, value) {
    if (value && value.isLosslessNumber === true) {
        const val = value.value;
        if (val.length > 16 && !val.includes("e+") && !val.includes(".")) {
            return `<Long>${val}</Long>`;
        } else if (val.length > 16 && val.includes("e+")) {
            return val;
        } else if (val.includes(".") && val.endsWith("0")) {
            return `<Long>${val}</Long>`;
        }
        return val;
    }
    return value;
}

const cleanLongXML = function (jsonStr) {
    return jsonStr.replace(/<Long>(\d+)<\/Long>|<Long>(\d+\.\d+)<\/Long>/g, "$1$2");
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

const aceEditorInsertData = function (aceEditor, data, skipGotoLine = false) {
    const selection = aceEditor.getSelectionRange();
    const row = selection.end.row;
    const column = selection.end.column;
    let range;
    const lineCount = aceEditor.session.getLength();
    if (lineCount === 0) {
        range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
    } else {
        try {
            range = aceEditor.session.getFullDocumentRange();
        } catch (e) {
            const lastLineIndex = lineCount - 1;
            const lastLineLength = aceEditor.session.getLine(lastLineIndex).length;
            range = { start: { row: 0, column: 0 }, end: { row: lastLineIndex, column: lastLineLength } };
        }
    }
    let targetData = data;
    if (dataType(data) === "string") {
        targetData = LosslessJSON.parse(data);
    }
    const jsonStr = myJsonStringify(targetData, null, 2);
    if (jsonStr.split("\n").length === range.end.row + 1) {
        aceEditor.session.replace(range, jsonStr);
    } else {
        aceEditor.setValue(jsonStr);
    }
    if (!skipGotoLine) {
        aceEditor.gotoLine(row + 1, column);
    }
}


