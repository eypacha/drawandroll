import { createRouter, createWebHistory } from 'vue-router'
import MainScreen from '../views/MainScreen.vue'
import GameScreen from '../views/GameScreen.vue'

const routes = [
  {
    path: '/',
    name: 'Main',
    component: MainScreen
  },
  {
    path: '/game',
    name: 'Game',
    component: GameScreen
  }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
})

export default router
