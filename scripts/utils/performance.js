/**
 * 性能优化工具函数
 * Created: 2026-03-26
 */

// ==================== 防抖和节流 ====================

/**
 * 防抖函数 - 在事件触发后延迟执行，如果期间再次触发则重新计时
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
const debounce = function(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
};

/**
 * 节流函数 - 在指定时间内只执行一次
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
const throttle = function(fn, delay = 100) {
    let lastTime = 0;
    let timer = null;
    return function(...args) {
        const now = Date.now();
        const remaining = delay - (now - lastTime);
        
        clearTimeout(timer);
        
        if (remaining <= 0) {
            lastTime = now;
            fn.apply(this, args);
        } else {
            timer = setTimeout(() => {
                lastTime = Date.now();
                fn.apply(this, args);
            }, remaining);
        }
    };
};

// ==================== 缓存机制 ====================

/**
 * 简单的内存缓存类
 */
class SimpleCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    /**
     * 获取缓存
     */
    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            // LRU: 移到最后
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return undefined;
    }
    
    /**
     * 设置缓存
     */
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // 删除最旧的（第一个）
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    /**
     * 清除缓存
     */
    clear() {
        this.cache.clear();
    }
    
    /**
     * 获取缓存大小
     */
    size() {
        return this.cache.size;
    }
}

// 创建全局缓存实例
const jsonDataCache = new SimpleCache(50);
const jsonPathCache = new SimpleCache(100);
const jsonSchemaCache = new SimpleCache(20);

// ==================== JSON 解析优化 ====================

/**
 * 带缓存的 JSON 解析
 * @param {string} jsonStr - JSON 字符串
 * @param {Function} parseFn - 解析函数（如 LosslessJSON.parse）
 * @returns {any} 解析结果
 */
const cachedJsonParse = function(jsonStr, parseFn = JSON.parse) {
    const cacheKey = `parse_${jsonStr.length}_${jsonStr.substring(0, 50)}`;
    
    let result = jsonDataCache.get(cacheKey);
    if (result !== undefined) {
        return result;
    }
    
    try {
        result = parseFn(jsonStr);
        jsonDataCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('JSON parse error:', error);
        throw error;
    }
};

/**
 * 智能JSON解析 - 根据内容大小选择解析策略
 * @param {string} jsonStr - JSON 字符串
 * @param {Function} parseFn - 解析函数
 * @returns {any} 解析结果
 */
const smartJsonParse = function(jsonStr, parseFn = JSON.parse) {
    const sizeKB = jsonStr.length / 1024;
    
    // 小于 10KB 直接解析
    if (sizeKB < 10) {
        return parseFn(jsonStr);
    }
    
    // 10-100KB 使用缓存
    if (sizeKB < 100) {
        return cachedJsonParse(jsonStr, parseFn);
    }
    
    // 大于 100KB 分块解析（避免主线程阻塞）
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = parseFn(jsonStr);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, 0);
    });
};

// ==================== 批量操作优化 ====================

/**
 * 批量处理函数 - 分批处理大量数据，避免阻塞主线程
 * @param {Array} items - 要处理的数据数组
 * @param {Function} processFn - 处理函数
 * @param {number} batchSize - 每批处理数量
 * @returns {Promise<Array>} 处理结果数组
 */
const batchProcess = async function(items, processFn, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
        
        // 让出主线程
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
};

// ==================== 性能监控 ====================

/**
 * 性能计时器
 */
class PerformanceTimer {
    constructor(name) {
        this.name = name;
        this.startTime = null;
        this.endTime = null;
    }
    
    start() {
        this.startTime = performance.now();
        return this;
    }
    
    end() {
        this.endTime = performance.now();
        const duration = this.endTime - this.startTime;
        console.log(`⏱️ ${this.name}: ${duration.toFixed(2)}ms`);
        return duration;
    }
}

/**
 * 性能装饰器 - 自动测量函数执行时间
 * @param {Function} fn - 要测量的函数
 * @param {string} name - 函数名称
 * @returns {Function} 包装后的函数
 */
const measurePerformance = function(fn, name = fn.name) {
    return function(...args) {
        const timer = new PerformanceTimer(name);
        timer.start();
        const result = fn.apply(this, args);
        
        if (result instanceof Promise) {
            return result.finally(() => timer.end());
        } else {
            timer.end();
            return result;
        }
    };
};

// ==================== 内存优化 ====================

/**
 * 清理内存 - 清空缓存
 */
const cleanupMemory = function() {
    jsonDataCache.clear();
    jsonPathCache.clear();
    jsonSchemaCache.clear();
    console.log('🧹 内存缓存已清理');
};

/**
 * 获取内存使用情况
 */
const getMemoryUsage = function() {
    if (performance && performance.memory) {
        const used = performance.memory.usedJSHeapSize / 1024 / 1024;
        const total = performance.memory.totalJSHeapSize / 1024 / 1024;
        return {
            used: used.toFixed(2),
            total: total.toFixed(2),
            percentage: ((used / total) * 100).toFixed(2)
        };
    }
    return null;
};

// ==================== 导出 ====================

// 全局暴露（用于 uTools 插件）
if (typeof window !== 'undefined') {
    window.PerfUtils = {
        debounce,
        throttle,
        SimpleCache,
        cachedJsonParse,
        smartJsonParse,
        batchProcess,
        PerformanceTimer,
        measurePerformance,
        cleanupMemory,
        getMemoryUsage,
        // 缓存实例
        jsonDataCache,
        jsonPathCache,
        jsonSchemaCache
    };
}

// 供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        SimpleCache,
        cachedJsonParse,
        smartJsonParse,
        batchProcess,
        PerformanceTimer,
        measurePerformance,
        cleanupMemory,
        getMemoryUsage
    };
}
