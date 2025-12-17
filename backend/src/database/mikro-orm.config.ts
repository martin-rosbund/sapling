import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import 'dotenv/config';
import {
  DB_DRIVER,
  DB_HOST,
  DB_LOGGING,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
} from '../constants/project.constants';
import path from 'path';

const BASE_DIR = process.cwd();

const config: Options = {
  // Pfad zu den Entities (mit Dateimuster)
  entities: [path.join(BASE_DIR, 'dist/entity/*.js')],
  entitiesTs: [path.join(BASE_DIR, 'src/entity/*.ts')],
  // Pfad zu den Migrations
  migrations: {
    path: path.join(BASE_DIR, 'dist/database/migration'), // Ordner für kompilierte Migrationen
    pathTs: path.join(BASE_DIR, 'src/database/migration'), // Ordner für TypeScript Migrationen
    glob: '!(*.d).{js,ts}', // Suchmuster für Migrationsdateien
    transactional: true, // Jede Migration in einer Transaktion ausführen
    disableForeignKeys: false, // Foreign-Key-Prüfungen während der Migration aktiv lassen
    allOrNothing: true, // Stoppt bei Fehlern sofort
    emit: 'ts', // Migrationen als TypeScript-Dateien erstellen
  },
  // Pfad zu den Seedern
  seeder: {
    path: path.join(BASE_DIR, 'dist/database/seeder'), // Ordner für kompilierte Seeder
    pathTs: path.join(BASE_DIR, 'src/database/seeder'), // Ordner für TypeScript Seeder
    defaultSeeder: 'DatabaseSeeder', // Name der Haupt-Seeder-Klasse
    glob: '!(*.d).{js,ts}', // Suchmuster für Seeder-Dateien
    emit: 'ts', // Seeder als TypeScript-Dateien erstellen
  },
  // Standardeinstellung: SQLite
  driver: SqliteDriver,
  dbName: DB_NAME,

  // Schaltet automatisch auf MySQL um, wenn der Treiber gesetzt ist
  ...(DB_DRIVER === 'mysql' && {
    driver: MySqlDriver,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    dbName: DB_NAME,
  }),

  debug: DB_LOGGING,
  logger: (message: string) => console.log(message),
};

export default config;
