export class ScriptResult {
  //#region Property
  public isSuccess: boolean;
  public parameter: string;
  //#endregion

  //#region Construct
  /**
   * @constructor
   * @author          Martin Rosbund
   * @summary         Neue Instanz der Klasse
   *
   * @param        {boolean}              parameter           Parameter der Aktion, z.B. URL oder Funktion
   * @param        {boolean}              isSuccess           Angabe ob die Aktion erfolgreich ausgeführt wurde
   */
  constructor(isSuccess: boolean = true, parameter: string = '') {
    this.isSuccess = isSuccess;
    this.parameter = parameter;
  }
  //#endregion
}
