<script setup lang="ts">
const prefix = 'crx-episode'
</script>

<template>
  <div :class="`${prefix}`">
    <div :class="`${prefix}__header`">
      <el-icon size="18">
        <Setting />
      </el-icon>
    </div>
    <div :class="`${prefix}__content`"></div>
  </div>
</template>