import antfu from '@antfu/eslint-config'

export default antfu({
  // 可选的配置项
  typescript: true, // 如果是 TS 项目
  vue: true, // 如果是 Vue 项目
  rules: {
    // 自定义规则
    'no-console': 'off',
  },
})
