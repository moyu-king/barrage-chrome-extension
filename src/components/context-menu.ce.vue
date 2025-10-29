<script setup lang="ts">
import type { DropdownInstance } from 'element-plus'

const emits = defineEmits(['delete', 'update'])

const dropdownRef = ref<DropdownInstance>()
const position = ref<DOMRect>(new DOMRect(0, 0, 0, 0))

const triggerRef = ref({
  getBoundingClientRect: () => position.value,
})

function handleContextmenu(event: MouseEvent) {
  const { clientX, clientY } = event

  position.value = new DOMRect(clientX, clientY, 0, 0)
  event.preventDefault()
  dropdownRef.value?.handleOpen()
}
</script>

<template>
  <div class="context-menu" @contextmenu.prevent="handleContextmenu($event)">
    <slot />
    <el-dropdown
      ref="dropdownRef"
      :virtual-ref="triggerRef"
      :show-arrow="false"
      :popper-options="{
        strategy: 'fixed',
        modifiers: [
          { name: 'offset', options: { offset: [0, 0] } },
        ],
      }"
      :teleported="false"
      :persistent="false"
      virtual-triggering
      trigger="contextmenu"
      placement="bottom-start"
    >
      >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="emits('delete')">
            删除
          </el-dropdown-item>
          <el-dropdown-item @click="emits('update')">
            重命名
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style lang="scss">
.context-menu {
  .el-dropdown {
    position: absolute;

    .el-scrollbar {
      padding-right: 0;
    }
  }

  .el-popper:focus {
    outline: none !important;
  }
}
</style>
