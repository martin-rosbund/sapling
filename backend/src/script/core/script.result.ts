export class ScriptResult {
  // #region Properties
  /**
   * Indicates if the script action was successful.
   * @type {boolean}
   */
  public isSuccess: boolean;
  /**
   * Additional parameter for the action, e.g., URL or function name.
   * @type {string}
   */
  public parameter: string;
  // #endregion

  // #region Constructor
  /**
   * Creates a new instance of ScriptResult.
   *
   * @param {boolean} isSuccess - Indicates if the action was successful.
   * @param {string} parameter - Additional parameter for the action, e.g., URL or function name.
   */
  constructor(isSuccess: boolean = true, parameter: string = '') {
    this.isSuccess = isSuccess;
    this.parameter = parameter;
  }
  // #endregion
}
