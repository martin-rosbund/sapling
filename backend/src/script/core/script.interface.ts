import type { ScriptResultClient } from './script.result.client.js';
import type { ScriptResultServer } from './script.result.server';
import type { AzureCalendarService } from '../../calendar/azure/azure.calendar.service';
import type { GoogleCalendarService } from '../../calendar/google/google.calendar.service';

export type ScriptServerContext = {
  currentItems?: object[];
};

/**
 * @interface
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Interface with all required methods for creating a custom executable script.
 */
export interface ScriptInterface {
  azureCalendarService?: AzureCalendarService;
  googleCalendarService?: GoogleCalendarService;
  // #region Execute
  /**
   * Executes the main script logic.
   *
   * @param   {object[]} items - The selected data records.
   * @param   {string} name - The entity-specific script action name.
   * @param   {unknown} parameter - Optional parameter payload for the action.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  execute(
    items: object[],
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient>;
  // #endregion

  // #region Open
  /**
   * Event triggered before records are loaded (open operation).
   *
   * @param   {object[]} items - The records to be loaded.
   * @returns {Promise<ScriptResultServer>} The result of the before read event.
   */
  beforeRead(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;

  /**
   * Event triggered after records are loaded (open operation).
   *
   * @param   {object[]} items - The records that have been loaded.
   * @returns {Promise<ScriptResultServer>} The result of the after read event.
   */
  afterRead(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;
  // #endregion

  // #region Insert
  /**
   * Event triggered before new records are inserted.
   *
   * @param   {object[]} items - The new records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  beforeInsert(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;

  /**
   * Event triggered after new records are inserted.
   *
   * @param   {object[]} items - The new records that have been inserted.
   * @returns {Promise<ScriptResultServer>} The result of the after insert event.
   */
  afterInsert(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;
  // #endregion

  // #region Update
  /**
   * Event triggered before records are updated.
   *
   * @param   {object[]} items - The records to be updated.
   * @returns {Promise<ScriptResultServer>} The result of the before update event.
   */
  beforeUpdate(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;

  /**
   * Event triggered after records are updated.
   *
   * @param   {object[]} items - The records that have been updated.
   * @returns {Promise<ScriptResultServer>} The result of the after update event.
   */
  afterUpdate(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;
  // #endregion

  // #region Delete
  /**
   * Event triggered before records are deleted.
   *
   * @param   {object[]} items - The records to be deleted.
   * @returns {Promise<ScriptResultServer>} The result of the before delete event.
   */
  beforeDelete(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;
  /**
   * Event triggered after records are deleted.
   *
   * @param   {object[]} items - The records that have been deleted.
   * @returns {Promise<ScriptResultServer>} The result of the after delete event.
   */
  afterDelete(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer>;
  // #endregion
}
