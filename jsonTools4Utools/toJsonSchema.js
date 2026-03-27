let schemaOptionMap = undefined;

// 辨别数据类型
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


// 获取单个 json值的 schema数据
const getOneSchemaData = function (oneValueData) {
    const oneSchemaData = {};
    // 1.先找公共部分
    if (dataType(oneValueData) !== "error") {
        if (schemaOptionMap && schemaOptionMap.any.type) {
            const valueType = dataType(oneValueData);
            if (valueType === "int" || valueType === "bigint") {
                oneSchemaData["type"] = "integer";
            } else {
                oneSchemaData["type"] = valueType;
            }
        }
        if (
            schemaOptionMap &&
            schemaOptionMap.any.enum &&
            dataType(oneValueData) !== "object" &&
            dataType(oneValueData) !== "array"
        ) {
            if (dataType(oneValueData) === 'bigint') {
                oneSchemaData["enum"] = [BigInt(oneValueData)];
            } else if (dataType(oneValueData) === "number") {
                oneSchemaData["enum"] = [Number(oneValueData)];
            } else {
                oneSchemaData["enum"] = [oneValueData];
            }
        }
        if (
            schemaOptionMap &&
            schemaOptionMap.any.const &&
            dataType(oneValueData) !== "object" &&
            dataType(oneValueData) !== "array"
        ) {
            if (dataType(oneValueData) === 'bigint') {
                oneSchemaData["const"] = BigInt(oneValueData);
            } else if (dataType(oneValueData) === "number") {
                oneSchemaData["const"] = Number(oneValueData);
            } else {
                oneSchemaData["const"] = oneValueData;
            }
        }
    }
    // 2.再定义不同类型部分
    if (dataType(oneValueData) === "string") {
        if (schemaOptionMap && schemaOptionMap.string.minLength) {
            oneSchemaData["minLength"] = oneValueData.length;
        }
        if (schemaOptionMap && schemaOptionMap.string.maxLength) {
            oneSchemaData["maxLength"] = oneValueData.length;
        }
    } else if (dataType(oneValueData) === "int") {
        if (schemaOptionMap && schemaOptionMap.number.minimum) {
            oneSchemaData["minimum"] = oneValueData;
        }
        if (schemaOptionMap && schemaOptionMap.number.maximum) {
            oneSchemaData["maximum"] = oneValueData;
        }
    } else if (dataType(oneValueData) === "bigint") {
        if (schemaOptionMap && schemaOptionMap.number.minimum) {
            oneSchemaData["minimum"] = BigInt(oneValueData);
        }
        if (schemaOptionMap && schemaOptionMap.number.maximum) {
            oneSchemaData["maximum"] = BigInt(oneValueData);
        }
    } else if (dataType(oneValueData) === "number") {
        if (schemaOptionMap && schemaOptionMap.number.minimum) {
            oneSchemaData["minimum"] = Number(oneValueData);
        }
        if (schemaOptionMap && schemaOptionMap.number.maximum) {
            oneSchemaData["maximum"] = Number(oneValueData);
        }
    } else if (dataType(oneValueData) === "boolean") {
        // if (schemaOptionMap && schemaOptionMap.any.enum) {
        //     oneSchemaData['enum'] = [oneValueData];
        // }
    } else if (dataType(oneValueData) === "null") {
        // if (schemaOptionMap && schemaOptionMap.any.enum) {
        //     oneSchemaData['enum'] = [oneValueData];
        // }
    } else if (dataType(oneValueData) === "object") {
        // 如果是一个 空dict 则默认 const = {}
        if (Object.keys(oneValueData).length === 0 && schemaOptionMap.any.const) {
            oneSchemaData["const"] = {};
        }
        if (schemaOptionMap && schemaOptionMap.object.properties) {
            oneSchemaData["properties"] = {};
        }
        const requireArray = Object.keys(oneValueData);
        if (schemaOptionMap && schemaOptionMap.object.required) {
            requireArray.forEach((oneKey) => {
                // 删除 null 值的 required
                if (
                    (oneValueData[oneKey] === null) ||
                    (oneValueData[oneKey] === "null")
                ) {
                    requireArray.pop(oneKey);
                }
            });
            oneSchemaData["required"] = requireArray;
        }
        if (schemaOptionMap && schemaOptionMap.object.minProperties) {
            if (requireArray) {
                oneSchemaData["minProperties"] = requireArray.length
            } else {
                oneSchemaData["minProperties"] = Object.keys(oneValueData).length;
            }
        }
        if (schemaOptionMap && schemaOptionMap.object.maxProperties) {
            oneSchemaData["maxProperties"] = Object.keys(oneValueData).length;
        }
    } else if (dataType(oneValueData) === "array") {
        // 如果是一个 空array 则默认 const = []
        if (oneValueData.length === 0 && schemaOptionMap.any.const) {
            oneSchemaData["const"] = [];
        }
        if (schemaOptionMap && schemaOptionMap.array.items) {
            if (oneValueData.length > 0) {
                oneSchemaData["items"] = [];
            }
        }
        if (schemaOptionMap && schemaOptionMap.array.minItems) {
            oneSchemaData["minItems"] = oneValueData.length;
        }
        if (schemaOptionMap && schemaOptionMap.array.maxItems) {
            oneSchemaData["maxItems"] = oneValueData.length;
        }
        if (schemaOptionMap && schemaOptionMap.array.uniqueItems) {
            oneSchemaData["uniqueItems"] = schemaOptionMap.array.uniqueItems;
        }
    }
    return oneSchemaData;
};

