/**
 * Service for setting and getting browser cookies.
 */
class CookieService {
  /**
   * Sets a cookie with the given name and value.
   * @param name Name of the cookie.
   * @param value Value to store in the cookie.
   * @param days Number of days until the cookie expires (default: 365).
   */
  static set(name: string, value: string, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
  }

  /**
   * Gets the value of a cookie by name.
   * @param name Name of the cookie to retrieve.
   * @returns The cookie value, or null if not found.
   */
  static get(name: string): string | null {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1] || null
  }
}

export default CookieService