import { ScriptResult } from './script.result';

// #region Enum
/**
 * Enum representing the available server-side script result actions.
 * Used to instruct the server on what to do after script execution.
 */
export enum ScriptResultServerMethods {
  none,
  overwrite,
  cancel,
}
// #endregion

export class ScriptResultServer extends ScriptResult {
  // #region Properties
  /**
   * The server-side action to be performed after script execution.
   * @type {ScriptResultServerMethods}
   */
  public method: ScriptResultServerMethods;
  /**
   * The array of items affected or returned by the server script.
   * @type {object[]}
   */
  public items: object[];
  // #endregion

  // #region Constructor
  /**
   * Creates a new instance of ScriptResultServer.
   *
   * @param {object[]} items - The items affected or returned by the server script.
   * @param {ScriptResultServerMethods} method - The server action to perform.
   * @param {boolean} isSuccess - Indicates if the action was successful.
   * @param {string} parameter - Additional parameter for the action, e.g., URL or function name.
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
  // #endregion
}
