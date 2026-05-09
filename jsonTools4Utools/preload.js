const yaml = require("./assets/js-yaml");
const { raw: jaqRaw, json: jaqJson, version: jaqVersion } = require("./assets/jaq-index.js");
window.yaml = yaml;
window.jaqWasm = { raw: jaqRaw, json: jaqJson, version: jaqVersion };
