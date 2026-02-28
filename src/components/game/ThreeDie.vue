<template>
  <div ref="containerRef" class="die-canvas" />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  value: {
    type: [Number, String, null],
    default: null
  },
  rolling: {
    type: Boolean,
    default: false
  },
  tone: {
    type: String,
    default: 'blue'
  },
  sides: {
    type: Number,
    default: 20
  }
})

const containerRef = ref(null)

const normalizedSides = computed(() => {
  const numeric = Number(props.sides)
  if (!Number.isFinite(numeric)) return 20
  if (numeric >= 20) return 20
  if (numeric >= 6) return 6
  if (numeric >= 4) return 4
  return 2
})

let scene = null
let camera = null
let renderer = null
let dieGroup = null
let die = null
let dieEdges = null
let animationFrameId = null
let resizeObserver = null
let clock = null
const targetQuaternion = new THREE.Quaternion()
const faceNormals = []
const labelTextures = []
const labelMaterials = []
const labelMeshes = []

function getToneColors(tone) {
  if (tone === 'emerald') {
    return { face: '#6ee7b7', edge: '#065f46', ambient: '#ecfdf5' }
  }
  if (tone === 'amber') {
    return { face: '#fde68a', edge: '#92400e', ambient: '#fffbeb' }
  }
  return { face: '#93c5fd', edge: '#1e3a8a', ambient: '#eff6ff' }
}

function getCameraDirection() {
  if (!camera) return new THREE.Vector3(0, 0, 1)
  return camera.position.clone().normalize()
}

function getTargetQuaternionForValue(value) {
  if (faceNormals.length === 0) return new THREE.Quaternion()
  const numericValue = Number(value)
  const maxFace = faceNormals.length
  const safe = Number.isFinite(numericValue) ? Math.max(1, Math.min(maxFace, Math.round(numericValue))) : 1
  const normal = faceNormals[safe - 1] || faceNormals[0]
  const cameraDirection = getCameraDirection()
  const q = new THREE.Quaternion().setFromUnitVectors(normal, cameraDirection)
  const twist = new THREE.Quaternion().setFromAxisAngle(cameraDirection, (safe % 5) * 0.24)
  return q.multiply(twist)
}

function createFaceLabelTexture(label, tone) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 74px "Arial Black", sans-serif'
  ctx.fillText(String(label), 64, 66)
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  labelTextures.push(texture)
  return texture
}

