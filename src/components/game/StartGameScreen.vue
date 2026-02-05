<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-[400px] relative">
    <div class="text-center">
      <button 
        @click="$emit('start-game')"
        class="px-6 py-3 bg-gray-900 text-white text-sm tracking-wide hover:bg-gray-700 transition-colors"
      >
        Start Game
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['start-game'])
</script>