// 获取array类型的schema数据
const getArraySchemaData = function (schemaData, jsonArrayData) {
    // 此处的 array 至少有 1 个数据
    if (Object.keys(schemaData).indexOf("items") !== -1) {
        jsonArrayData.forEach((arrayItem) => {
            let schemaItem = getOneSchemaData(arrayItem);;
            if (dataType(arrayItem) === "object") {
                schemaItem = getObjcetSchemaData(getOneSchemaData(arrayItem), arrayItem);
            } else if (dataType(arrayItem) === "array") {
                if (arrayItem.length > 0) {
                    schemaItem = getArraySchemaData(getOneSchemaData(arrayItem), arrayItem);
                }
            }
            // 去重
            if (!schemaData["items"].some(item => _.isEqual(item, schemaItem))) {
                schemaData["items"].push(schemaItem);
            }
        });
    }
    return schemaData;
};

// 获取object类型的schema数据
const getObjcetSchemaData = function (schemaData, jsonObjectData) {
    if (Object.keys(schemaData).indexOf("properties") !== -1) {
        const objectKeys = Object.keys(jsonObjectData);
        objectKeys.forEach((dataItem) => {
            const dataItemKey = dataItem;
            const dataItemValue = jsonObjectData[dataItem];
            if (dataType(dataItemValue) === "object") {
                if (dataItemKey.indexOf("dynamic") !== -1) {
                    dataItemKey = dataItemKey.split("_")[0];
                }
                schemaData["properties"][dataItemKey] = getObjcetSchemaData(
                    getOneSchemaData(dataItemValue),
                    dataItemValue
                );
            } else if (dataType(dataItemValue) === "array") {
                if (dataItemValue.length > 0) {
                    schemaData["properties"][dataItemKey] = getArraySchemaData(
                        getOneSchemaData(dataItemValue),
                        dataItemValue
                    );
                } else {
                    schemaData["properties"][dataItemKey] =
                        getOneSchemaData(dataItemValue);
                }
            } else {
                schemaData["properties"][dataItemKey] = getOneSchemaData(dataItemValue);
            }
        });
    }
    // 给本身追加 required
    if (schemaOptionMap && schemaOptionMap.object.required) {
        const requireArray = Object.keys(jsonObjectData);
        requireArray.forEach((oneKey) => {
            // 删除 null 值的 required
            if (
                (jsonObjectData[oneKey] === null) ||
                (jsonObjectData[oneKey] === "null")
            ) {
                requireArray.pop(oneKey);
            }
        });
        schemaData["required"] = requireArray;
    }
    return schemaData;
};

