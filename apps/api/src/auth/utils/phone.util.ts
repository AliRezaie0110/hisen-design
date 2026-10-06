import {
  BadRequestException,
} from '@nestjs/common';

export function normalizeIranianMobile(
  input: string,
): string {
  const value = input
    .trim()
    .replace(/[۰-۹]/g, (digit) =>
      String(
        '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit),
      ),
    )
    .replace(/[^\d+]/g, '');

  if (/^09\d{9}$/.test(value)) {
    return value;
  }

  const international =
    value.match(/^\+?98(9\d{9})$/);

  if (international) {
    return `0${international[1]}`;
  }

  if (/^9\d{9}$/.test(value)) {
    return `0${value}`;
  }

  throw new BadRequestException({
    code: 'INVALID_PHONE',
    message: 'شماره موبایل معتبر نیست.',
  });
}