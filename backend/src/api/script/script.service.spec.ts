import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ScriptResultServer } from '../../script/core/script.result.server';
import { ScriptMethods, ScriptService } from './script.service';

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const waitForBackgroundTasks = async () => {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  await Promise.resolve();
};

describe('ScriptService', () => {
  beforeEach(() => {
    global.log = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    } as never;
  });

  it('returns the script result without waiting for webhook subscriptions', async () => {
    const webhookDeferred = createDeferred<unknown>();
    const payload = {
      handle: 1,
      title: 'Initial payload',
    };
    type FindAllMock = (
      ...args: unknown[]
    ) => Promise<Array<{ handle: number }>>;
    type QuerySubscriptionMock = (
      handle: number,
      payload: object[],
    ) => Promise<unknown>;
    const em = {
      findAll: jest.fn<FindAllMock>().mockResolvedValue([{ handle: 5 }]),
    };
    const webhookService = {
      querySubscription: jest
        .fn<QuerySubscriptionMock>()
        .mockImplementation(() => webhookDeferred.promise),
    };
    const service = new ScriptService(
      em as never,
      webhookService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const expectedResult = new ScriptResultServer([payload]);

    jest.spyOn(service, 'runSubscription').mockResolvedValue(true);
    jest.spyOn(service, 'runServerMethod').mockResolvedValue(expectedResult);

    const resultPromise = service.runServer(
      ScriptMethods.afterInsert,
      payload,
      { handle: 'ticket' } as never,
      { handle: 9 } as never,
    );

    payload.title = 'Mutated after scheduling';

    const raceResult = await Promise.race([
      resultPromise.then(() => 'resolved'),
      new Promise<'timeout'>((resolve) => {
        setImmediate(() => resolve('timeout'));
      }),
    ]);

    expect(raceResult).toBe('resolved');
    await expect(resultPromise).resolves.toBe(expectedResult);

    await waitForBackgroundTasks();

    expect(webhookService.querySubscription).toHaveBeenCalledWith(5, [
      expect.objectContaining({
        handle: 1,
        title: 'Initial payload',
      }),
    ]);

    webhookDeferred.resolve(undefined);
  });

  it('forwards client formatting context to teams and inbox subscriptions', async () => {
    type FindAllMock = (
      ...args: unknown[]
    ) => Promise<Array<{ handle: number; recipientField: string }>>;
    const em = {
      findAll: jest
        .fn<FindAllMock>()
        .mockResolvedValueOnce([
          { handle: 5, recipientField: 'assigneePerson' },
        ])
        .mockResolvedValueOnce([
          { handle: 6, recipientField: 'assigneePerson' },
        ]),
    };
    const teamsService = {
      querySubscription: jest
        .fn<
          (
            handle: number,
            payload: object[],
            user: object,
            relations: string[],
            context: { clientLocale?: string; clientTimeZone?: string },
          ) => Promise<void>
        >()
        .mockResolvedValue(undefined),
    };
    const inboxService = {
      querySubscription: jest
        .fn<
          (
            handle: number,
            payload: object[],
            user: object,
            relations: string[],
            context: { clientLocale?: string; clientTimeZone?: string },
          ) => Promise<void>
        >()
        .mockResolvedValue(undefined),
    };
    const service = new ScriptService(
      em as never,
      { querySubscription: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      teamsService as never,
      inboxService as never,
    );

    await expect(
      service.runSubscription(
        ScriptMethods.afterUpdate,
        { handle: 7 },
        { handle: 'ticket' } as never,
        { handle: 9 } as never,
        {
          clientLocale: 'de-DE',
          clientTimeZone: 'Europe/Berlin',
        },
      ),
    ).resolves.toBe(true);

    expect(teamsService.querySubscription).toHaveBeenCalledWith(
      5,
      [{ handle: 7 }],
      { handle: 9 },
      ['assigneePerson'],
      {
        clientLocale: 'de-DE',
        clientTimeZone: 'Europe/Berlin',
      },
    );
    expect(inboxService.querySubscription).toHaveBeenCalledWith(
      6,
      [{ handle: 7 }],
      { handle: 9 },
      ['assigneePerson'],
      {
        clientLocale: 'de-DE',
        clientTimeZone: 'Europe/Berlin',
      },
    );
  });
});
