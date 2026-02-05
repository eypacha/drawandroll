<template>
  <div class="pre-game-screen flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <div class="waiting-state text-center">
      <p class="text-gray-500 text-lg font-light">Waiting for opponent...</p>
    </div>
  </div>
</template>

<style scoped>
.pre-game-screen {
  min-height: 400px;
  position: relative;
}

.waiting-state {
  padding: 2rem 0;
}
</style>
