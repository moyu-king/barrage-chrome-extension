<script setup lang="ts">
const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  clickable: {
    type: Boolean,
    default: true,
  },
})

const prefix = 'scroll-label'
const contentEl = ref<HTMLElement>()
const contentElWidth = ref(0)
const scrollEl = ref<HTMLElement>()
const scrollElWidth = ref(0)
const isHiddenCopy = ref(false)

const isScroll = computed(() => scrollElWidth.value > contentElWidth.value)

onMounted(() => {
  watch(() => props.content, playTextScroll, { immediate: true })
})

async function playTextScroll() {
  if (!scrollEl.value || !contentEl.value)
    return

  await nextTick()

  scrollElWidth.value = scrollEl.value.offsetWidth
  contentElWidth.value = contentEl.value.offsetWidth

  if (isScroll.value) {
    scrollEl.value.classList.add('animate')
    scrollEl.value.style.animationDuration = `${scrollElWidth.value / 20}s`
  }
  else {
    scrollEl.value.classList.remove('animate')
    scrollEl.value.style.animationDuration = '0s'
  }
}

function handleMouseEnter() {
  if (!isScroll.value || !scrollEl.value)
    return

  scrollEl.value.classList.remove('animate')
  scrollEl.value.classList.add('pause')
}

function handleMouseLeave() {
  if (!isScroll.value || !scrollEl.value)
    return

  void scrollEl.value.offsetWidth
  scrollEl.value.classList.remove('pause')
  scrollEl.value.classList.add('animate')
}
</script>

<template>
  <div
    ref="contentEl"
    :class="prefix"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      v-if="content"
      ref="scrollEl"
      :class="`${prefix}__scroll`"
      :style="{ cursor: clickable ? 'pointer' : 'default' }"
      :title="isScroll ? content : undefined"
      @mouseenter="isHiddenCopy = true"
      @mouseleave="isHiddenCopy = false"
    >
      <span :style="{ paddingRight: isScroll && !isHiddenCopy ? `${contentElWidth}px` : undefined }">{{ content }}</span>
      <span v-if="isScroll && !isHiddenCopy" :style="{ paddingRight: `${contentElWidth}px` }">
        {{ content }}
      </span>
    </div>
  </div>
</template>

<style lang="scss">
.scroll-label {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;

  &__scroll {
    display: inline-block;
    width: fit-content;
    will-change: transform;

    &.animate {
      animation: scroll-text linear infinite;
    }

    &.pause {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      transform: translateX(0);
    }
  }
}

@keyframes scroll-text {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}
</style>
