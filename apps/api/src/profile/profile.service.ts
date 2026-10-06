import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

export type UploadedProfilePhoto = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private photoDirectory(): string {
    const cwd =
      process.cwd();

    const normalized =
      cwd
        .replace(/\\/g, '/')
        .toLowerCase();

    if (
      normalized.endsWith(
        '/apps/api',
      )
    ) {
      return resolve(
        cwd,
        'uploads',
        'profile-photos',
      );
    }

    return resolve(
      cwd,
      'apps',
      'api',
      'uploads',
      'profile-photos',
    );
  }

  private photoExtension(
    mimeType: string,
  ): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';

      case 'image/png':
        return '.png';

      case 'image/webp':
        return '.webp';

      default:
        throw new BadRequestException({
          code:
            'INVALID_PROFILE_PHOTO_TYPE',
          message:
            'عکس پروفایل باید JPG، PNG یا WEBP باشد.',
        });
    }
  }

  private present(user: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
    profileTitle: string | null;
    profileBio: string | null;
    profilePhotoFileName: string | null;
    updatedAt: Date;
  }) {
    return {
      id:
        user.id,
      fullName:
        user.fullName,
      phone:
        user.phone,
      role:
        user.role,
      profileTitle:
        user.profileTitle,
      profileBio:
        user.profileBio,
      hasProfilePhoto:
        Boolean(
          user.profilePhotoFileName,
        ),
      profilePhotoVersion:
        user.updatedAt.toISOString(),
    };
  }

  private async userOrThrow(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id:
            userId,
        },
      });

    if (!user) {
      throw new NotFoundException({
        code:
          'PROFILE_NOT_FOUND',
        message:
          'پروفایل کاربر پیدا نشد.',
      });
    }

    return user;
  }

  async mine(
    userId: string,
  ) {
    const user =
      await this.userOrThrow(
        userId,
      );

    return this.present(
      user,
    );
  }

  async updateMine(
    userId: string,
    dto: UpdateMyProfileDto,
  ) {
    const profileTitle =
      dto.profileTitle ===
      undefined
        ? undefined
        : dto.profileTitle
            .trim() ||
          null;

    const profileBio =
      dto.profileBio ===
      undefined
        ? undefined
        : dto.profileBio
            .trim() ||
          null;

    const user =
      await this.prisma.user.update({
        where: {
          id:
            userId,
        },
        data: {
          ...(profileTitle !==
          undefined
            ? {
                profileTitle,
              }
            : {}),
          ...(profileBio !==
          undefined
            ? {
                profileBio,
              }
            : {}),
        },
      });

    return this.present(
      user,
    );
  }

  async uploadPhoto(
    userId: string,
    photo?: UploadedProfilePhoto,
  ) {
    if (!photo) {
      throw new BadRequestException({
        code:
          'PROFILE_PHOTO_REQUIRED',
        message:
          'فایل عکس پروفایل ارسال نشده است.',
      });
    }

    if (
      photo.size <=
      0
    ) {
      throw new BadRequestException({
        code:
          'EMPTY_PROFILE_PHOTO',
        message:
          'فایل عکس خالی است.',
      });
    }

    if (
      photo.size >
      3 * 1024 * 1024
    ) {
      throw new BadRequestException({
        code:
          'PROFILE_PHOTO_TOO_LARGE',
        message:
          'حجم عکس پروفایل نباید بیشتر از ۳ مگابایت باشد.',
      });
    }

    const extension =
      this.photoExtension(
        photo.mimetype,
      );

    const previous =
      await this.userOrThrow(
        userId,
      );

    const directory =
      this.photoDirectory();

    await mkdir(
      directory,
      {
        recursive:
          true,
      },
    );

    const fileName =
      `${randomUUID()}${extension}`;

    await writeFile(
      resolve(
        directory,
        fileName,
      ),
      photo.buffer,
    );

    try {
      const user =
        await this.prisma.user.update({
          where: {
            id:
              userId,
          },
          data: {
            profilePhotoFileName:
              fileName,
            profilePhotoOriginalName:
              photo.originalname,
            profilePhotoMimeType:
              photo.mimetype,
          },
        });

      if (
        previous.profilePhotoFileName &&
        previous.profilePhotoFileName !==
          fileName
      ) {
        await unlink(
          resolve(
            directory,
            previous.profilePhotoFileName,
          ),
        ).catch(
          () => undefined,
        );
      }

      return this.present(
        user,
      );
    } catch (error) {
      await unlink(
        resolve(
          directory,
          fileName,
        ),
      ).catch(
        () => undefined,
      );

      throw error;
    }
  }

  async photo(
    userId: string,
  ) {
    const user =
      await this.userOrThrow(
        userId,
      );

    if (
      !user.profilePhotoFileName ||
      !user.profilePhotoMimeType
    ) {
      throw new NotFoundException({
        code:
          'PROFILE_PHOTO_NOT_FOUND',
        message:
          'عکس پروفایل ثبت نشده است.',
      });
    }

    try {
      const buffer =
        await readFile(
          resolve(
            this.photoDirectory(),
            user.profilePhotoFileName,
          ),
        );

      return {
        buffer,
        mimeType:
          user.profilePhotoMimeType,
        originalName:
          user.profilePhotoOriginalName ??
          'profile-photo',
      };
    } catch {
      throw new NotFoundException({
        code:
          'PROFILE_PHOTO_NOT_FOUND',
        message:
          'فایل عکس پروفایل پیدا نشد.',
      });
    }
  }
}
