# jaq 二进制文件

本目录已预装 jaq v3.0.0 二进制文件，插件开箱即用，无需用户手动安装。

## 已包含的平台

| 文件名 | 平台 | 架构 | 大小 |
|--------|------|------|------|
| `jaq-macos-arm64` | macOS | Apple Silicon (M1/M2/M3) | ~3.7MB |
| `jaq-macos-x64` | macOS | Intel | ~4.0MB |
| `jaq-linux-x64` | Linux | x86_64 | ~4.3MB |
| `jaq.exe` | Windows | x86_64 | ~4.7MB |

## 工作原理

`assets/jaq-index.js` 会根据运行平台自动选择正确的二进制文件：

```javascript
// macOS (arm64)  → jaq-macos-arm64
// macOS (x64)    → jaq-macos-x64  
// Linux (x64)    → jaq-linux-x64
// Windows (x64)  → jaq.exe
```

## 如需更新

从 GitHub Releases 下载新版本：
https://github.com/01mf02/jaq/releases/latest

## 相关链接

- jaq GitHub: https://github.com/01mf02/jaq
- jq 官方手册: https://stedolan.github.io/jq/manual/
