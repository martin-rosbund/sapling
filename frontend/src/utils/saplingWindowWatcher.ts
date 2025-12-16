import { DEFAULT_SMALL_WINDOW_WIDTH, DEFAULT_MEDIUM_WINDOW_WIDTH } from '../constants/project.constants';

export type WindowSize = 'small' | 'medium' | 'large';

export type WindowSizeChangeCallback = (size: WindowSize) => void;

export class SaplingWindowWatcher {
  private currentSize: WindowSize;
  private listeners: Set<WindowSizeChangeCallback> = new Set();

  constructor() {
    this.currentSize = this.getWindowSize(window.innerWidth);
    window.addEventListener('resize', this.handleResize);
  }

  private getWindowSize(width: number): WindowSize {
    if (width < DEFAULT_SMALL_WINDOW_WIDTH) {
      return 'small';
    } else if (width < DEFAULT_MEDIUM_WINDOW_WIDTH) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  private handleResize = () => {
    const newSize = this.getWindowSize(window.innerWidth);
    if (newSize !== this.currentSize) {
      this.currentSize = newSize;
      this.emit(newSize);
    }
  };

  private emit(size: WindowSize) {
    this.listeners.forEach(cb => cb(size));
  }

  public onChange(cb: WindowSizeChangeCallback) {
    this.listeners.add(cb);
    cb(this.currentSize);
    return () => this.listeners.delete(cb);
  }

  public getCurrentSize(): WindowSize {
    return this.currentSize;
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResize);
    this.listeners.clear();
  }
}
