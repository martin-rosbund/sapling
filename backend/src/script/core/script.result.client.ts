import { ScriptResult } from './script.result.js';

//#region Enum
export enum ScriptResultClientMethods {
  none,
  showMessage,
  callURL,
  setItemData,
}
//#endregion

export class ScriptResultClient extends ScriptResult {
  //#region Property
  public method: ScriptResultClientMethods;
  public item: object = {};
  //#endregion

  //#region Construct
  /**
   * @constructor
   * @author          Martin Rosbund
   * @summary         Neue Instanz der Klasse
   *
   * @param        {ScriptResultClientMethods}    method              Aufgaben für den Client.
   * @param        {boolean}                      parameter           Parameter der Aktion, z.B. URL oder Funktion.
   * @param        {boolean}                      isSuccess           Angabe ob die Aktion erfolgreich ausgeführt wurde.
   */
  constructor(
    method: ScriptResultClientMethods = ScriptResultClientMethods.none,
    isSuccess: boolean = true,
    parameter: string = '',
  ) {
    super(isSuccess, parameter);
    this.method = method;
  }
  //#endregion
}
