<template>
  <div
    class="w-44 h-66 rounded-xl border-2 bg-white flex flex-col overflow-hidden cursor-pointer shadow-lg relative select-none"
    :class="{
      'border-amber-400': card.type === 'hero',
      'border-violet-400': card.type === 'item',
      'border-emerald-400': card.type === 'healing',
      'border-blue-400': card.type === 'reactive',
      'border-rose-400': card.type === 'counterattack'
    }"
  >
    <!-- Card Name (Top) -->
    <div class="px-2 py-1 bg-gray-50 text-xs leading-4 font-bold text-gray-800 text-center uppercase tracking-wide border-b border-gray-200">
      {{ localizedName }}
    </div>

    <!-- Card Cost (Floating circle, top-right) -->
    <div v-if="!hideCost" class="absolute self-end mt-1 mr-1">
      <span class="w-5 h-5 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-bold text-sm shadow border-2 border-white">
        {{ card.cost }}
      </span>
    </div>

    <!-- Card Image (Middle) -->
    <div class="w-full aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
      <img
        v-if="resolvedImageSrc && !imageLoadFailed"
        :src="resolvedImageSrc"
        :alt="t('card.imageAlt')"
        class="object-cover w-full h-full"
        @error="handleImageError"
      />
      <div v-else class="text-gray-400 text-sm italic">
        {{ t('card.noImage') }}
      </div>
    </div>
    <!-- Card Stats & Template (Middle) -->
    <div class="flex-1 flex flex-col justify-center items-center px-2 py-3 text-center gap-1">
      <div class="flex flex-col gap-1 font-semibold text-gray-700">
        <span v-if="card.type === 'hero'" class="flex flex-row gap-2 items-center justify-center">
          <span :title="t('card.stats.attack')" :class="getStatClass('atk')">⚔️ {{ card.stats.atk }}</span>
          <span :title="t('card.stats.defense')" :class="getStatClass('def')">🛡️ {{ card.stats.def }}</span>
          <span :title="t('card.stats.health')" :class="getStatClass('hp')">❤️ {{ card.stats.hp }}</span>
        </span>
        <span v-else-if="card.type === 'item'" class="flex flex-row gap-2 items-center justify-center">
          <span v-if="card.stats.atkBonus" :title="t('card.stats.attackBonus')">⚔️ +{{ card.stats.atkBonus }}</span>
          <span v-if="card.stats.atkModifier < 0" :title="t('card.stats.attackPenalty')">⚔️ {{ card.stats.atkModifier }}</span>
          <span v-if="card.stats.defBonus" :title="t('card.stats.defenseBonus')">🛡️ +{{ card.stats.defBonus }}</span>
          <span v-if="card.stats.defModifier < 0" :title="t('card.stats.defensePenalty')">🛡️ {{ card.stats.defModifier }}</span>
        </span>
        <span v-else-if="card.type === 'healing'" class="leading-none">+{{ card.stats.healAmount }} {{ t('card.stats.hpShort') }}</span>
        <span v-else-if="card.type === 'reactive'" class="text-xs">{{ formatTemplate(card.effect) }}</span>
        <span v-else-if="card.type === 'counterattack'" class="text-xs">
          ⚡ {{ card.stats.counterDamage }} {{ t('card.stats.counterDamage') }}
        </span>
      </div>
      <!-- Description (Below stats) -->
      <!-- <div class="text-[10px] text-gray-500 font-normal italic leading-tight">
        {{ localizedDescription }}
      </div> -->
    </div>

    <!-- Card Type (Bottom) -->
    <div class="px-2 py-1 bg-gray-100 text-xs uppercase tracking-widest text-gray-500 border-t border-gray-200 text-center">
      {{ localizedType }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  hideCost: {
    type: Boolean,
    default: false
  }
})

const { t, locale } = useI18n()
const imageLoadFailed = ref(false)

function resolveLocalizedText(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const byLocale = value[locale.value]
    if (typeof byLocale === 'string') return byLocale
    if (typeof value.es === 'string') return value.es
    if (typeof value.en === 'string') return value.en
    const firstText = Object.values(value).find((entry) => typeof entry === 'string')
    if (firstText) return firstText
  }
  return String(value)
}

const localizedName = computed(() => resolveLocalizedText(props.card?.name))
const localizedType = computed(() => {
  const rawType = props.card?.type || ''
  if (!rawType) return ''
  const key = `card.types.${rawType}`
  const translated = t(key)
  return translated === key ? rawType : translated
})

const resolvedImageSrc = computed(() => {
  const explicitUrl = props.card?.imageUrl
  if (explicitUrl) return explicitUrl
  const cardId = props.card?.id
  if (!cardId) return ''
  return `/images/${cardId}.png`
})

watch(
  () => resolvedImageSrc.value,
  () => {
    imageLoadFailed.value = false
  }
)

function handleImageError() {
  imageLoadFailed.value = true
}

function formatTemplate(template) {
  if (!template) return ''
  const key = `card.effects.${template}`
  const translated = t(key)
  if (translated !== key) return translated
  return template.replace(/_/g, ' ')
}

function getStatClass(statKey) {
  const delta = props.card?.statDelta?.[statKey] || 0
  if (delta > 0) return 'text-emerald-600'
  if (delta < 0) return 'text-red-600'
  return 'text-gray-700'
}
</script>
