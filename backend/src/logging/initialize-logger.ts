import log4js from 'log4js';

import {
  LOG_APPENDERS,
  LOG_BACKUP_FILES,
  LOG_LEVEL,
  LOG_NAME_SERVER,
  LOG_OUTPUT_PATH,
} from '../constants/project.constants';

export function initializeLogger() {
  if (global.log) {
    return global.log;
  }

  log4js.configure({
    appenders: {
      file: {
        type: 'dateFile',
        filename: `${LOG_OUTPUT_PATH}/${LOG_NAME_SERVER}`,
        compress: false,
        numBackups: LOG_BACKUP_FILES,
      },
      console: { type: 'console' },
    },
    categories: {
      default: {
        appenders: LOG_APPENDERS,
        level: LOG_LEVEL,
      },
    },
  });

  global.log = log4js.getLogger('default');

  return global.log;
}
