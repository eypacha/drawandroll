import Peer from 'peerjs'
import { useConnectionStore } from '@/stores/useConnectionStore'

/**
 * PeerJS Service
 * Handles WebRTC connection logic, updates connection store
 */

let peer = null
let connection = null
let messageHandler = null

/**
 * Initialize peer with optional custom ID
 */
export function initPeer(customId = null) {
  const store = useConnectionStore()
  
  peer = customId ? new Peer(customId) : new Peer()
  
  peer.on('open', (id) => {
    console.log('[Peer] Ready with ID:', id)
    store.setPeerId(id)
  })
  
  peer.on('connection', (conn) => {
    console.log('[Peer] Incoming connection from:', conn.peer)
    handleConnection(conn, true)
  })
  
  peer.on('error', (err) => {
    console.error('[Peer] Error:', err)
    store.setError(err.message)
  })
  
  peer.on('disconnected', () => {
    console.log('[Peer] Disconnected from server')
    store.setDisconnected()
  })
  
  return peer
}

/**
 * Connect to a remote peer by ID
 */
export function connectToPeer(remotePeerId) {
  const store = useConnectionStore()
  
  if (!peer) {
    console.error('[Peer] Not initialized')
    return
  }
  
  store.setConnecting()
  const conn = peer.connect(remotePeerId)
  handleConnection(conn, false)
}

/**
 * Handle connection setup (both incoming and outgoing)
 */
function handleConnection(conn, asHost) {
  const store = useConnectionStore()
  connection = conn
  
  conn.on('open', () => {
    console.log('[Peer] Connection established with:', conn.peer)
    store.setConnected(conn.peer, asHost)
  })
  
  conn.on('data', (data) => {
    console.log('[Peer] Received:', data)
    if (messageHandler) {
      messageHandler(data)
    }
  })
  
  conn.on('close', () => {
    console.log('[Peer] Connection closed')
    store.setDisconnected()
    connection = null
  })
  
  conn.on('error', (err) => {
    console.error('[Peer] Connection error:', err)
    store.setError(err.message)
  })
}

/**
 * Send data to connected peer
 */
export function sendMessage(data) {
  if (connection && connection.open) {
    connection.send(data)
    return true
  }
  console.warn('[Peer] No open connection')
  return false
}

/**
 * Register handler for incoming messages
 */
export function onMessage(handler) {
  messageHandler = handler
}

/**
 * Disconnect and cleanup
 */
export function disconnect() {
  const store = useConnectionStore()
  
  if (connection) {
    connection.close()
    connection = null
  }
  
  if (peer) {
    peer.destroy()
    peer = null
  }
  
  store.$reset()
}

/**
 * Get current peer ID
 */
export function getPeerId() {
  return peer?.id || null
}

/**
 * Check if connected
 */
export function isConnected() {
  return connection?.open || false
}
