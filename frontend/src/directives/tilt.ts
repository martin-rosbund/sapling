import type { Directive, DirectiveBinding } from 'vue';
import VanillaTilt, { type TiltOptions } from 'vanilla-tilt';

// Wir erweitern das Standard-HTMLElement, da VanillaTilt eine Instanz daran anhängt
interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void;
    getValues: () => void;
  };
}

export const vTilt: Directive<TiltElement, TiltOptions> = {
  mounted(el: TiltElement, binding: DirectiveBinding<TiltOptions>) {
    // Standard-Optionen definieren
    const defaultOptions: TiltOptions = {
      max: 25,
      speed: 400,
      glare: true,
      'max-glare': 0.5,
      scale: 1.05,
      perspective: 1000,
    };

    // Initialisierung: Merge von Default und User-Optionen (binding.value)
    VanillaTilt.init(el, { ...defaultOptions, ...binding.value });
  },

  unmounted(el: TiltElement) {
    // Sauber aufräumen, um Memory Leaks zu verhindern
    if (el.vanillaTilt) {
      el.vanillaTilt.destroy();
    }
  }
};