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
}

function resetTiltStyles(el: HTMLElement) {
  el.style.transform = ''
  el.style.boxShadow = ''
}

function isTiltEnabled() {
  return document.documentElement.dataset.saplingTilt !== 'off'
}

export const vTilt: Directive<TiltElement, TiltOptions> = {
  mounted(el: TiltElement, binding: DirectiveBinding<TiltOptions>) {
    const settings = {
      max: 15,
      perspective: 1000,
      scale: 1.05,
      ...binding.value,
    }

    el.classList.add('tilt-element')

    el.__saplingTiltMouseMove = (event: MouseEvent) => {
      if (!isTiltEnabled()) {
        resetTiltStyles(el)
        return
      }

      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = ((y - centerY) / centerY) * -settings.max
      const rotateY = ((x - centerX) / centerX) * settings.max

      el.style.transform = `
            perspective(${settings.perspective}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(${settings.scale})
        `

      el.style.boxShadow = `
            ${-rotateY}px ${rotateX}px 20px rgba(255,255,255,0.1),
            0 8px 32px 0 rgba(0, 0, 0, 0.37)
        `
    }

    el.__saplingTiltMouseLeave = () => {
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
  },

  unmounted(el: TiltElement) {
    if (el.__saplingTiltMouseMove) {
      el.removeEventListener('mousemove', el.__saplingTiltMouseMove)
    }

    if (el.__saplingTiltMouseLeave) {
      el.removeEventListener('mouseleave', el.__saplingTiltMouseLeave)
    }

    if (el.__saplingTiltAppearanceChange) {
      window.removeEventListener(
        'sapling:appearance-change',
        el.__saplingTiltAppearanceChange as EventListener,
      )
    }

    resetTiltStyles(el)
  },
}
