import antfu from '@antfu/eslint-config'

export default antfu({
  // 可选的配置项
  typescript: true,
  vue: true,
  rules: {
    'no-console': 'off',
  },
  ignores: [
    'src/protobuf/**/*',
  ],
})
