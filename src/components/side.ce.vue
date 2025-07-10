<script setup lang="ts">
import { CaretRight, Refresh, Switch } from '@element-plus/icons-vue'

const prefix = 'crx-side'
</script>

<template>
  <div :class="prefix">
    <div class="crx-float-bubble">
      <span style="transform: scale(0.9)">12:30</span>
    </div>
    <div :class="`${prefix}__controls`">
      <el-icon :size="18">
        <CaretRight />
      </el-icon>
      <el-icon>
        <Refresh />
      </el-icon>
      <el-icon>
        <Switch />
      </el-icon>
    </div>
  </div>
</template>

<style lang="scss">
@use 'element-plus/theme-chalk/el-icon.css';

.crx-side {
  position: fixed;
  top: 10%;
  // right: -72px;
  right: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 110px;
  height: 36px;
  padding: 0 5px;
  background-color: #fff;
  border-radius: 16px 0 0 16px;
  user-select: none;
  transform: translateY(-50%);
  box-shadow: 0 0 8px rgba(0, 0, 0, 15%);
  transition: right 500ms ease;
  color: #fff;
  opacity: 50%;
  transition: opacity 300ms ease;
}

.crx-side:hover {
  right: 0;
  opacity: 100%;
}

.crx-float-bubble {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 28px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  background-image: linear-gradient(100deg, rgba(125, 165, 255, 95%) 0.67%, #6978ff 64%)
}
.crx-side__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;

  .el-icon {
    color: rgba(0, 0, 0, 70%);
    cursor: pointer;

    &:hover {
      color: #6978ff;
    }
  }
}
</style>
