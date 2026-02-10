<template>
  <div class="relative min-h-screen w-full flex flex-col items-center justify-center bg-gray-400 font-sans">
    <PreGameScreen v-if="!connection.isConnected" />
    <StartGameScreen 
      v-else-if="game.phase === 'setup'" 
      @start-game="initGame" 
    />
    <GameBoard
      v-else
      :opening-flow="openingFlow"
      :my-player-id="myPlayerId"
      :is-drawing="isDrawing"
      :opening-action-pending="openingActionPending"
      @accept-opening-hand="acceptOpeningHand"
      @request-opening-mulligan="requestOpeningMulligan"
    />

    <button
      v-if="game.isPlaying"
      type="button"
      class="absolute top-4 right-4 z-[205] h-11 w-11 text-xl leading-none hover:bg-gray-100 cursor-pointer transition-colors"
      @click="isPauseOpen = true"
    >
      &#9776;
    </button>

    <PauseScreen
      v-if="game.isPlaying && isPauseOpen"
      :locale="locale"
      :restart-pending="isRestartRequestPending"
      :restart-status="restartRequestStatus"
      @close="isPauseOpen = false"
      @toggle-language="toggleLanguage"
      @restart-game="requestRestartFromPause"
    />

    <EndGameOverlay
      v-if="game.isEnded"
      :restart-pending="isRestartRequestPending"
      :restart-status="restartRequestStatus"
      @restart-game="requestRestartFromEndgame"
    />

    <div
      v-if="incomingRestartRequest"
      class="absolute inset-0 z-[240] bg-black/45 flex items-center justify-center p-4"
    >
      <div class="w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl p-5">
        <h3 class="text-base font-semibold mb-2">
          {{ t('restart.popupTitle') }}
        </h3>
        <p class="text-sm text-gray-700">
          {{ t('restart.popupMessage') }}
        </p>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
            @click="respondRestartRequest(false)"
          >
            {{ t('restart.keepPlaying') }}
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            @click="respondRestartRequest(true)"
          >
            {{ t('restart.acceptRestart') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
// Components
import PreGameScreen from '@/components/game/PreGameScreen.vue'
import StartGameScreen from '@/components/game/StartGameScreen.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import PauseScreen from '@/components/game/PauseScreen.vue'
import EndGameOverlay from '@/components/game/EndGameOverlay.vue'
import { useGameSession } from '@/composables/useGameSession'

const { t, locale } = useI18n()
const isPauseOpen = ref(false)

const {
  connection,
  game,
  myPlayerId,
  isDrawing,
  openingFlow,
  openingActionPending,
  initGame,
  acceptOpeningHand,
  requestOpeningMulligan,
  requestRestartGame,
  incomingRestartRequest,
  respondRestartRequest,
  isRestartRequestPending,
  restartRequestStatus
} = useGameSession()

function toggleLanguage() {
  locale.value = locale.value === 'es' ? 'en' : 'es'
}

function requestRestartFromPause() {
  requestRestartGame()
  isPauseOpen.value = false
}

function requestRestartFromEndgame() {
  requestRestartGame()
}
</script>
