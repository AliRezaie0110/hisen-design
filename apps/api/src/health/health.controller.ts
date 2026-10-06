import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  Public,
} from '../auth/decorators/public.decorator';
import {
  PrismaService,
} from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  @Public()
  @Get()
  async getHealth() {
    await this.prisma.ping();

    return {
      status: 'ok',
      service: 'bagheri-api',
      database: 'connected',
      timestamp:
        new Date().toISOString(),
    };
  }
}