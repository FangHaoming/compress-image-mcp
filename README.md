# compress-image MCP Server

基于 Tinify 的图片压缩 MCP 服务，供 Cursor 等客户端调用。

## 安装

从 npm 安装（无需克隆仓库）：

```bash
npm install -g compress-image-mcp
```

或使用 npx 直接运行（无需全局安装）。

## 在 Cursor 中启用

在 Cursor 的 MCP 配置（如 `~/.cursor/mcp.json`）的 `mcpServers` 中添加：

```json
{
  "mcpServers": {
    "compress-image": {
      "command": "npx",
      "args": ["compress-image-mcp"],
      "env": {
        "COMPRESS_IMAGE_API_KEYS": "你的API-Key，多个用英文逗号分隔"
      }
    }
  }
}
```

- **command/args**：使用 `npx compress-image-mcp` 会按需拉取并运行 npm 包，无需本地路径。
- **env.COMPRESS_IMAGE_API_KEYS**：Tinify API Key，在 [tinypng.com](https://tinypng.com/) 注册并获取，多个用英文逗号分隔。配置后调用 `compress_image` 时可不传 `apiKeyList`；调用时若传了 `apiKeyList` 则优先用传入的。

将 `你的API-Key` 替换为在 https://tinypng.com/ 获取的实际 Key。保存后重启 Cursor，即可在对话中调用 `compress_image` 工具。

## 工具说明

- **compress_image**
  - `imagePath`（可选）：要压缩的**单个图片路径**（相对项目根或绝对路径）。若同时传入 `imagePath` 与 `folderPath`，将**优先使用 `imagePath`**。
  - `folderPath`（可选）：要压缩的目录路径（相对项目根或绝对路径）。不传且未指定 `imagePath` 时，将压缩当前 git 暂存区中的图片。
  - `apiKeyList`（可选）：Tinify API Key 数组。不传时使用 `COMPRESS_IMAGE_API_KEYS` 环境变量（英文逗号分隔）。
  - 支持格式：jpg、png、gif、webp。

### 使用示例

#### 1. 压缩单个图片

在对话中让 Cursor 调用 MCP 工具时，可传入：

```json
{
  "tool": "compress_image",
  "arguments": {
    "imagePath": "assets/images/logo.png"
  }
}
```

#### 2. 压缩某个目录下的所有图片

```json
{
  "tool": "compress_image",
  "arguments": {
    "folderPath": "assets/images"
  }
}
```

#### 3. 压缩 git 暂存区中的图片

不传 `imagePath` 和 `folderPath`，只需确保图片已 `git add` 到暂存区，然后在对话中调用 `compress_image` 即可自动查找并压缩暂存区中的图片。
