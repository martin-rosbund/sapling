import { ScriptResult } from './script.result.js';

// #region Enum
/**
 * Enum representing the available client-side script result actions.
 * Used to instruct the client on what to do after script execution.
 */
export enum ScriptResultClientMethods {
  none,
  showMessage,
  callURL,
  setItemData,
}
// #endregion

export class ScriptResultClient extends ScriptResult {
  // #region Properties
  /**
   * The client-side action to be performed after script execution.
   * @type {ScriptResultClientMethods}
   */
  public method: ScriptResultClientMethods;
  /**
   * The item data to be sent to the client (if applicable).
   * @type {object}
   */
  public item: object = {};
  // #endregion

  // #region Constructor
  /**
   * Creates a new instance of ScriptResultClient.
   *
   * @param {ScriptResultClientMethods} method - The client action to perform.
   * @param {boolean} isSuccess - Indicates if the action was successful.
   * @param {string} parameter - Additional parameter for the action, e.g., URL or function name.
   */
  constructor(
    method: ScriptResultClientMethods = ScriptResultClientMethods.none,
    isSuccess: boolean = true,
    parameter: string = '',
  ) {
    super(isSuccess, parameter);
    this.method = method;
  }
  // #endregion
}
