import type { Directive, DirectiveBinding } from 'vue'
import { type TiltOptions } from 'vanilla-tilt'

interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void
    getValues: () => void
  }
  __saplingTiltMouseMove?: (event: MouseEvent) => void
  __saplingTiltMouseLeave?: () => void
  __saplingTiltAppearanceChange?: () => void
  __saplingTiltRafId?: number
  __saplingTiltActive?: boolean
}

type TiltBindingValue = TiltOptions | null | false | undefined

function resetTiltStyles(el: HTMLElement) {
  el.style.transform = ''
  el.style.boxShadow = ''
}

function isTiltEnabled() {
  return document.documentElement.dataset.saplingTilt !== 'off'
}

function isReducedPerformance() {
  return document.documentElement.dataset.saplingPerformance === 'reduced'
}

function shouldEnable(value: TiltBindingValue): boolean {
  return value !== false && value !== null && value !== undefined
}

function attachTilt(el: TiltElement, value: TiltBindingValue) {
  if (el.__saplingTiltActive) {
    return
  }

  const settings = {
    max: 15,
    perspective: 1000,
    scale: 1.05,
    ...(value && typeof value === 'object' ? value : {}),
  }

  el.classList.add('tilt-element')

  // Throttle mousemove writes to one paint per frame. Modern high-poll-rate
  // mice fire mousemove 120+ times per second; without this we re-layout the
  // entire card subtree on each event, which caused visible flicker on cards
  // that contain heavy children (tables, virtual lists, overlays).
  let pendingEvent: MouseEvent | null = null

  function applyTransform(event: MouseEvent) {
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const performanceFactor = isReducedPerformance() ? 0.55 : 1

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -(settings.max * performanceFactor)
    const rotateY = ((x - centerX) / centerX) * (settings.max * performanceFactor)
    const scale = 1 + (settings.scale - 1) * performanceFactor

    el.style.transform = `
            perspective(${settings.perspective}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(${scale})
        `

    el.style.boxShadow = `
            ${-rotateY}px ${rotateX}px ${isReducedPerformance() ? 14 : 20}px rgba(255,255,255,0.1),
            0 8px ${isReducedPerformance() ? 22 : 32}px 0 rgba(0, 0, 0, 0.37)
        `
  }

  el.__saplingTiltMouseMove = (event: MouseEvent) => {
    if (!isTiltEnabled()) {
      resetTiltStyles(el)
      return
    }

    pendingEvent = event

    if (el.__saplingTiltRafId !== undefined) {
      return
    }

    el.__saplingTiltRafId = window.requestAnimationFrame(() => {
      el.__saplingTiltRafId = undefined
      if (pendingEvent) {
        applyTransform(pendingEvent)
        pendingEvent = null
      }
    })
  }

  el.__saplingTiltMouseLeave = () => {
    if (el.__saplingTiltRafId !== undefined) {
      window.cancelAnimationFrame(el.__saplingTiltRafId)
      el.__saplingTiltRafId = undefined
    }
    pendingEvent = null
    resetTiltStyles(el)
  }

  el.__saplingTiltAppearanceChange = () => {
    if (!isTiltEnabled()) {
      resetTiltStyles(el)
    }
  }

  el.addEventListener('mousemove', el.__saplingTiltMouseMove)
  el.addEventListener('mouseleave', el.__saplingTiltMouseLeave)
  window.addEventListener(
    'sapling:appearance-change',
    el.__saplingTiltAppearanceChange as EventListener,
  )

  el.__saplingTiltActive = true
}

function detachTilt(el: TiltElement) {
  if (el.__saplingTiltRafId !== undefined) {
    window.cancelAnimationFrame(el.__saplingTiltRafId)
    el.__saplingTiltRafId = undefined
  }

  if (el.__saplingTiltMouseMove) {
    el.removeEventListener('mousemove', el.__saplingTiltMouseMove)
    el.__saplingTiltMouseMove = undefined
  }

  if (el.__saplingTiltMouseLeave) {
    el.removeEventListener('mouseleave', el.__saplingTiltMouseLeave)
    el.__saplingTiltMouseLeave = undefined
  }

  if (el.__saplingTiltAppearanceChange) {
    window.removeEventListener(
      'sapling:appearance-change',
      el.__saplingTiltAppearanceChange as EventListener,
    )
    el.__saplingTiltAppearanceChange = undefined
  }

  el.classList.remove('tilt-element')
  resetTiltStyles(el)
  el.__saplingTiltActive = false
}

export const vTilt: Directive<TiltElement, TiltBindingValue> = {
  mounted(el: TiltElement, binding: DirectiveBinding<TiltBindingValue>) {
    if (shouldEnable(binding.value)) {
      attachTilt(el, binding.value)
    }
  },

  updated(el: TiltElement, binding: DirectiveBinding<TiltBindingValue>) {
    const enable = shouldEnable(binding.value)
    if (enable && !el.__saplingTiltActive) {
      attachTilt(el, binding.value)
      return
    }

    if (!enable && el.__saplingTiltActive) {
      detachTilt(el)
    }
  },

  unmounted(el: TiltElement) {
    detachTilt(el)
  },
}
