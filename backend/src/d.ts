import { Logger } from 'log4js';

/**
 * Extends the Node.js global object to include a log4js logger instance.
 *
 * This allows global access to the logger via `global.log` throughout the backend application.
 * The logger is configured and assigned in the main application bootstrap.
 *
 * @global
 * @property {Logger} log - The global log4js logger instance.
 * @property {boolean} isReady - Indicates if the logger has been initialized.
 */
declare global {
  var log: Logger;
  var isReady: boolean;
}
