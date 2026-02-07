<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-400 font-sans">
    <PreGameScreen v-if="!connection.isConnected" />
    <StartGameScreen 
      v-else-if="!game.isPlaying" 
      @start-game="initGame" 
    />
    <GameBoard v-else />
  </div>
</template>

<script setup>
// Components
import PreGameScreen from '@/components/game/PreGameScreen.vue'
import StartGameScreen from '@/components/game/StartGameScreen.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import { useGameSession } from '@/composables/useGameSession'

const { connection, game, initGame } = useGameSession()
</script>
