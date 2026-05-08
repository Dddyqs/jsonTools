// ==================== 基础工具函数 ====================
// 注意：dataType 函数定义在 editorUtils.js 中，确保 editorUtils.js 先加载

const _parsePath = function(path) {
    if (!path || typeof path !== 'string') return null;
    const cleanPath = path.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\.?/, '');
    if (!cleanPath) return [];
    return cleanPath.split(/[\.\[\]]+/).filter(k => k !== '');
};

const _isNumericKey = function(key) {
    return /^\d+$/.test(key);
};

// ==================== 安全工具函数 ====================

const safeGet = function(obj, path) {
    const keys = _parsePath(path);
    if (!keys || keys.length === 0) return obj;
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
    }
    return current;
};

const safeSet = function(obj, path, value) {
    const keys = _parsePath(path);
    if (!keys || keys.length === 0) return obj;
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];
        if (!(key in current)) {
            current[key] = _isNumericKey(nextKey) ? [] : {};
        }
        current = current[key];
        if (current === null || current === undefined) {
            return obj;
        }
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};

const safeDelete = function(obj, path) {
    const keys = _parsePath(path);
    if (!keys || keys.length === 0) return obj;
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) return obj;
        current = current[key];
        if (current === null || current === undefined) return obj;
    }
    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
        current.splice(parseInt(lastKey), 1);
    } else {
        delete current[lastKey];
    }
    return obj;
};

const safeInit = function(obj, path, defaultValue = {}) {
    if (safeGet(obj, path) === undefined) {
        safeSet(obj, path, defaultValue);
    }
    return obj;
};

/**
 * 安全执行函数，捕获错误并返回默认值
 * @param {Function} fn - 要执行的函数
 * @param {any} defaultValue - 发生错误时的默认返回值
 * @param {string} errorMsg - 自定义错误消息
 * @returns {any} 函数执行结果或默认值
 */
const safeExecute = function(fn, defaultValue = undefined, errorMsg = 'Operation failed') {
    try {
        return fn();
    } catch (error) {
        console.error(`${errorMsg}:`, error);
        if (typeof window !== 'undefined' && window.vm) {
            window.vm.$message && window.vm.$message.error(`${errorMsg}: ${error.message}`);
        }
        return defaultValue;
    }
};

/**
 * 安全解析 JSON，捕获错误
 * @param {string} jsonStr - JSON 字符串
 * @param {any} defaultValue - 解析失败时的默认值
 * @returns {any} 解析后的对象或默认值
 */
const safeJsonParse = function(jsonStr, defaultValue = null) {
    try {
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('JSON parse error:', error);
        return defaultValue;
    }
};

/**
 * 安全字符串化 JSON，捕获错误
 * @param {any} obj - 要字符串化的对象
 * @param {any} defaultValue - 字符串化失败时的默认值
 * @returns {string} JSON 字符串或默认值
 */
const safeJsonStringify = function(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('JSON stringify error:', error);
        return defaultValue;
    }
};

// ==================== 原有工具函数 ====================

const _addFlattenResult = function(resultOne, propName, oneData) {
    const type = dataType(oneData);
    if (type === "bigint") {
        resultOne[propName] = BigInt(`${oneData}`);
    } else if (type === "number") {
        resultOne[propName] = Number(oneData);
    } else {
        resultOne[propName] = oneData;
    }
};

const flattenJsonDataOrArray = function (jsonData, prefix = "", result = []) {
    const type = dataType(jsonData);
    if (type === "object" || type === "array") {
        const entries = type === "array" 
            ? jsonData.map((v, i) => [String(i), v])
            : Object.entries(jsonData);
        entries.forEach(([key, value]) => {
            const propName = prefix === "" ? key : prefix + "." + key;
            const valueType = dataType(value);
            if (valueType === "object" || valueType === "array") {
                flattenJsonDataOrArray(value, propName, result);
            } else {
                const resultOne = {};
                _addFlattenResult(resultOne, propName, value);
                result.push(resultOne);
            }
        });
    } else {
        const resultOne = {};
        resultOne[prefix] = jsonData;
        result.push(resultOne);
    }
    return result;
}

const jsonpathStrToArr = function (jsonpathStr) {
    const jsonpathNodes = jsonpath.parse(jsonpathStr);
    let jsonpathArr = [];
    for (const onePath of jsonpathNodes) {
        if (onePath.expression) {
            jsonpathArr.push(onePath.expression.value);
        }
    }
    return jsonpathArr;
};

