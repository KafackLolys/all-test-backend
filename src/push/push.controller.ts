import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { NovuService } from './novu.service.js';

type RegisterDeviceBody = {
  subscriberId?: unknown;
  providerId?: unknown;
  token?: unknown;
};

type TriggerBody = { title?: unknown; body?: unknown };

@Controller('push')
export class PushController {
  constructor(private readonly novu: NovuService) {}

  @Post('register')
  async register(@Body() body: RegisterDeviceBody) {
    if (
      !body ||
      typeof body !== 'object' ||
      typeof body.subscriberId !== 'string' ||
      typeof body.providerId !== 'string' ||
      typeof body.token !== 'string'
    ) {
      throw new BadRequestException('INVALID_DEVICE_REGISTRATION');
    }
    try {
      await this.novu.registerDeviceToken({
        subscriberId: body.subscriberId,
        providerId: body.providerId,
        token: body.token,
      });
      return { registered: true, subscriberId: this.novu.configuredSubscriberId };
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_DEVICE_REGISTRATION') {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'NOVU_REQUEST_FAILED',
      );
    }
  }

  @Post('check-novu')
  @HttpCode(200)
  async checkNovu(@Headers('authorization') authorization?: string) {
    const triggerKey = process.env.TEST_TRIGGER_KEY ?? '';
    if (!triggerKey || authorization !== `Bearer ${triggerKey}`) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    try {
      await this.novu.checkConnection();
      return { connected: true };
    } catch {
      throw new ServiceUnavailableException('NOVU_CONNECTION_FAILED');
    }
  }

  @Post('trigger')
  async trigger(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: TriggerBody,
  ) {
    const triggerKey = process.env.TEST_TRIGGER_KEY ?? '';
    if (!triggerKey || authorization !== `Bearer ${triggerKey}`) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    return {
      triggered: true,
      result: await this.novu.triggerTest({
        title: typeof body.title === 'string' ? body.title : undefined,
        body: typeof body.body === 'string' ? body.body : undefined,
      }),
    };
  }
}
