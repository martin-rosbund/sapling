import { afterEach, describe, expect, it, vi } from 'vitest'

import { SaplingWindowWatcher } from '../saplingWindowWatcher'

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('SaplingWindowWatcher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports the current size immediately to new listeners', () => {
    setWindowWidth(850)

    const watcher = new SaplingWindowWatcher()
    const listener = vi.fn()

    watcher.onChange(listener)

    expect(watcher.getCurrentSize()).toBe('small')
    expect(listener).toHaveBeenCalledWith('small')

    watcher.destroy()
  })

  it('emits only when the window crosses a size breakpoint', () => {
    setWindowWidth(950)

    const watcher = new SaplingWindowWatcher()
    const listener = vi.fn()
    watcher.onChange(listener)

    setWindowWidth(1000)
    window.dispatchEvent(new Event('resize'))
    setWindowWidth(1300)
    window.dispatchEvent(new Event('resize'))

    expect(listener.mock.calls).toEqual([['medium'], ['large']])

    watcher.destroy()
  })

  it('stops notifying listeners after unsubscribe or destroy', () => {
    setWindowWidth(850)

    const watcher = new SaplingWindowWatcher()
    const listener = vi.fn()
    const unsubscribe = watcher.onChange(listener)

    unsubscribe()
    setWindowWidth(950)
    window.dispatchEvent(new Event('resize'))
    watcher.destroy()
    setWindowWidth(1300)
    window.dispatchEvent(new Event('resize'))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith('small')
  })
})