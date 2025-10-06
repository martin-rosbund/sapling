import { Test, TestingModule } from '@nestjs/testing';
import { AzureController } from './azure.controller';

describe('AzureController', () => {
  let controller: AzureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureController],
    }).compile();

    controller = module.get<AzureController>(AzureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
