"use strict";
/**
 * jaq-index.js
 * 
 * A wrapper around the native jaq command-line tool using child_process.
 * Provides the same API as jq-wasm/jq-index.js for seamless replacement.
 * 
 * API:
 *   - raw(json, query, flags): Execute jaq and return { stdout, stderr, exitCode }
 *   - json(json, query, flags): Execute jaq and return parsed JSON result
 *   - version(): Return jaq version string
 */

const { spawn } = require('child_process');

/**
 * Find jaq executable path
 * @returns {string} Path to jaq executable
 */
function getJaqPath() {
    const path = require('path');
    const fs = require('fs');
    
    // 插件 bin 目录下的 jaq 二进制文件
    const binDir = path.join(__dirname, '..', 'bin');
    const platform = process.platform;
    const arch = process.arch;
    
    let jaqName;
    if (platform === 'win32') {
        jaqName = 'jaq.exe';
    } else if (platform === 'darwin') {
        // macOS: arm64 (M1/M2/M3) 或 x64 (Intel)
        jaqName = arch === 'arm64' ? 'jaq-macos-arm64' : 'jaq-macos-x64';
    } else {
        // Linux: 默认使用 x64，支持其他架构需要额外下载
        jaqName = arch === 'arm64' ? 'jaq-linux-arm64' : 'jaq-linux-x64';
    }
    
    const localPath = path.join(binDir, jaqName);
    if (fs.existsSync(localPath)) {
        return localPath;
    }
    
    // 备用：尝试不带架构后缀的通用名称
    const genericPath = path.join(binDir, platform === 'win32' ? 'jaq.exe' : 'jaq');
    if (fs.existsSync(genericPath)) {
        return genericPath;
    }
    
    // 最后尝试系统 PATH 中的 jaq
    return 'jaq';
}

/**
 * Cached jaq path
 */
let jaqPath = null;
let versionCache = null;

/**
 * Execute jaq command and return raw output
 * 
 * @param {string|object} json - The input JSON (string or object)
 * @param {string} query - The jaq/jq query string
 * @param {string[]} flags - Optional jaq flags (e.g., ["-r", "-c"])
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 * @throws {TypeError} If input types are invalid
 */
async function raw(json, query, flags = []) {
    if (typeof query !== "string") {
        throw new TypeError("Invalid argument: 'query' must be a string");
    }
    
    let input;
    if (typeof json === "string") {
        input = json;
    } else if (json && typeof json === "object") {
        try {
            input = JSON.stringify(json);
        } catch (err) {
            throw new Error(`Failed to serialize input object: ${err.message}`);
        }
    } else {
        throw new TypeError("Invalid argument: 'json' must be a string or non-null object");
    }
    
    // Get jaq path (cached)
    if (!jaqPath) {
        jaqPath = getJaqPath();
    }
    
    return new Promise((resolve, reject) => {
        const args = [...flags, query];
        
        const proc = spawn(jaqPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32'
        });
        
        let stdout = '';
        let stderr = '';
        let resolved = false;
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('close', (exitCode) => {
            if (!resolved) {
                resolved = true;
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: exitCode || 0
                });
            }
        });
        
        proc.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                reject(new Error(`Failed to execute jaq: ${err.message}. Please ensure jaq is installed and in PATH.`));
            }
        });
        
        // Set timeout to prevent hanging
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                proc.kill();
                reject(new Error('jaq execution timeout'));
            }
        }, 30000);
        
        // Write input to stdin
        try {
            proc.stdin.write(input);
            proc.stdin.end();
        } catch (err) {
            if (!resolved) {
                resolved = true;
                reject(new Error(`Failed to write to jaq stdin: ${err.message}`));
            }
        }
    });
}

/**
 * Execute jaq query and return parsed JSON result
 * Throws if jaq produces any stderr output
 * 
 * @param {string|object} json - The input JSON
 * @param {string} query - The jaq/jq query
 * @param {string[]} flags - Optional jaq flags
 * @returns {Promise<any>} Parsed JSON or an array of parsed results
 * @throws {Error} If stderr is non-empty or JSON parsing fails
 */
async function json(json, query, flags = []) {
    if (typeof query !== "string") {
        throw new TypeError("Invalid argument: 'query' must be a string");
    }
    
    // Add compact flag if not present
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
    
    // Parse output - could be single JSON or multiple lines
    const lines = stdout.split("\n").filter(Boolean);
    
    try {
        if (lines.length === 1) {
            return JSON.parse(lines[0]);
        }
        return lines.map(line => JSON.parse(line));
    } catch {
        throw new Error(stdout);
    }
}

/**
 * Get jaq version string
 * 
 * @returns {Promise<string>} Version string (e.g., "jaq 1.3.0")
 */
async function version() {
    if (versionCache) {
        return versionCache;
    }
    
    // Get jaq path
    if (!jaqPath) {
        jaqPath = getJaqPath();
    }
    
    return new Promise((resolve, reject) => {
        const proc = spawn(jaqPath, ['--version'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32'
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('close', (exitCode) => {
            if (exitCode === 0 && stdout.trim()) {
                versionCache = stdout.trim();
                resolve(versionCache);
            } else {
                // Fallback: try to get version from error output or return unknown
                versionCache = stderr.trim() || 'jaq (version unknown)';
                resolve(versionCache);
            }
        });
        
        proc.on('error', () => {
            versionCache = 'jaq (not installed)';
            resolve(versionCache);
        });
    });
}

module.exports = { raw, json, version };
