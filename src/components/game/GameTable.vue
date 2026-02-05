<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-[400px] relative">
    <!-- Main play area (mesa) -->
    <div class="w-full flex flex-col items-center justify-center">
      <!-- Aquí se dividirán las secciones de la mesa (héroes, ítems, etc) -->
      <slot />
    </div>
  </div>
</template>
