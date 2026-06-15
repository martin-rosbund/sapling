import { ImportProcessor } from './import.processor';

describe('ImportProcessor', () => {
  it('dispatches validation jobs to the import service', async () => {
    const service = {
      processQueuedValidation: jest.fn().mockResolvedValue(undefined),
      processQueuedExecution: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new ImportProcessor(service as never);

    await processor.process({
      name: 'validate-import-batch',
      data: { batchHandle: 12, userHandle: 7 },
    } as never);

    expect(service.processQueuedValidation).toHaveBeenCalledWith(12, 7);
    expect(service.processQueuedExecution).not.toHaveBeenCalled();
  });

  it('dispatches execution jobs to the import service', async () => {
    const service = {
      processQueuedValidation: jest.fn().mockResolvedValue(undefined),
      processQueuedExecution: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new ImportProcessor(service as never);

    await processor.process({
      name: 'execute-import-batch',
      data: { batchHandle: 13, userHandle: 8 },
    } as never);

    expect(service.processQueuedExecution).toHaveBeenCalledWith(13, 8);
    expect(service.processQueuedValidation).not.toHaveBeenCalled();
  });
});
