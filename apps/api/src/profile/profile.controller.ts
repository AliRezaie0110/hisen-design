import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import {
  ProfileService,
  type UploadedProfilePhoto,
} from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profile:
      ProfileService,
  ) {}

  @Get('mine')
  mine(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.profile.mine(
      actor.id,
    );
  }

  @Patch('mine')
  updateMine(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: UpdateMyProfileDto,
  ) {
    return this.profile.updateMine(
      actor.id,
      dto,
    );
  }

  @Post('mine/photo')
  @UseInterceptors(
    FileInterceptor(
      'photo',
      {
        limits: {
          fileSize:
            3 * 1024 * 1024,
        },
      },
    ),
  )
  uploadPhoto(
    @CurrentUser()
    actor: AuthenticatedUser,
    @UploadedFile()
    photo?: UploadedProfilePhoto,
  ) {
    return this.profile.uploadPhoto(
      actor.id,
      photo,
    );
  }

  @Get('photo/:userId')
  async photo(
    @Param('userId')
    userId: string,
  ) {
    const photo =
      await this.profile.photo(
        userId,
      );

    return new StreamableFile(
      photo.buffer,
      {
        type:
          photo.mimeType,
        disposition:
          `inline; filename*=UTF-8''${encodeURIComponent(
            photo.originalName,
          )}`,
      },
    );
  }
}