const buildPathMap = function (json) {
    let jsonString;
    try {
        jsonString = myJsonStringify(json, null, 2);
    } catch (error) {
        return null;
    }
    const lines = jsonString.split('\n');
    const pathMap = new Map([[1, '$']]);
    const pathLineDict = { "$": [1] };
    const contextStack = [
        {
            type: 'root',
            path: '$',
            arrayIndex: -1,
            indent: -1
        }
    ];

    // root 是否是array
    let rootTypeArray;
    if (dataType(json) === "array") {
        rootTypeArray = 1;
    }

    for (let lineNum = 2; lineNum <= lines.length; lineNum++) {
        const line = lines[lineNum - 1];
        const trimmed = line.trim();
        const indent = Math.floor((line.length - trimmed.length) / 2);
        const currentContext = contextStack[contextStack.length - 1];
        let newPath = currentContext.path;

        currentContext.arrayIndex++;

        if (currentContext.type === 'array' || (currentContext.type === 'root' && rootTypeArray === 1)) {
            if (!(trimmed === '},' || trimmed === '],') && (!(trimmed === '}' || trimmed === ']'))) {
                newPath = `${currentContext.path}[${currentContext.arrayIndex}]`;
            } else if ((trimmed === '}' || trimmed === ']' || trimmed === '],') && (currentContext.indent === indent)) {
                if (contextStack.length > 1) { // 确保不会弹出根上下文
                    contextStack.pop();
                }
                newPath = `${currentContext.path}`;
            } else if ((trimmed === '}' || trimmed === ']') && (currentContext.indent !== indent)) {
                if (contextStack.length > 1) { // 确保不会弹出根上下文
                    contextStack.pop();
                }
                // currentContext.arrayIndex++;
                newPath = `${currentContext.path}[${currentContext.arrayIndex}]`;
            } else {
                newPath = `${currentContext.path}[${currentContext.arrayIndex}]`;
            }
        }

        // 缩进弹出逻辑同样保留根上下文
        while (contextStack.length > 1 && contextStack[contextStack.length - 1].indent >= indent) {
            contextStack.pop();
        }

        // 对象键处理
        const keyMatch = trimmed.match(/^\s*"([^"]+)"\s*:/);
        if (keyMatch) {
            newPath = currentContext.type === 'object'
                ? `${currentContext.path}.${keyMatch[1]}`
                : `$.${keyMatch[1]}`;
        }

        if (lineNum === lines.length) newPath = '$';

        pathMap.set(lineNum, newPath);
        const newPathLine = newPath.replaceAll("[", ".").replaceAll("]", "");
        if (pathLineDict[newPathLine] === undefined) {
            pathLineDict[newPathLine] = [];
        }
        pathLineDict[newPathLine].push(lineNum);

        // 结构起始标签处理
        if (trimmed.endsWith('[') || trimmed.endsWith('{')) {
            contextStack.push({
                type: trimmed.endsWith('[') ? 'array' : 'object',
                path: newPath,
                arrayIndex: trimmed.endsWith('[') ? -1 : null,
                indent
            });
        }
    }

    return [pathMap, pathLineDict];
};


// 获取行对应的jsonpath
const getJsonpathByLine = function (editor, row) {
    if (editor.container.id.includes("jsonEditorRight")) {
        if (vm.jsonpathRightMap && vm.jsonpathRightMap.size > 0) {
            return vm.jsonpathRightMap.get(row) || '';
        }
    } else {
        if (vm.jsonpathLeftMap && vm.jsonpathLeftMap.size > 0) {
            return vm.jsonpathLeftMap.get(row) || '';
        }
    }
    return '';
}


const _propKeyToPath = function(propKeys) {
    return propKeys.map(key => _isNumericKey(key) ? `[${key}]` : `.${key}`).join('');
};

const propertiesToJson = function (propsList) {
    let jsonData = undefined;
    for (let i = 0; i < propsList.length; i++) {
        let prop = propsList[i].trim();
        if (prop === "") continue;
        let pair = prop.split("=");
        let propKeyStr = pair[0];
        let propValueStr = pair[1];
        if (/^\d{17,}$/.test(propValueStr)) {
            propValueStr = BigInt(`${propValueStr}`);
        } else if (/^\d{1,}\.\d+$/.test(propValueStr)) {
            propValueStr = parseFloat(propValueStr);
        } else if (/^\d{1,}$/.test(propValueStr)) {
            propValueStr = parseInt(propValueStr);
        } else if (/^true|false$/.test(propValueStr)) {
            propValueStr = propValueStr === "true";
        } else if (/^null$/.test(propValueStr)) {
            propValueStr = null;
        }
        const propKeys = propKeyStr.split(".");
        if (jsonData === undefined) {
            jsonData = _isNumericKey(propKeys[0]) ? [] : {};
        }
        const pathStr = _propKeyToPath(propKeys);
        safeSet(jsonData, pathStr, propValueStr);
    }
    return jsonData;
}