// json生成jsonSchema
const getJsonSchemaData = function (json, schemaOption) {
    schemaOptionMap = schemaOption;
    let time = new Date();
    let timeInfo =
        time.getFullYear() +
        "年" +
        (time.getMonth() + 1) +
        "月" +
        time.getDate() +
        "日" +
        time.getHours() +
        ":" +
        time.getMinutes() +
        ":" +
        time.getSeconds();
    try {
        if (dataType(json) === "array") {
            const schemaData = Object.assign(
                {
                    title: "JsonSchema7, " + timeInfo,
                    description: "utools工具 - jsonTools, 自动生成。",
                },
                getOneSchemaData(json)
            );
            return getArraySchemaData(schemaData, json);
        } else if (dataType(json) === "object") {
            const schemaData = Object.assign(
                {
                    title: "JsonSchema7, " + timeInfo,
                    description: "utools工具 - jsonTools, 自动生成。",
                },
                getOneSchemaData(json)
            );
            return getObjcetSchemaData(schemaData, json);
        } else {
            throw new Error("jsonData error: is not object or array");
        }
    } catch (error) {
        throw error;
    }
};

// 根据 paths 更新原 JSON
const updateJsonLoop = function (json, pathArray, value) {
    // 使用 jsonpath 库的安全方法设置值
    if (pathArray && pathArray.length > 0) {
        // 将 pathArray 转换为路径字符串
        let pathStr = '';
        for (let i = 1; i < pathArray.length; i++) {
            const key = pathArray[i];
            if (typeof key === 'number') {
                pathStr += `[${key}]`;
            } else {
                pathStr += `.${key}`;
            }
        }
        
        // 使用安全函数设置值
        safeSet(json, pathStr, value);
    }
    return json;
};

// 更新jsonSchema
const updateJsonSchema = function (
    jsonData,
    jsonSchema,
    schemaOption,
    updatePathArray
) {
    schemaOptionMap = schemaOption;
    const schemaPaths = [];
    const jsonPaths = [];
    // 1. 先把 pathStr 转换为 pathStr， 后面才好根据路径来处理数据
    updatePathArray.forEach((onePathStrOld) => {
        let onePathStr = onePathStrOld;
        if (onePathStrOld.startsWith("jsonEditorLeft▶")) {
            onePathStr = onePathStr.replace("jsonEditorLeft▶", "");
        }
        if (onePathStrOld.startsWith("jsonEditorRight▶")) {
            onePathStr = onePathStr.replace("jsonEditorRight▶", "");
        }
        const onePaths = onePathStr.split("▶");
        schemaPaths.push(onePaths);
        let jsonPathOnePathArray = onePathStr.split("▶");
        jsonPathOnePathArray.forEach((node, index) => {
            if ((node === "properties") || (node === "items")) {
                jsonPathOnePathArray.splice(index, 1);
            }
        });
        jsonPaths.push(jsonPathOnePathArray);
    });
    // 2. 根据每个 path 来修改数据
    schemaPaths.forEach((schemaPath, index) => {
        // 3. 单个 path 根据 option 来修改数据
        // 3.0 把 paths 变为 pathStr，并且获取原JSON数据
        const jsonPathExpression = jsonpath.stringify(jsonPaths[index]);
        const targetJsonData = window.JSONPath.JSONPath(jsonPathExpression, jsonData)[0];
        let newSchemaData = getOneSchemaData(targetJsonData);
        if (dataType(targetJsonData) === "object") {
            newSchemaData = getObjcetSchemaData(newSchemaData, targetJsonData);
        } else if (dataType(targetJsonData) === "array") {
            newSchemaData = getArraySchemaData(newSchemaData, targetJsonData);
        }
        jsonSchema = updateJsonLoop(jsonSchema, schemaPath, newSchemaData);
    });
    return jsonSchema;
};
