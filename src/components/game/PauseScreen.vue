<template>
  <div class="absolute inset-0 z-[210] bg-white font-sans text-gray-900">
    <button
      type="button"
      class="absolute top-4 right-4 h-11 w-11 text-xl leading-none hover:bg-gray-100 cursor pointer transition-colors"
      @click="$emit('close')"
    >
      X
    </button>

    <div class="h-full w-full flex flex-col items-center justify-center p-8">
      <h2 class="text-4xl font-light tracking-widest m-0">{{ t('pause.title') }}</h2>
      <p class="text-gray-500 mt-2 mb-8 text-sm uppercase tracking-[0.2em]">Draw & Roll</p>

      <div class="w-full max-w-md flex flex-col gap-4">
        <button
          type="button"
          class="px-8 py-4 text-base border border-gray-900 bg-white text-gray-900 text-left hover:bg-gray-100 transition-colors"
          @click="$emit('toggle-language')"
        >
          {{ t('pause.language') }}: {{ languageLabel }}
        </button>

        <button
          type="button"
          class="px-8 py-4 text-base border border-gray-900 bg-gray-900 text-white text-left hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="restartPending"
          @click="$emit('restart-game')"
        >
          {{ t('pause.restart') }}
        </button>

        <p v-if="restartPending" class="text-xs text-gray-600">
          {{ t('pause.restartPending') }}
        </p>
        <p v-if="restartStatus === 'declined'" class="text-xs text-red-600">
          {{ t('pause.restartDeclined') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  locale: {
    type: String,
    default: 'es'
  },
  restartPending: {
    type: Boolean,
    default: false
  },
  restartStatus: {
    type: String,
    default: 'idle'
  }
})

defineEmits(['close', 'toggle-language', 'restart-game'])

const { t } = useI18n()
const languageLabel = computed(() => props.locale === 'en' ? 'EN' : 'ES')
</script>
