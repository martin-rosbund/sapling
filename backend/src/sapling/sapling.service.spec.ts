import { Test, TestingModule } from '@nestjs/testing';
import { SaplingService } from './sapling.service';

describe('LoginService', () => {
  let service: SaplingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaplingService],
    }).compile();

    service = module.get<SaplingService>(SaplingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
