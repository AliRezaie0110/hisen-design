import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';

type SmsIrResponse = {
  status?: number;
  message?: string;
};

type VerifyParameter = {
  name: string;
  value: string;
};

@Injectable()
export class SmsService {
  constructor(
    private readonly config:
      ConfigService,
  ) {}

  private async sendVerifyTemplate(
    mobile: string,
    templateId: number,
    parameters: VerifyParameter[],
  ): Promise<void> {
    const apiKey =
      this.config.get<string>(
        'SMSIR_API_KEY',
      );

    const baseUrl =
      this.config.get<string>(
        'SMSIR_BASE_URL',
      ) ??
      'https://api.sms.ir/v1';

    if (
      !apiKey ||
      !Number.isInteger(templateId) ||
      templateId <= 0
    ) {
      throw new ServiceUnavailableException({
        code:
          'SMS_NOT_CONFIGURED',
        message:
          'سرویس پیامک تنظیم نشده است.',
      });
    }

    let response: Response;

    try {
      response =
        await fetch(
          `${baseUrl}/send/verify`,
          {
            method: 'POST',
            headers: {
              Accept:
                'application/json',
              'Content-Type':
                'application/json',
              'X-API-KEY':
                apiKey,
            },
            body: JSON.stringify({
              mobile,
              templateId,
              parameters,
            }),
            signal:
              AbortSignal.timeout(
                10_000,
              ),
          },
        );
    } catch {
      throw new ServiceUnavailableException({
        code:
          'SMS_SEND_FAILED',
        message:
          'ارسال پیامک انجام نشد.',
      });
    }

    let result:
      SmsIrResponse | null = null;

    try {
      result =
        (await response.json()) as
          SmsIrResponse;
    } catch {
      result = null;
    }

    if (
      !response.ok ||
      (
        typeof result?.status ===
          'number' &&
        result.status !== 1
      )
    ) {
      throw new ServiceUnavailableException({
        code:
          'SMS_SEND_FAILED',
        message:
          'ارسال پیامک انجام نشد.',
      });
    }
  }

  async sendOtp(
    mobile: string,
    code: string,
  ): Promise<void> {
    const templateId =
      Number(
        this.config.get<string>(
          'SMSIR_TEMPLATE_ID',
        ),
      );

    const parameterName =
      this.config.get<string>(
        'SMSIR_PARAMETER_NAME',
      ) ?? 'CODE';

    await this.sendVerifyTemplate(
      mobile,
      templateId,
      [
        {
          name:
            parameterName,
          value:
            code,
        },
      ],
    );
  }

  async sendWorkApproval(
    mobile: string,
    trackingCode: string,
    amount: string,
  ): Promise<void> {
    const templateId =
      Number(
        this.config.get<string>(
          'SMSIR_WORK_APPROVED_TEMPLATE_ID',
        ),
      );

    const trackingParameter =
      this.config.get<string>(
        'SMSIR_WORK_APPROVED_TRACKING_PARAMETER',
      ) ??
      'TRACKINGCODE';

    const amountParameter =
      this.config.get<string>(
        'SMSIR_WORK_APPROVED_AMOUNT_PARAMETER',
      ) ??
      'AMOUNT';

    await this.sendVerifyTemplate(
      mobile,
      templateId,
      [
        {
          name:
            trackingParameter,
          value:
            trackingCode,
        },
        {
          name:
            amountParameter,
          value:
            amount,
        },
      ],
    );
  }
}