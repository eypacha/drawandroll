<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8 bg-white font-sans">
    <h1 class="text-4xl font-light tracking-widest m-0">Draw & Roll</h1>
    <p class="text-gray-500 mt-2 mb-8 text-sm uppercase tracking-[0.2em]">{{ t('main.tagline') }}</p>
    
    <div class="flex flex-col gap-4">
      <button 
        @click="createRoom" 
        :disabled="isCreating"
        class="px-8 py-4 text-base border border-gray-900 bg-gray-900 text-white cursor-pointer transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isCreating ? t('main.creating') : t('main.newGame') }}
      </button>
    </div>

    <div v-if="roomLink" class="mt-8 text-center">
      <p class="text-gray-700 mb-4">{{ t('main.shareLink') }}</p>
      <div class="flex gap-2 mb-4">
        <input 
          type="text" 
          :value="roomLink" 
          readonly 
          ref="linkInput"
          class="px-3 py-2 text-sm border border-gray-300 w-72 font-mono bg-gray-50"
        />
        <button 
          @click="copyLink"
          class="px-4 py-2 border border-gray-900 bg-white cursor-pointer hover:bg-gray-100 transition-colors"
        >
          {{ copied ? t('main.copied') : t('main.copy') }}
        </button>
      </div>
      <p class="text-gray-500 italic">{{ t('main.waitingOpponentJoin') }}</p>
    </div>

    <div v-if="connection.status !== 'disconnected'" class="mt-8 p-4 bg-gray-100 rounded text-sm text-gray-600">
      <p class="m-1">{{ t('main.status') }}: {{ connection.status }}</p>
      <p v-if="connection.peerId" class="m-1">{{ t('main.yourId') }}: {{ connection.peerId }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores'
import { initPeer, onMessage } from '@/services/peerService'

const router = useRouter()
const connection = useConnectionStore()
const { t } = useI18n()

const isCreating = ref(false)
const roomLink = ref(null)
const copied = ref(false)
const linkInput = ref(null)

function generateRoomId() {
  return Math.random().toString(36).substring(2, 12)
}

function createRoom() {
  isCreating.value = true
  const roomId = generateRoomId()
  
  // Initialize peer with room ID as peer ID
  initPeer(roomId)
  
  // Build shareable link
  const baseUrl = window.location.origin
  roomLink.value = `${baseUrl}/game?id=${roomId}`
}

function copyLink() {
  if (linkInput.value) {
    linkInput.value.select()
    navigator.clipboard.writeText(roomLink.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  }
}

// Listen for connection, then navigate to game
const unsubscribeMessages = onMessage((data) => {
  if (data.type === 'join') {
    router.push({ name: 'Game', query: { id: connection.peerId } })
  }
})

// Watch for incoming connection
const checkConnection = setInterval(() => {
  if (connection.isConnected) {
    clearInterval(checkConnection)
    router.push({ name: 'Game', query: { id: connection.peerId } })
  }
}, 500)

onUnmounted(() => {
  clearInterval(checkConnection)
  unsubscribeMessages()
})
</script>
