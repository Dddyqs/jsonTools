const yaml = require("./assets/js-yaml");
const fs = require('fs');
const path = require('path');
const { raw: jaqRaw, json: jaqJson, version: jaqVersion } = require("./assets/jaq-index.js");
window.path = path;
window.yaml = yaml;
window.fs = fs;
window.jaqWasm = { raw: jaqRaw, json: jaqJson, version: jaqVersion };
