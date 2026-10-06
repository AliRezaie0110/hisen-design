import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboard: LeaderboardService,
  ) {}

  @Get('monthly')
  @Roles(
    UserRole.WORKER,
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
  )
  monthly(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.leaderboard.monthly(
      Number(month),
      Number(year),
    );
  }
}
