import { ScriptResult } from './script.result';

//#region Enum
export enum ScriptResultServerMethods {
  none,
  overwrite,
  cancel,
}
//#endregion

export class ScriptResultServer extends ScriptResult {
  //#region Property
  public method: ScriptResultServerMethods;
  public items: object[];
  //#endregion

  //#region Construct
  /**
   * @constructor
   * @author          Martin Rosbund
   * @summary         Neue Instanz der Klasse
   *
   * @param        {ScriptResultServerMethods}    method              Aufgabe für den Server.
   * @param        {boolean}                      parameter           Parameter der Aktion, z.B. URL oder Funktion.
   * @param        {boolean}                      isSuccess           Angabe ob die Aktion erfolgreich ausgeführt wurde.
   */
  constructor(
    items: object[],
    method: ScriptResultServerMethods = ScriptResultServerMethods.none,
    isSuccess: boolean = true,
    parameter: string = '',
  ) {
    super(isSuccess, parameter);
    this.method = method;
    this.items = items;
  }
  //#endregion
}
