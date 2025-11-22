import type { Directive, DirectiveBinding } from 'vue';
import { type TiltOptions } from 'vanilla-tilt';

// Wir erweitern das Standard-HTMLElement, da VanillaTilt eine Instanz daran anhängt
interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void;
    getValues: () => void;
  };
}

export const vTilt: Directive<TiltElement, TiltOptions> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<TiltOptions>) {
    const settings = {
        max: 15,     // Max neigung in Grad
        perspective: 1000,
        scale: 1.05, // Zoom beim Hover
        ...binding.value
    };

    el.classList.add('tilt-element');
    
    // Mouse Move
    el.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position innerhalb des elements
        const y = e.clientY - rect.top;  // y position innerhalb des elements

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Berechne Rotation (invertiert für natürlichen Tilt)
        const rotateX = ((y - centerY) / centerY) * -settings.max;
        const rotateY = ((x - centerX) / centerX) * settings.max;

        el.style.transform = `
            perspective(${settings.perspective}px) 
            rotateX(${rotateX}deg) 
            rotateY(${rotateY}deg) 
            scale(${settings.scale})
        `;
        
        // Optional: Glare/Licht Effekt
        el.style.boxShadow = `
            ${-rotateY}px ${rotateX}px 20px rgba(255,255,255,0.1),
            0 8px 32px 0 rgba(0, 0, 0, 0.37)
        `;
    });

    // Mouse Leave (Reset)
    el.addEventListener('mouseleave', () => {
        el.style.transform = `
            perspective(${settings.perspective}px) 
            rotateX(0deg) 
            rotateY(0deg) 
            scale(1)
        `;
        el.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
    });
  }
};