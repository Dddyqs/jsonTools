const yaml = require("./assets/js-yaml");
const fs = require('fs');
const path = require('path');
const { raw: jqRaw, json: jqJson, version: jqVersion } = require("jq-wasm");
window.path = path;
window.yaml = yaml;
window.fs = fs;
window.jqWasm = { raw: jqRaw, json: jqJson, version: jqVersion };