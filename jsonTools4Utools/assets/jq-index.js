"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.raw = raw;
exports.json = json;
exports.version = version;
/**
 * index.ts
 *
 * A high-performance wrapper around the Emscripten-compiled jq runtime.
 * Provides:
 *   - A singleton, lazy-loaded jq instance
 *   - Promise-based functions: raw() and json()
 *   - Automatic JSON stringification and parsing
 *   - Efficient buffer handling and minimal overhead
 *   - A function to get the underlying jq version
 */
const jq_js_1 = __importDefault(require("./jq.js"));
let instancePromise = null;
/**
 * Lazily initializes and retrieves the jq instance.
 */
function getInstance() {
    if (!instancePromise) {
        instancePromise = (0, jq_js_1.default)();
    }
    return instancePromise;
}
/**
 * Executes a jq query and returns both stdout, stderr, and the exit code.
 *
 * @param json - The input JSON (string or object).
 * @param query - The jq query string.
 * @param flags - Optional jq flags (e.g., ["-r", "-c"]).
 * @returns A promise resolving to { stdout, stderr, exitCode }.
 * @throws {TypeError} If input types are invalid.
 */
async function raw(json, query, flags = []) {
    if (typeof query !== "string") {
        throw new TypeError("Invalid argument: 'query' must be a string");
    }
    let input;
    if (typeof json === "string") {
        input = json;
    }
    else if (json && typeof json === "object") {
        try {
            input = JSON.stringify(json);
        }
        catch (err) {
            throw new Error(`Failed to serialize input object: ${err.message}`);
        }
    }
    else {
        throw new TypeError("Invalid argument: 'json' must be a string or non-null object");
    }
    const instance = await getInstance();
    return instance.raw(input, query, flags);
}
/**
 * Executes a jq query and returns the parsed JSON result.
 * Throws if jq produces any stderr output.
 *
 * @param json - The input JSON.
 * @param query - The jq query.
 * @param flags - Optional jq flags.
 * @returns Parsed JSON or an array of parsed results.
 * @throws If stderr is non-empty or JSON parsing fails.
 */
async function json(json, query, flags = []) {
    if (typeof query !== "string") {
        throw new TypeError("Invalid argument: 'query' must be a string");
    }
    if (!flags.includes("-c")) {
        flags = ["-c", ...flags];
    }
    const { stdout, stderr } = await raw(json, query, flags);
    if (stderr) {
        const message = stdout ? `${stdout}\n${stderr}` : stderr;
        throw new Error(message.trim());
    }
    if (!stdout) {
        return null;
    }
    const lines = stdout.split("\n").filter(Boolean);
    try {
        if (lines.length === 1) {
            return JSON.parse(lines[0]);
        }
        return lines.map(line => JSON.parse(line));
    }
    catch {
        throw new Error(stdout);
    }
}
/**
 * Retrieves the underlying jq version string.
 *
 * @returns A promise that resolves to the jq version string.
 */
async function version() {
    const instance = await getInstance();
    return instance.version();
}
