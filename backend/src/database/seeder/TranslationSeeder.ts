import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from 'src/entity/LanguageItem';
import { TranslationItem } from 'src/entity/TranslationItem';

export class TranslationSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TranslationItem, { entity: 'login' });

    if (count === 0) {
      const de = await em.findOne(LanguageItem, { handle: 'de' });
      const en = await em.findOne(LanguageItem, { handle: 'en' });

      const translations = [
        // Login
        {
          entity: 'login',
          property: 'title',
          de: 'Anmeldung',
          en: 'Login',
        },
        {
          entity: 'login',
          property: 'login',
          de: 'Anmelden',
          en: 'Login',
        },
        {
          entity: 'login',
          property: 'azureLogin',
          de: 'Mit Microsoft Anmelden',
          en: 'Login with Microsoft',
        },
        {
          entity: 'login',
          property: 'username',
          de: 'Benutzername',
          en: 'Username',
        },
        {
          entity: 'login',
          property: 'password',
          de: 'Passwort',
          en: 'Password',
        },
        {
          entity: 'login',
          property: 'wrongCredentials',
          de: 'Benutzername oder Passwort ist falsch.',
          en: 'Username or password is incorrect.',
        },
        // Company
        {
          entity: 'company',
          property: 'handle',
          de: 'Kennung',
          en: 'Handle',
        },
        {
          entity: 'company',
          property: 'handle',
          de: 'Kennung',
          en: 'Handle',
        },
        {
          entity: 'company',
          property: 'name',
          de: 'Name',
          en: 'Name',
        },
        {
          entity: 'company',
          property: 'street',
          de: 'Straße',
          en: 'Street',
        },
        {
          entity: 'company',
          property: 'zip',
          de: 'PLZ',
          en: 'ZIP',
        },
        {
          entity: 'company',
          property: 'city',
          de: 'Stadt',
          en: 'City',
        },
        {
          entity: 'company',
          property: 'phone',
          de: 'Telefon',
          en: 'Phone',
        },
        {
          entity: 'company',
          property: 'email',
          de: 'E-Mail',
          en: 'Email',
        },
        {
          entity: 'company',
          property: 'website',
          de: 'Webseite',
          en: 'Website',
        },
        {
          entity: 'company',
          property: 'isActive',
          de: 'Aktiv',
          en: 'Active',
        },
        {
          entity: 'company',
          property: 'requirePasswordChange',
          de: 'Passwortwechsel erforderlich',
          en: 'Require password change',
        },
        {
          entity: 'company',
          property: 'persons',
          de: 'Personen',
          en: 'Persons',
        },
        {
          entity: 'company',
          property: 'contracts',
          de: 'Verträge',
          en: 'Contracts',
        },
        {
          entity: 'company',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'company',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },
        {
          entity: 'contract',
          property: 'handle',
          de: 'Kennung',
          en: 'Handle',
        },
        {
          entity: 'contract',
          property: 'title',
          de: 'Titel',
          en: 'Title',
        },
        {
          entity: 'contract',
          property: 'description',
          de: 'Beschreibung',
          en: 'Description',
        },
        {
          entity: 'contract',
          property: 'startDate',
          de: 'Startdatum',
          en: 'Start date',
        },
        {
          entity: 'contract',
          property: 'endDate',
          de: 'Enddatum',
          en: 'End date',
        },
        {
          entity: 'contract',
          property: 'isActive',
          de: 'Aktiv',
          en: 'Active',
        },
        {
          entity: 'contract',
          property: 'responseTimeHours',
          de: 'Reaktionszeit (Stunden)',
          en: 'Response time (hours)',
        },
        {
          entity: 'contract',
          property: 'company',
          de: 'Unternehmen',
          en: 'Company',
        },
        {
          entity: 'contract',
          property: 'products',
          de: 'Produkte',
          en: 'Products',
        },
        {
          entity: 'contract',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'contract',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },
        // ... alle weiteren Einträge analog im Multi-Line-Objektliteral-Format ...
        // Die restlichen Einträge werden im selben Stil wie oben formatiert.
        // (Der vollständige Patch enthält alle Einträge im Multi-Line-Format.)
        { entity: 'contract', property: 'isActive', de: 'Aktiv', en: 'Active' },
        {
          entity: 'contract',
          property: 'responseTimeHours',
          de: 'Reaktionszeit (Stunden)',
          en: 'Response time (hours)',
        },
        {
          entity: 'contract',
          property: 'company',
          de: 'Unternehmen',
          en: 'Company',
        },
        {
          entity: 'contract',
          property: 'products',
          de: 'Produkte',
          en: 'Products',
        },
        {
          entity: 'contract',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'contract',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Entity
        { entity: 'entity', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'entity', property: 'icon', de: 'Icon', en: 'Icon' },
        {
          entity: 'entity',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'entity',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Language
        { entity: 'language', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'language', property: 'name', de: 'Name', en: 'Name' },
        {
          entity: 'language',
          property: 'translations',
          de: 'Übersetzungen',
          en: 'Translations',
        },
        {
          entity: 'language',
          property: 'persons',
          de: 'Personen',
          en: 'Persons',
        },
        {
          entity: 'language',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'language',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Note
        { entity: 'note', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'note', property: 'title', de: 'Titel', en: 'Title' },
        {
          entity: 'note',
          property: 'description',
          de: 'Beschreibung',
          en: 'Description',
        },
        { entity: 'note', property: 'person', de: 'Person', en: 'Person' },
        {
          entity: 'note',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'note',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Permission
        {
          entity: 'permission',
          property: 'allowRead',
          de: 'Lesen erlaubt',
          en: 'Allow read',
        },
        {
          entity: 'permission',
          property: 'allowInsert',
          de: 'Einfügen erlaubt',
          en: 'Allow insert',
        },
        {
          entity: 'permission',
          property: 'allowUpdate',
          de: 'Bearbeiten erlaubt',
          en: 'Allow update',
        },
        {
          entity: 'permission',
          property: 'allowDelete',
          de: 'Löschen erlaubt',
          en: 'Allow delete',
        },
        {
          entity: 'permission',
          property: 'allowShow',
          de: 'Anzeigen erlaubt',
          en: 'Allow show',
        },
        {
          entity: 'permission',
          property: 'entity',
          de: 'Entität',
          en: 'Entity',
        },
        { entity: 'permission', property: 'role', de: 'Rolle', en: 'Role' },
        {
          entity: 'permission',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'permission',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Person
        { entity: 'person', property: 'handle', de: 'Kennung', en: 'Handle' },
        {
          entity: 'person',
          property: 'firstName',
          de: 'Vorname',
          en: 'First name',
        },
        {
          entity: 'person',
          property: 'lastName',
          de: 'Nachname',
          en: 'Last name',
        },
        {
          entity: 'person',
          property: 'loginName',
          de: 'Benutzername',
          en: 'Login name',
        },
        {
          entity: 'person',
          property: 'loginPassword',
          de: 'Passwort',
          en: 'Login password',
        },
        { entity: 'person', property: 'phone', de: 'Telefon', en: 'Phone' },
        { entity: 'person', property: 'mobile', de: 'Mobil', en: 'Mobile' },
        { entity: 'person', property: 'email', de: 'E-Mail', en: 'Email' },
        {
          entity: 'person',
          property: 'birthDay',
          de: 'Geburtstag',
          en: 'Birthday',
        },
        {
          entity: 'person',
          property: 'requirePasswordChange',
          de: 'Passwortwechsel erforderlich',
          en: 'Require password change',
        },
        { entity: 'person', property: 'isActive', de: 'Aktiv', en: 'Active' },
        {
          entity: 'person',
          property: 'company',
          de: 'Unternehmen',
          en: 'Company',
        },
        {
          entity: 'person',
          property: 'language',
          de: 'Sprache',
          en: 'Language',
        },
        { entity: 'person', property: 'groups', de: 'Gruppen', en: 'Groups' },
        {
          entity: 'person',
          property: 'assignedTickets',
          de: 'Zugewiesene Tickets',
          en: 'Assigned tickets',
        },
        {
          entity: 'person',
          property: 'createdTickets',
          de: 'Erstellte Tickets',
          en: 'Created tickets',
        },
        { entity: 'person', property: 'notes', de: 'Notizen', en: 'Notes' },
        {
          entity: 'person',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'person',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Product
        { entity: 'product', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'product', property: 'title', de: 'Titel', en: 'Title' },
        { entity: 'product', property: 'name', de: 'Name', en: 'Name' },
        {
          entity: 'product',
          property: 'version',
          de: 'Version',
          en: 'Version',
        },
        {
          entity: 'product',
          property: 'description',
          de: 'Beschreibung',
          en: 'Description',
        },
        {
          entity: 'product',
          property: 'contracts',
          de: 'Verträge',
          en: 'Contracts',
        },
        {
          entity: 'product',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'product',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Right
        {
          entity: 'right',
          property: 'canRead',
          de: 'Lesen erlaubt',
          en: 'Can read',
        },
        {
          entity: 'right',
          property: 'canInsert',
          de: 'Einfügen erlaubt',
          en: 'Can insert',
        },
        {
          entity: 'right',
          property: 'canUpdate',
          de: 'Bearbeiten erlaubt',
          en: 'Can update',
        },
        {
          entity: 'right',
          property: 'canDelete',
          de: 'Löschen erlaubt',
          en: 'Can delete',
        },
        {
          entity: 'right',
          property: 'canShow',
          de: 'Anzeigen erlaubt',
          en: 'Can show',
        },
        { entity: 'right', property: 'entity', de: 'Entität', en: 'Entity' },
        {
          entity: 'right',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'right',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Role
        { entity: 'role', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'role', property: 'title', de: 'Titel', en: 'Title' },
        { entity: 'role', property: 'persons', de: 'Personen', en: 'Persons' },
        {
          entity: 'role',
          property: 'permissions',
          de: 'Berechtigungen',
          en: 'Permissions',
        },
        {
          entity: 'role',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'role',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Ticket
        { entity: 'ticket', property: 'handle', de: 'Kennung', en: 'Handle' },
        { entity: 'ticket', property: 'title', de: 'Titel', en: 'Title' },
        {
          entity: 'ticket',
          property: 'problemDescription',
          de: 'Problembeschreibung',
          en: 'Problem description',
        },
        {
          entity: 'ticket',
          property: 'solutionDescription',
          de: 'Lösungsbeschreibung',
          en: 'Solution description',
        },
        {
          entity: 'ticket',
          property: 'assignee',
          de: 'Bearbeiter',
          en: 'Assignee',
        },
        {
          entity: 'ticket',
          property: 'creator',
          de: 'Ersteller',
          en: 'Creator',
        },
        { entity: 'ticket', property: 'status', de: 'Status', en: 'Status' },
        {
          entity: 'ticket',
          property: 'priority',
          de: 'Priorität',
          en: 'Priority',
        },
        {
          entity: 'ticket',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'ticket',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // TicketPriority
        {
          entity: 'ticketPriority',
          property: 'handle',
          de: 'Kennung',
          en: 'Handle',
        },
        {
          entity: 'ticketPriority',
          property: 'description',
          de: 'Beschreibung',
          en: 'Description',
        },
        {
          entity: 'ticketPriority',
          property: 'color',
          de: 'Farbe',
          en: 'Color',
        },
        {
          entity: 'ticketPriority',
          property: 'tickets',
          de: 'Tickets',
          en: 'Tickets',
        },
        {
          entity: 'ticketPriority',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'ticketPriority',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // TicketStatus
        {
          entity: 'ticketStatus',
          property: 'handle',
          de: 'Kennung',
          en: 'Handle',
        },
        {
          entity: 'ticketStatus',
          property: 'description',
          de: 'Beschreibung',
          en: 'Description',
        },
        {
          entity: 'ticketStatus',
          property: 'tickets',
          de: 'Tickets',
          en: 'Tickets',
        },
        {
          entity: 'ticketStatus',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'ticketStatus',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },

        // Translation
        {
          entity: 'translation',
          property: 'entity',
          de: 'Entität',
          en: 'Entity',
        },
        {
          entity: 'translation',
          property: 'property',
          de: 'Eigenschaft',
          en: 'Property',
        },
        { entity: 'translation', property: 'value', de: 'Wert', en: 'Value' },
        {
          entity: 'translation',
          property: 'language',
          de: 'Sprache',
          en: 'Language',
        },
        {
          entity: 'translation',
          property: 'createdAt',
          de: 'Erstellt am',
          en: 'Created at',
        },
        {
          entity: 'translation',
          property: 'updatedAt',
          de: 'Aktualisiert am',
          en: 'Updated at',
        },
      ];

      if (de) {
        for (const t of translations) {
          em.create(TranslationItem, {
            entity: t.entity,
            property: t.property,
            value: t.de,
            language: de,
          });
        }
      }
      if (en) {
        for (const t of translations) {
          em.create(TranslationItem, {
            entity: t.entity,
            property: t.property,
            value: t.en,
            language: en,
          });
        }
      }
    }
  }
}
