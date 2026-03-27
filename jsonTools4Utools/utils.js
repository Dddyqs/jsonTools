// ==================== 安全工具函数 ====================

/**
 * 安全地获取嵌套对象的属性值
 * @param {Object} obj - 目标对象
 * @param {string} path - 路径字符串，如 "jsonData.name.first" 或 "jsonData[0].name"
 * @returns {any} 属性值，如果不存在返回 undefined
 */
const safeGet = function(obj, path) {
    if (!path || typeof path !== 'string') return undefined;
    
    // 移除开头的变量名（如 "jsonData."）
    const cleanPath = path.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\.?/, '');
    if (!cleanPath) return obj;
    
    // 解析路径：支持 "." 和 "[]" 两种形式
    const keys = cleanPath.split(/[\.\[\]]+/).filter(k => k !== '');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
    }
    
    return current;
};

/**
 * 安全地设置嵌套对象的属性值
 * @param {Object} obj - 目标对象
 * @param {string} path - 路径字符串，如 "jsonData.name.first" 或 "jsonData[0].name"
 * @param {any} value - 要设置的值
 * @returns {Object} 修改后的对象
 */
const safeSet = function(obj, path, value) {
    if (!path || typeof path !== 'string') return obj;
    
    // 移除开头的变量名（如 "jsonData."）
    const cleanPath = path.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\.?/, '');
    if (!cleanPath) return obj;
    
    // 解析路径：支持 "." 和 "[]" 两种形式
    const keys = cleanPath.split(/[\.\[\]]+/).filter(k => k !== '');
    
    if (keys.length === 0) return obj;
    
    let current = obj;
    
    // 遍历到倒数第二个key，创建中间对象/数组
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];
        
        // 如果当前key不存在，根据下一个key的类型决定创建对象还是数组
        if (!(key in current)) {
            current[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        
        current = current[key];
        
        if (current === null || current === undefined) {
            return obj;
        }
    }
    
    // 设置最后一个key的值
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
    
    return obj;
};

/**
 * 安全地删除嵌套对象的属性
 * @param {Object} obj - 目标对象
 * @param {string} path - 路径字符串，如 "jsonData.name.first" 或 "jsonData[0].name"
 * @returns {Object} 修改后的对象
 */
const safeDelete = function(obj, path) {
    if (!path || typeof path !== 'string') return obj;
    
    // 移除开头的变量名（如 "jsonData."）
    const cleanPath = path.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\.?/, '');
    if (!cleanPath) return obj;
    
    // 解析路径：支持 "." 和 "[]" 两种形式
    const keys = cleanPath.split(/[\.\[\]]+/).filter(k => k !== '');
    
    if (keys.length === 0) return obj;
    
    let current = obj;
    
    // 遍历到倒数第二个key
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) return obj;
        current = current[key];
        if (current === null || current === undefined) return obj;
    }
    
    // 删除最后一个key
    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
        current.splice(parseInt(lastKey), 1);
    } else {
        delete current[lastKey];
    }
    
    return obj;
};

/**
 * 安全地初始化嵌套对象的属性（如果不存在则创建）
 * @param {Object} obj - 目标对象
 * @param {string} path - 路径字符串
 * @param {any} defaultValue - 默认值，默认为空对象 {}
 * @returns {Object} 修改后的对象
 */
const safeInit = function(obj, path, defaultValue = {}) {
    const currentValue = safeGet(obj, path);
    if (currentValue === undefined) {
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

// 将json嵌套对象展平为单层属性
const flattenJsonDataOrArray = function (jsonData, prefix = "", result = []) {
    if (dataType(jsonData) === "object") {
        Object.keys(jsonData).forEach(oneKey => {
            let resultOne = {};
            const oneData = jsonData[oneKey];
            const propName = prefix === "" ? oneKey : prefix + "." + oneKey;
            if (dataType(oneData) === "object") {
                flattenJsonDataOrArray(oneData, propName, result);
            } else if (dataType(oneData) === "array") {
                flattenJsonDataOrArray(oneData, propName, result);
            } else {
                if (dataType(oneData) === "bigint") {
                    resultOne[propName] = BigInt(`${oneData}`);
                } else if (dataType(oneData) === "number") {
                    resultOne[propName] = Number(oneData);
                } else {
                    resultOne[propName] = oneData;
                }
                result.push(resultOne);
            }
        })
    } else if (dataType(jsonData) === "array") {
        jsonData.forEach(oneData => {
            let resultOne = {};
            const propName = prefix === "" ? jsonData.indexOf(oneData) : prefix + "." + jsonData.indexOf(oneData);
            if (dataType(oneData) === "object") {
                flattenJsonDataOrArray(oneData, propName, result);
            } else if (dataType(oneData) === "array") {
                flattenJsonDataOrArray(oneData, propName, result);
            } else {
                if (dataType(oneData) === "bigint") {
                    resultOne[propName] = BigInt(`${oneData}`);
                } else if (dataType(oneData) === "number") {
                    resultOne[propName] = Number(oneData);
                } else {
                    resultOne[propName] = oneData;
                }
                result.push(resultOne);
            }
        })
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

// 辅助函数：计算行首空格数
function countLeadingSpaces(str) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === ' ') count++;
        else break;
    }
    return count;
}

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


const propertiesToJson = function (propsList) {
    let jsonData = undefined;
    // 1. 用 = 把 oneArray 拆分为 key-value
    for (let i = 0; i < propsList.length; i++) {
        let prop = propsList[i].trim();
        if (prop !== "") {
            let pair = prop.split("=");
            let propKeyStr = pair[0];
            let propValueStr = pair[1];
            // 解析 值的类型
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
            } else {
                propValueStr = propValueStr;
            }
            
            // 2. 用 propKey 拆分，并且构成 jsonData 的框架，然后再 填充 对应的 value
            const propKeys = propKeyStr.split(".");
            if (jsonData === undefined) {
                // 根据第一个key的类型决定初始化对象还是数组
                if (/^\d+$/.test(propKeys[0])) {
                    jsonData = [];
                } else {
                    jsonData = {};
                }
            }
            
            // 构建路径字符串
            let pathStr = propKeys.map(key => {
                if (/^\d+$/.test(key)) {
                    return `[${key}]`;
                } else {
                    return `.${key}`;
                }
            }).join('');
            
            // 使用安全函数设置值
            safeSet(jsonData, pathStr, propValueStr);
        }
    }
    return jsonData;
}





