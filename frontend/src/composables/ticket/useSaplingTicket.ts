export function useSaplingTicket(parentFilter?: { value: Record<string, unknown> }) {
  function onSelectedPeoplesUpdate(val: Array<string>) {
    let filter: Record<string, unknown> = {};
    if (val.length > 0) {
      filter = { ...filter, assignee: { $in: val } };
    }
    if (parentFilter) {
      parentFilter.value = { ...filter };
    }
  }
  // #region Return
  return {
    onSelectedPeoplesUpdate
  };
  // #endregion
}
