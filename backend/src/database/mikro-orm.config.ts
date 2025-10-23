import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';

// Lade Umgebungsvariablen, z.B. mit dotenv
// npm install dotenv
import 'dotenv/config';

const config: Options = {
  // Pfad zu den Entities (mit Dateimuster)
  entities: [__dirname + '/../entity/*.js'],
  entitiesTs: [__dirname + '/../entity/*.ts'],
  // Pfad zu den Migrations
  migrations: {
    path: __dirname + '/../database/migration', // Ordner für kompilierte Migrationen
    pathTs: __dirname + '/../database/migration', // Ordner für TypeScript Migrationen
    glob: '!(*.d).{js,ts}', // Suchmuster für Migrationsdateien
    transactional: true, // Jede Migration in einer Transaktion ausführen
    disableForeignKeys: false, // Foreign-Key-Prüfungen während der Migration aktiv lassen
    allOrNothing: true, // Stoppt bei Fehlern sofort
    emit: 'ts', // Migrationen als TypeScript-Dateien erstellen
  },
  // Pfad zu den Seedern
  seeder: {
    path: __dirname + '/../database/seeder', // Ordner für kompilierte Seeder
    pathTs: __dirname + '/../database/seeder', // Ordner für TypeScript Seeder
    defaultSeeder: 'DatabaseSeeder', // Name der Haupt-Seeder-Klasse
    glob: '!(*.d).{js,ts}', // Suchmuster für Seeder-Dateien
    emit: 'ts', // Seeder als TypeScript-Dateien erstellen
  },
  // Standardeinstellung: SQLite
  driver: SqliteDriver,
  dbName: process.env.DB_NAME || 'local.db',

  // Schaltet automatisch auf MySQL um, wenn der Treiber gesetzt ist
  ...(process.env.DB_DRIVER === 'mysql' && {
    driver: MySqlDriver,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
  }),

  debug: process.env.DB_LOGGING === 'true',
  logger: console.log.bind(console),
};

export default config;
