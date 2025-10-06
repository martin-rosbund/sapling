import { Test, TestingModule } from '@nestjs/testing';
import { SaplingController } from './sapling.controller';

describe('SaplingController', () => {
  let controller: SaplingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SaplingController],
    }).compile();

    controller = module.get<SaplingController>(SaplingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
