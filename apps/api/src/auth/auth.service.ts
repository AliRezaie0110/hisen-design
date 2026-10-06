import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  SmsService,
} from './sms.service';
import {
  normalizeIranianMobile,
} from './utils/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly config:
      ConfigService,
    private readonly sms:
      SmsService,
  ) {}

  private number(
    name: string,
    fallback: number,
  ): number {
    const value =
      Number(
        this.config.get<string>(
          name,
        ),
      );

    return Number.isFinite(value)
      ? value
      : fallback;
  }

  private hashOtp(
    userId: string,
    code: string,
  ): string {
    const secret =
      this.config.get<string>(
        'OTP_HASH_SECRET',
      );

    if (!secret) {
      throw new Error(
        'OTP_HASH_SECRET is missing',
      );
    }

    return createHmac(
      'sha256',
      secret,
    )
      .update(
        `${userId}:${code}`,
      )
      .digest('hex');
  }

  private hashToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async requestOtp(
    rawPhone: string,
  ) {
    const phone =
      normalizeIranianMobile(
        rawPhone,
      );

    const user =
      await this.prisma.user.findUnique({
        where: {
          phone,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new ForbiddenException({
        code:
          'USER_NOT_ALLOWED',
        message:
          'این شماره در سیستم فعال نیست.',
      });
    }

    const now =
      new Date();

    const cooldown =
      this.number(
        'OTP_REQUEST_COOLDOWN_SECONDS',
        60,
      );

    const last =
      await this.prisma.otpCode.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (
      last &&
      now.getTime() -
        last.createdAt.getTime() <
        cooldown * 1000
    ) {
      throw new HttpException(
        {
          code:
            'OTP_COOLDOWN',
          message:
            'برای درخواست مجدد کمی صبر کنید.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const windowMinutes =
      this.number(
        'OTP_REQUEST_WINDOW_MINUTES',
        15,
      );

    const maxRequests =
      this.number(
        'OTP_REQUEST_MAX_PER_WINDOW',
        5,
      );

    const since =
      new Date(
        now.getTime() -
          windowMinutes *
            60 *
            1000,
      );

    const count =
      await this.prisma.otpCode.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: since,
          },
        },
      });

    if (
      count >= maxRequests
    ) {
      throw new HttpException(
        {
          code:
            'OTP_RATE_LIMIT',
          message:
            'تعداد درخواست کد بیش از حد مجاز است.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code =
      String(
        randomInt(
          100000,
          1000000,
        ),
      );

    const expiresSeconds =
      this.number(
        'OTP_EXPIRES_SECONDS',
        120,
      );

    const expiresAt =
      new Date(
        now.getTime() +
          expiresSeconds *
            1000,
      );

    const codeHash =
      this.hashOtp(
        user.id,
        code,
      );

    await this.prisma.$transaction(
      async (tx) => {
        await tx.otpCode.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await tx.otpCode.create({
          data: {
            userId:
              user.id,
            codeHash,
            expiresAt,
          },
        });
      },
    );

    try {
      await this.sms.sendOtp(
        phone,
        code,
      );
    } catch (error) {
      await this.prisma
        .otpCode
        .updateMany({
          where: {
            userId:
              user.id,
            codeHash,
            usedAt: null,
          },
          data: {
            usedAt:
              new Date(),
          },
        });

      throw error;
    }

    return {
      sent: true,
      expiresInSeconds:
        expiresSeconds,
    };
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
  ) {
    const phone =
      normalizeIranianMobile(
        rawPhone,
      );

    const user =
      await this.prisma.user.findUnique({
        where: {
          phone,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException({
        code:
          'LOGIN_NOT_ALLOWED',
        message:
          'ورود مجاز نیست.',
      });
    }

    const otp =
      await this.prisma.otpCode.findFirst({
        where: {
          userId:
            user.id,
          usedAt: null,
        },
        orderBy: {
          createdAt:
            'desc',
        },
      });

    if (!otp) {
      throw new UnauthorizedException({
        code:
          'OTP_NOT_FOUND',
        message:
          'کد معتبر پیدا نشد.',
      });
    }

    const now =
      new Date();

    if (
      otp.expiresAt <= now
    ) {
      await this.prisma
        .otpCode
        .update({
          where: {
            id: otp.id,
          },
          data: {
            usedAt: now,
          },
        });

      throw new UnauthorizedException({
        code:
          'OTP_EXPIRED',
        message:
          'کد منقضی شده است.',
      });
    }

    const maxAttempts =
      this.number(
        'OTP_MAX_ATTEMPTS',
        5,
      );

    if (
      otp.attempts >=
      maxAttempts
    ) {
      throw new UnauthorizedException({
        code:
          'OTP_LOCKED',
        message:
          'تعداد تلاش بیش از حد مجاز است.',
      });
    }

    const expected =
      Buffer.from(
        otp.codeHash,
        'hex',
      );

    const received =
      Buffer.from(
        this.hashOtp(
          user.id,
          code,
        ),
        'hex',
      );

    const valid =
      expected.length ===
        received.length &&
      timingSafeEqual(
        expected,
        received,
      );

    if (!valid) {
      const changed =
        await this.prisma
          .otpCode
          .update({
            where: {
              id: otp.id,
            },
            data: {
              attempts: {
                increment: 1,
              },
            },
          });

      if (
        changed.attempts >=
        maxAttempts
      ) {
        await this.prisma
          .otpCode
          .update({
            where: {
              id: otp.id,
            },
            data: {
              usedAt:
                now,
            },
          });
      }

      throw new UnauthorizedException({
        code:
          'OTP_INVALID',
        message:
          'کد صحیح نیست.',
      });
    }

    const rawToken =
      randomBytes(32)
        .toString('hex');

    const tokenHash =
      this.hashToken(
        rawToken,
      );

    const days =
      this.number(
        'SESSION_EXPIRES_DAYS',
        30,
      );

    const expiresAt =
      new Date(
        now.getTime() +
          days *
            86400000,
      );

    const result =
      await this.prisma
        .$transaction(
          async (tx) => {
            const claim =
              await tx
                .otpCode
                .updateMany({
                  where: {
                    id: otp.id,
                    usedAt: null,
                  },
                  data: {
                    usedAt: now,
                  },
                });

            if (
              claim.count !== 1
            ) {
              throw new UnauthorizedException({
                code:
                  'OTP_ALREADY_USED',
                message:
                  'این کد قبلاً استفاده شده است.',
              });
            }

            const savedUser =
              await tx.user.update({
                where: {
                  id: user.id,
                },
                data: {
                  phoneVerifiedAt:
                    user.phoneVerifiedAt ??
                    now,
                },
                select: {
                  id: true,
                  phone: true,
                  fullName: true,
                  role: true,
                  isActive: true,
                  phoneVerifiedAt: true,
                },
              });

            await tx
              .authSession
              .create({
                data: {
                  userId:
                    user.id,
                  tokenHash,
                  expiresAt,
                  lastSeenAt:
                    now,
                },
              });

            return savedUser;
          },
        );

    return {
      token: rawToken,
      expiresAt,
      user: result,
    };
  }

  async sessionUser(
    rawToken: string,
  ) {
    const tokenHash =
      this.hashToken(
        rawToken,
      );

    const session =
      await this.prisma
        .authSession
        .findUnique({
          where: {
            tokenHash,
          },
          include: {
            user: true,
          },
        });

    const now =
      new Date();

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.user.isActive
    ) {
      return null;
    }

    await this.prisma
      .authSession
      .update({
        where: {
          id: session.id,
        },
        data: {
          lastSeenAt:
            now,
        },
      });

    return {
      id:
        session.user.id,
      phone:
        session.user.phone,
      fullName:
        session.user.fullName,
      role:
        session.user.role,
      isActive:
        session.user.isActive,
      phoneVerifiedAt:
        session.user
          .phoneVerifiedAt,
      sessionId:
        session.id,
    };
  }

  async logout(
    sessionId: string,
  ) {
    await this.prisma
      .authSession
      .updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt:
            new Date(),
        },
      });
  }
}