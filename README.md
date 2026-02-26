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
  - `folderPath`（可选）：要压缩的目录路径（相对项目根或绝对路径）。不传则压缩当前 git 暂存区中的图片。
  - 支持格式：jpg、png、gif、webp。
