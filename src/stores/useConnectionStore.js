import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Connection Store
 * Reactive state for PeerJS connection
 */
export const useConnectionStore = defineStore('connection', () => {
  // State
  const peerId = ref(null)
  const remotePeerId = ref(null)
  const isConnected = ref(false)
  const isHost = ref(false)
  const status = ref('disconnected') // 'disconnected' | 'connecting' | 'connected' | 'error'
  const error = ref(null)

  // Getters
  const isReady = computed(() => peerId.value !== null)
  const hasRemote = computed(() => remotePeerId.value !== null)
  const role = computed(() => isHost.value ? 'host' : 'guest')

  // Actions (called by peerService)
  function setPeerId(id) {
    peerId.value = id
    status.value = 'disconnected'
  }

  function setConnected(remoteId, asHost) {
    remotePeerId.value = remoteId
    isConnected.value = true
    isHost.value = asHost
    status.value = 'connected'
    error.value = null
  }

  function setDisconnected() {
    remotePeerId.value = null
    isConnected.value = false
    status.value = 'disconnected'
  }

  function setConnecting() {
    status.value = 'connecting'
  }

  function setError(err) {
    error.value = err
    status.value = 'error'
  }

  function $reset() {
    peerId.value = null
    remotePeerId.value = null
    isConnected.value = false
    isHost.value = false
    status.value = 'disconnected'
    error.value = null
  }

  return {
    // State
    peerId,
    remotePeerId,
    isConnected,
    isHost,
    status,
    error,
    // Getters
    isReady,
    hasRemote,
    role,
    // Actions
    setPeerId,
    setConnected,
    setDisconnected,
    setConnecting,
    setError,
    $reset
  }
})