function updateSize() {
  if (!containerRef.value || !renderer || !camera) return
  const width = Math.max(1, Math.floor(containerRef.value.clientWidth))
  const height = Math.max(1, Math.floor(containerRef.value.clientHeight))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function animate() {
  if (!die || !renderer || !scene || !camera || !clock || !dieEdges || !dieGroup) return
  const dt = Math.min(clock.getDelta(), 0.033)
  if (props.rolling) {
    dieGroup.rotation.x += dt * 7.4
    dieGroup.rotation.y += dt * 9.2
    dieGroup.rotation.z += dt * 6.1
  } else {
    dieGroup.quaternion.slerp(targetQuaternion, 0.14)
  }
  renderer.render(scene, camera)
  animationFrameId = requestAnimationFrame(animate)
}

function initScene() {
  if (!containerRef.value) return
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
  camera.position.set(0, 0, 4.6)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  containerRef.value.appendChild(renderer.domElement)
  dieGroup = new THREE.Group()
  scene.add(dieGroup)

  const toneColors = getToneColors(props.tone)
  const sides = normalizedSides.value
  const faceEntries = []
  let geometry = null

  if (sides === 20) {
    geometry = new THREE.IcosahedronGeometry(1.2, 0).toNonIndexed()
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(position, i)
      const b = new THREE.Vector3().fromBufferAttribute(position, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(position, i + 2)
      const normal = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .normalize()
      const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3)
      faceEntries.push({ normal, center, label: (i / 3) + 1 })
    }
  } else if (sides === 6) {
    geometry = new THREE.BoxGeometry(1.72, 1.72, 1.72)
    const faceData = [
      { normal: new THREE.Vector3(0, 0, 1), label: 1 },
      { normal: new THREE.Vector3(1, 0, 0), label: 2 },
      { normal: new THREE.Vector3(0, 1, 0), label: 3 },
      { normal: new THREE.Vector3(0, -1, 0), label: 4 },
      { normal: new THREE.Vector3(-1, 0, 0), label: 5 },
      { normal: new THREE.Vector3(0, 0, -1), label: 6 }
    ]
    for (const entry of faceData) {
      faceEntries.push({
        normal: entry.normal,
        center: entry.normal.clone().multiplyScalar(1.0),
        label: entry.label
      })
    }
  } else if (sides === 4) {
    geometry = new THREE.TetrahedronGeometry(1.35, 0).toNonIndexed()
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(position, i)
      const b = new THREE.Vector3().fromBufferAttribute(position, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(position, i + 2)
      const normal = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .normalize()
      const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3)
      faceEntries.push({ normal, center, label: (i / 3) + 1 })
    }
  } else {
    geometry = new THREE.CylinderGeometry(0.98, 0.98, 0.24, 48)
    faceEntries.push(
      {
        normal: new THREE.Vector3(0, 1, 0),
        center: new THREE.Vector3(0, 0.21, 0),
        label: 1
      },
      {
        normal: new THREE.Vector3(0, -1, 0),
        center: new THREE.Vector3(0, -0.21, 0),
        label: 2
      }
    )
  }

  faceNormals.length = 0
  for (const entry of faceEntries) {
    faceNormals.push(entry.normal.clone().normalize())
  }

  const material = new THREE.MeshStandardMaterial({
    color: toneColors.face,
    roughness: 0.52,
    metalness: 0.12,
    flatShading: sides !== 6
  })
  die = new THREE.Mesh(geometry, material)
  dieGroup.add(die)

  const edgeGeometry = new THREE.EdgesGeometry(geometry, 1)
  dieEdges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: toneColors.edge, transparent: true, opacity: 0.9 })
  )
  dieGroup.add(dieEdges)

  const labelSize = sides === 20 ? 0.62 : (sides === 6 ? 0.8 : (sides === 4 ? 0.72 : 0.62))

  for (const entry of faceEntries) {
    const center = entry.center
    const normal = entry.normal
    const texture = createFaceLabelTexture(entry.label, props.tone)
    if (!texture) continue
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false
    })
    labelMaterials.push(material)
    const label = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), material)
    label.position.copy(center.addScaledVector(normal, 0.09))
    label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    labelMeshes.push(label)
    dieGroup.add(label)
  }

  const ambient = new THREE.AmbientLight(toneColors.ambient, 1.0)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(toneColors.edge, 1.2)
  key.position.set(3, 4, 5)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.45)
  fill.position.set(-4, -2, 3)
  scene.add(fill)

  targetQuaternion.copy(getTargetQuaternionForValue(props.value))
  dieGroup.quaternion.copy(targetQuaternion)
  clock = new THREE.Clock()
  updateSize()
  animate()

  resizeObserver = new ResizeObserver(() => {
    updateSize()
  })
  resizeObserver.observe(containerRef.value)
}

function destroyScene() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (die) {
    die.geometry?.dispose()
    die.material?.dispose?.()
    scene?.remove(die)
    die = null
  }
  if (dieEdges) {
    dieEdges.geometry?.dispose?.()
    dieEdges.material?.dispose?.()
    scene?.remove(dieEdges)
    dieEdges = null
  }
  if (dieGroup) {
    scene?.remove(dieGroup)
    dieGroup = null
  }
  for (const label of labelMeshes) {
    label.geometry?.dispose?.()
  }
  labelMeshes.length = 0
  for (const material of labelMaterials) {
    material.dispose?.()
  }
  labelMaterials.length = 0
  for (const texture of labelTextures) {
    texture.dispose?.()
  }
  labelTextures.length = 0
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
    if (renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    renderer = null
  }
  scene = null
  camera = null
  clock = null
}

watch(
  () => props.value,
  (nextValue) => {
    targetQuaternion.copy(getTargetQuaternionForValue(nextValue))
  }
)

watch(
  () => props.rolling,
  (isRolling) => {
    if (!dieGroup || !isRolling) return
    dieGroup.rotation.x += Math.random() * Math.PI * 1.5
    dieGroup.rotation.y += Math.random() * Math.PI * 1.5
    dieGroup.rotation.z += Math.random() * Math.PI * 1.5
  }
)

watch(
  () => [normalizedSides.value, props.tone],
  () => {
    destroyScene()
    initScene()
  }
)

onMounted(() => {
  initScene()
})

onUnmounted(() => {
  destroyScene()
})
</script>

<style scoped>
.die-canvas {
  width: 100%;
  height: 100%;
}

.die-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
