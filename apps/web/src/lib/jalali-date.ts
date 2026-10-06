const DAY_MS =
  24 * 60 * 60 * 1000;

const latinPersianFormatter =
  new Intl.DateTimeFormat(
    "en-US-u-ca-persian-nu-latn",
    {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

const displayPersianFormatter =
  new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

export type JalaliParts = {
  year: number;
  month: number;
  day: number;
};

const persianDigits =
  "۰۱۲۳۴۵۶۷۸۹";

const arabicDigits =
  "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(
  value: string,
): string {
  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    );
}

export function toPersianDigits(
  value:
    | string
    | number,
): string {
  return String(
    value,
  ).replace(
    /\d/g,
    (digit) =>
      persianDigits[
        Number(
          digit,
        )
      ],
  );
}

function part(
  parts:
    Intl.DateTimeFormatPart[],
  type:
    Intl.DateTimeFormatPartTypes,
): number {
  const value =
    parts.find(
      (item) =>
        item.type === type,
    )?.value;

  return Number(
    value ?? 0,
  );
}

export function gregorianDateToJalaliParts(
  date: Date,
): JalaliParts {
  const parts =
    latinPersianFormatter
      .formatToParts(
        date,
      );

  return {
    year:
      part(
        parts,
        "year",
      ),

    month:
      part(
        parts,
        "month",
      ),

    day:
      part(
        parts,
        "day",
      ),
  };
}

export function gregorianIsoToJalaliParts(
  value: string,
): JalaliParts | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return gregorianDateToJalaliParts(
    date,
  );
}

export function formatGregorianAsJalali(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "";
  }

  const normalized =
    value.length >= 10
      ? value.slice(
          0,
          10,
        )
      : value;

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return value;
  }

  const date =
    new Date(
      `${normalized}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return displayPersianFormatter
    .format(
      date,
    )
    .replace(
      /٫/g,
      "/",
    );
}

function compareJalali(
  left: JalaliParts,
  right: JalaliParts,
): number {
  if (
    left.year !==
    right.year
  ) {
    return (
      left.year -
      right.year
    );
  }

  if (
    left.month !==
    right.month
  ) {
    return (
      left.month -
      right.month
    );
  }

  return (
    left.day -
    right.day
  );
}

export function jalaliPartsToGregorianIso(
  target: JalaliParts,
): string | null {
  if (
    target.year < 1200 ||
    target.year > 1700 ||
    target.month < 1 ||
    target.month > 12 ||
    target.day < 1 ||
    target.day > 31
  ) {
    return null;
  }

  /*
   * Persian new year occurs around March 20/21.
   * Scanning a bounded Gregorian year is tiny (~400 days)
   * and keeps this utility dependency-free and predictable.
   */
  const start =
    Date.UTC(
      target.year + 621,
      1,
      15,
      12,
      0,
      0,
    );

  for (
    let offset = 0;
    offset < 430;
    offset += 1
  ) {
    const date =
      new Date(
        start +
          offset *
            DAY_MS,
      );

    const current =
      gregorianDateToJalaliParts(
        date,
      );

    const compared =
      compareJalali(
        current,
        target,
      );

    if (
      compared === 0
    ) {
      return date
        .toISOString()
        .slice(
          0,
          10,
        );
    }

    if (
      compared > 0 &&
      current.year >=
        target.year
    ) {
      return null;
    }
  }

  return null;
}

export function parseJalaliText(
  value: string,
): {
  parts: JalaliParts;
  gregorian: string;
} | null {
  const normalized =
    toLatinDigits(
      value,
    )
      .trim()
      .replace(
        /[.\-\s]+/g,
        "/",
      )
      .replace(
        /\/+/g,
        "/",
      );

  const match =
    normalized.match(
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    );

  if (!match) {
    return null;
  }

  const parts: JalaliParts = {
    year:
      Number(
        match[1],
      ),

    month:
      Number(
        match[2],
      ),

    day:
      Number(
        match[3],
      ),
  };

  const gregorian =
    jalaliPartsToGregorianIso(
      parts,
    );

  if (!gregorian) {
    return null;
  }

  return {
    parts,
    gregorian,
  };
}

export function jalaliMonthLength(
  year: number,
  month: number,
): number {
  if (
    month >= 1 &&
    month <= 6
  ) {
    return 31;
  }

  if (
    month >= 7 &&
    month <= 11
  ) {
    return 30;
  }

  if (
    month !== 12
  ) {
    return 0;
  }

  return jalaliPartsToGregorianIso({
    year,
    month: 12,
    day: 30,
  })
    ? 30
    : 29;
}

export function todayGregorianIso(): string {
  const now =
    new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tehran",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      },
    );

  const parts =
    formatter
      .formatToParts(
        now,
      );

  const year =
    parts.find(
      (item) =>
        item.type ===
        "year",
    )?.value;

  const month =
    parts.find(
      (item) =>
        item.type ===
        "month",
    )?.value;

  const day =
    parts.find(
      (item) =>
        item.type ===
        "day",
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    return now
      .toISOString()
      .slice(
        0,
        10,
      );
  }

  return `${year}-${month}-${day}`;
}

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;