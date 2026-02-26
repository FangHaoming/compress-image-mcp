import fs from 'fs'
import p from 'path'
import tinify from 'tinify'

export const MAX_FREE_COUNT = 500

/**
 * 递归读取文件夹下的所有图片文件（jpg/png/gif/webp）
 * @param {string} dirPath - 目录路径（绝对或相对 projectRoot）
 * @param {string} projectRoot - 项目根目录
 * @param {string[]} fileList - 累积结果，可选
 * @returns {string[]} 相对 projectRoot 的图片路径列表
 */
export function getAllImageFiles(dirPath, projectRoot, fileList = []) {
  const fullPath = p.isAbsolute(dirPath) ? dirPath : p.join(projectRoot, dirPath)

  if (!fs.existsSync(fullPath)) {
    return fileList
  }

  const files = fs.readdirSync(fullPath)

  files.forEach((file) => {
    const filePath = p.join(fullPath, file)
    let stat
    try {
      stat = fs.statSync(filePath)
    } catch (err) {
      return
    }

    if (stat.isDirectory()) {
      getAllImageFiles(filePath, projectRoot, fileList)
    } else if (stat.isFile() && /\.(jpg|png|gif|webp)$/i.test(file)) {
      const relativePath = p.relative(projectRoot, filePath)
      fileList.push(relativePath)
    }
  })

  return fileList
}

/**
 * 压缩图片列表（Tinify API），支持多 key 轮换
 * @param {string} projectRoot - 项目根目录
 * @param {string[]} imgFilePathList - 相对 projectRoot 的图片路径
 * @param {string[]} apiKeyList - Tinify API keys
 * @param {object} opts - { onProgress?: (current, total, path) => void }
 * @returns {Promise<{ compressed: number, failed: string[], errors: string[] }>}
 */
export async function compressImageList(projectRoot, imgFilePathList, apiKeyList, opts = {}) {
  const { onProgress } = opts
  const result = { compressed: 0, failed: [], errors: [] }
  if (!apiKeyList || apiKeyList.length === 0) {
    result.errors.push('apiKeyList 为空，请传入 apiKeyList 或配置环境变量 COMPRESS_IMAGE_API_KEYS')
    return result
  }
  if (!imgFilePathList || imgFilePathList.length === 0) {
    return result
  }

  let keyIndex = 0
  let preKeyIndex = -1

  const compressOne = async (fileIndex) => {
    if (fileIndex >= imgFilePathList.length) return

    const key = apiKeyList[keyIndex]
    const path = imgFilePathList[fileIndex]
    if (!key || !path) return

    if (preKeyIndex !== keyIndex) {
      preKeyIndex = keyIndex
      tinify.key = key
      try {
        await tinify.validate()
      } catch (err) {
        result.errors.push(`API Key 验证失败 (keyIndex=${keyIndex}): ${err.message}`)
        return
      }
    }

    const compressedCount = tinify.compressionCount || 0
    const filePath = p.join(projectRoot, path)

    if (compressedCount + fileIndex + 1 >= MAX_FREE_COUNT) {
      keyIndex++
      if (keyIndex >= apiKeyList.length) {
        result.errors.push(`已达免费额度且无更多 Key，已压缩 ${result.compressed} 张`)
        return
      }
      return compressOne(fileIndex)
    }

    try {
      const source = await tinify.fromFile(filePath)
      await source.toFile(filePath)
      result.compressed++
      if (onProgress) onProgress(fileIndex + 1, imgFilePathList.length, path)
    } catch (err) {
      result.failed.push(path)
      result.errors.push(`${path}: ${err.message}`)
      if (onProgress) onProgress(fileIndex + 1, imgFilePathList.length, path)
    }

    return compressOne(fileIndex + 1)
  }

  await compressOne(0)
  return result
}
