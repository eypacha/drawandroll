<template>
  <div
    class="w-44 h-66 rounded-xl border-2 bg-white flex flex-col overflow-hidden cursor-pointer shadow-lg relative"
    :class="{
      'border-amber-400': card.type === 'hero',
      'border-violet-400': card.type === 'item',
      'border-emerald-400': card.type === 'healing',
      'border-blue-400': card.type === 'reactive'
    }"
  >
    <!-- Card Name (Top) -->
    <div class="px-2 py-1 bg-gray-50 text-xs leading-4 font-bold text-gray-800 text-center uppercase tracking-wide border-b border-gray-200">
      {{ card.name?.en || card.name }}
    </div>

    <!-- Card Cost (Floating circle, top-right) -->
    <div class="absolute self-end mt-1 mr-1">
      <span class="w-5 h-5 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-bold text-sm shadow border-2 border-white">
        {{ card.cost }}
      </span>
    </div>

    <!-- Card Image (Middle) -->
    <div class="w-full h-28 bg-gray-200 flex items-center justify-center overflow-hidden">
      <img 
        v-if="card.imageUrl" 
        :src="card.imageUrl" 
        alt="Card Image" 
        class="object-cover w-full h-full"
      />
      <div v-else class="text-gray-400 text-sm italic">
        No Image
      </div>
    </div>
    <!-- Card Stats & Template (Middle) -->
    <div class="flex-1 flex flex-col justify-center items-center px-2 py-3 text-center gap-1">
      <div class="flex flex-col gap-1 text-sm font-semibold text-gray-700">
        <template v-if="card.type === 'hero'">
          <span class="flex flex-row gap-2 items-center justify-center">
            <span title="Ataque">⚔️ {{ card.stats.atk }}</span>
            <span title="Defensa">🛡️ {{ card.stats.def }}</span>
            <span title="Vida">❤️ {{ card.stats.hp }}</span>
          </span>
        </template>
        <template v-else-if="card.type === 'item'">
          <span class="flex flex-row gap-2 items-center justify-center">
            <span v-if="card.stats.atkBonus" title="Ataque extra">⚔️ +{{ card.stats.atkBonus }}</span>
            <span v-if="card.stats.defBonus" title="Defensa extra">🛡️ +{{ card.stats.defBonus }}</span>
            <span v-if="card.stats.defModifier < 0" title="Penalización defensa">🛡️ {{ card.stats.defModifier }}</span>
            <span title="Durabilidad">🔋 {{ card.stats.durability }}</span>
          </span>
        </template>
        <template v-else-if="card.type === 'healing'">
          <span>+{{ card.stats.healAmount }} HP</span>
        </template>
        <template v-else-if="card.type === 'reactive'">
          <span class="text-xs">{{ formatTemplate(card.effect) }}</span>
        </template>
      </div>
      <!-- Description (Below stats) -->
      <div class="mt-2 text-[10px] text-gray-500 font-normal italic leading-tight">
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
