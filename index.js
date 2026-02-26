#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getAllImageFiles, compressImageList } from './core.js'

// MCP 由 Cursor 启动时 cwd 一般为工作区根目录
const projectRoot = process.cwd()

// 默认 Key：从环境变量 COMPRESS_IMAGE_API_KEYS 读取（逗号分隔），可在 mcp.json 的 env 中配置
const defaultApiKeyList = (process.env.COMPRESS_IMAGE_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

const server = new McpServer({
  name: 'compress-image',
  version: '1.0.0',
})

async function handleCompressImage(args) {
  const folderPath = args && args.folderPath
  const keys =
    args && args.apiKeyList && args.apiKeyList.length ? args.apiKeyList : defaultApiKeyList
  if (!keys || keys.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: '未配置 Tinify API Key。请在 mcp.json 的 compress-image.env 中设置 COMPRESS_IMAGE_API_KEYS（逗号分隔），或调用时传入 apiKeyList 参数。',
        },
      ],
    }
  }
  let imgFilePathList = []
  if (folderPath) {
    imgFilePathList = getAllImageFiles(folderPath, projectRoot)
    if (imgFilePathList.length === 0) {
      return {
        content: [
          { type: 'text', text: `路径不存在或该目录下没有 jpg/png/gif/webp 图片: ${folderPath}` },
        ],
      }
    }
  } else {
    const { execSync } = await import('child_process')
    try {
      const diffOutput = execSync('git diff --staged --diff-filter=ACMR --name-only -z', {
        encoding: 'utf8',
        cwd: projectRoot,
      })
      const filePaths = diffOutput.trim() ? diffOutput.trim().split('\x00') : []
      imgFilePathList = filePaths.filter((item) => /\.(jpg|png|gif|webp)$/i.test(item))
    } catch (e) {
      return {
        content: [
          {
            type: 'text',
            text: `获取 git 暂存区文件失败: ${e.message}。可传入 folderPath 指定目录压缩。`,
          },
        ],
      }
    }
    if (imgFilePathList.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '暂存区中没有 jpg/png/gif/webp 图片。请先 git add 图片文件，或传入 folderPath 指定目录。',
          },
        ],
      }
    }
  }

  const lines = []
  const result = await compressImageList(projectRoot, imgFilePathList, keys, {
    onProgress(current, total, filePath) {
      lines.push(`[${current}/${total}] 已压缩: ${filePath}`)
    },
  })

  let text = `共处理 ${imgFilePathList.length} 张，成功压缩 ${result.compressed} 张。`
  if (result.failed.length) {
    text += `\n失败 ${result.failed.length} 张: ${result.failed.join(', ')}`
  }
  if (result.errors.length) {
    text += '\n' + result.errors.join('\n')
  }
  if (lines.length) {
    text += '\n\n' + lines.join('\n')
  }

  return {
    content: [{ type: 'text', text }],
  }
}

server.registerTool(
  'compress_image',
  {
    description:
      '使用 Tinify 压缩项目中的图片（jpg/png/gif/webp）。可指定 folderPath 压缩该目录下所有图片，不指定则压缩 git 暂存区中的图片。API Key 可在 mcp.json 的 env.COMPRESS_IMAGE_API_KEYS 中配置，或调用时传 apiKeyList。',
    inputSchema: {
      folderPath: z
        .string()
        .optional()
        .describe(
          '可选。要压缩的目录路径（相对项目根或绝对路径）。不传则压缩当前 git 暂存区中的图片。',
        ),
      apiKeyList: z
        .array(z.string())
        .optional()
        .describe(
          '可选。Tinify API Key 数组。不传则使用 mcp.json 中 env.COMPRESS_IMAGE_API_KEYS 的配置（逗号分隔）。',
        ),
    },
  },
  handleCompressImage,
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('compress-image MCP Server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
