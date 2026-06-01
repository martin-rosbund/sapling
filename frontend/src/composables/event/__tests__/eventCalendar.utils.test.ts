import { describe, expect, it } from 'vitest'

import { getCalendarInteractionForcedDirtyFields } from '../eventCalendar.utils'

describe('getCalendarInteractionForcedDirtyFields', () => {
  it('keeps a newly opened draft clean until a dialog field changes', () => {
    expect(
      getCalendarInteractionForcedDirtyFields({
        isNewDraft: true,
        wasDragged: false,
        wasResized: false,
      }),
    ).toEqual([])
  })

  it('marks moved existing events as date changes', () => {
    expect(
      getCalendarInteractionForcedDirtyFields({
        isNewDraft: false,
        wasDragged: true,
        wasResized: false,
      }),
    ).toEqual(['startDate', 'endDate'])
  })

  it('marks resized existing events as an end date change', () => {
    expect(
      getCalendarInteractionForcedDirtyFields({
        isNewDraft: false,
        wasDragged: false,
        wasResized: true,
      }),
    ).toEqual(['endDate'])
  })
})
