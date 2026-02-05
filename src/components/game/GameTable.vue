<template>
  <div class="game-table flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <!-- Main play area (mesa) -->
    <div class="main-table-area w-full flex flex-col items-center justify-center">
      <!-- Aquí se dividirán las secciones de la mesa (héroes, ítems, etc) -->
       
      <slot />
    </div>
  </div>
</template>

<style scoped>
.game-table {
  min-height: 400px;
  position: relative;
}
</style>
