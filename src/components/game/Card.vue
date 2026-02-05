<template>
  <div
    class="w-36 h-56 rounded-xl border bg-white flex flex-col overflow-hidden cursor-pointer transition-transform hover:-translate-y-2 hover:shadow-2xl shadow-lg relative"
    :class="{
      'border-amber-400': card.type === 'hero',
      'border-violet-400': card.type === 'item',
      'border-emerald-400': card.type === 'healing',
      'border-blue-400': card.type === 'reactive'
    }"
  >
    <!-- Card Name (Top) -->
    <div class="px-2 py-2 bg-gray-50 text-base font-bold text-gray-800 text-center uppercase tracking-wide border-b border-gray-200">
      {{ card.name?.en || card.name }}
    </div>

    <!-- Card Cost (Floating circle, top-right) -->
    <div class="absolute self-end mt-2 mr-2">
      <span class="w-8 h-8 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-bold text-lg shadow border-2 border-white">
        {{ card.cost }}
      </span>
    </div>

    <!-- Card Stats & Template (Middle) -->
    <div class="flex-1 flex flex-col justify-center items-center px-2 py-3 text-center gap-1">
      <div class="flex flex-col gap-1 text-sm font-semibold text-gray-700">
        <template v-if="card.type === 'hero'">
          <span>ATK {{ card.stats.atk }}</span>
          <span>DEF {{ card.stats.def }}</span>
          <span>HP {{ card.stats.hp }}</span>
        </template>
        <template v-else-if="card.type === 'item'">
          <span v-if="card.stats.atkBonus">+{{ card.stats.atkBonus }} ATK</span>
          <span v-if="card.stats.defBonus">+{{ card.stats.defBonus }} DEF</span>
          <span v-if="card.stats.defModifier < 0">{{ card.stats.defModifier }} DEF</span>
          <span>DUR {{ card.stats.durability }}</span>
        </template>
        <template v-else-if="card.type === 'healing'">
          <span>+{{ card.stats.healAmount }} HP</span>
        </template>
        <template v-else-if="card.type === 'reactive'">
          <span class="text-xs">{{ formatTemplate(card.effect) }}</span>
        </template>
      </div>
      <!-- Description (Below stats) -->
      <div class="mt-2 text-xs text-gray-500 font-normal italic leading-tight">
        {{ card.description?.en || card.description }}
      </div>
    </div>

    <!-- Card Type (Bottom) -->
    <div class="px-2 py-1 bg-gray-100 text-xs uppercase tracking-widest text-gray-500 border-t border-gray-200 text-center">
      {{ card.type }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  card: {
    type: Object,
    required: true
  }
})

function formatTemplate(template) {
  return template?.replace?.(/_/g, ' ') || ''
}
</script>
