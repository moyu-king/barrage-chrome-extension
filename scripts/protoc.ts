import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'

import enquirer from 'enquirer'

async function main() {
  const rootDir = resolve(fileURLToPath(import.meta.url), '../../')
  const protoDir = resolve(rootDir, 'src/protobuf')
  const outputDir = resolve(protoDir, 'compiler')
  const files = readdirSync(protoDir).filter(f => f.endsWith('.proto'))

  if (!files.length) {
    console.log('不存在可编译的文件.proto!')
    exit()
  }

  const { protoFile } = await enquirer.prompt<{ protoFile: string }>({
    type: 'select',
    name: 'protoFile',
    message: '请选择需要编译的.proto文件',
    choices: files,
  })

  const protoFilePath = resolve(protoDir, protoFile)
  const jsFilePath = resolve(outputDir, protoFile.replace('.proto', '.js'))
  const dtsFilePath = resolve(outputDir, protoFile.replace('.proto', '.d.ts'))
  const command = [
    `pnpm --package=protobufjs-cli dlx  pbjs -t static-module -w es6 -o "${jsFilePath}" "${protoFilePath}"`,
    `pnpm --package=protobufjs-cli dlx pbts -o "${dtsFilePath}" "${jsFilePath}"`,
  ].join(' && ')
  execSync(command, { stdio: 'inherit' })
}

main()
