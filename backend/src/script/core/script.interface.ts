import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server';

/**
 * @interface
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Interface mit allen benötigen Methoden für die Erstellung eines eigenen ausführbaren Skripts.
 */
export interface ScriptInterface {
  //#region Execute
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Ausführungsmethode
   *
   * @param   {object[]}      items       Selektierte Datensätze
   *
   * @returns {Promise<ScriptResultClient>} Aktion
   */
  execute(items: object[]): Promise<ScriptResultClient>;
  //#endregion

  //#region Open
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event bevor Datensätze geladen werden.
   *
   * @param   {object[]}  items       Geladene Datensätze beim öffnen
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  beforeOpen(items: object[]): Promise<ScriptResultServer>;

  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event nachdem Datensätze geladen werden.
   *
   * @param   {object[]}  items       Geladene Datensätze beim öffnen
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  afterOpen(items: object[]): Promise<ScriptResultServer>;
  //#endregion

  //#region Insert
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event bevor Datensätze angelegt werden.
   *
   * @param   {object[]}  items        Neu anzulegende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  beforeInsert(items: object[]): Promise<ScriptResultServer>;

  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event nachdem Datensätze angelegt werden.
   *
   * @param   {object[]}  items        Neu anzulegende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  afterInsert(items: object[]): Promise<ScriptResultServer>;
  //#endregion

  //#region Update
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event bevor Datensätze bearbeitet werden.
   *
   * @param   {object[]}  items        zu bearbeitende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  beforeUpdate(items: object[]): Promise<ScriptResultServer>;

  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event nachdem Datensätze bearbeitet werden.
   *
   * @param   {object[]}  items        zu bearbeitende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  afterUpdate(items: object[]): Promise<ScriptResultServer>;
  //#endregion

  //#region Delete
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event bevor Datensätze gelöscht werden.
   *
   * @param   {object[]}  items       Zu löschende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  beforeDelete(items: object[]): Promise<ScriptResultServer>;
  /**
   * @method
   * @author  Martin Rosbund
   * @summary Event bevor Datensätze gelöscht werden.
   *
   * @param   {object[]}  items       Zu löschende Datensätze
   *
   * @returns {Promise<ScriptResultServer>} Aktion
   */
  afterDelete(items: object[]): Promise<ScriptResultServer>;
  //#endregion
}
