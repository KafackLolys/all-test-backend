import { Injectable, Logger } from '@nestjs/common';

type NovuResult = { triggered: true } | { triggered: false; reason: string };

class NovuHttpError extends Error {
  constructor(readonly status: number) {
    super(`NOVU_HTTP_${status}`);
  }
}

@Injectable()
export class NovuService {
  private readonly logger = new Logger(NovuService.name);
  private readonly apiBaseUrl = (process.env.NOVU_API_BASE_URL ?? '').replace(/\/+$/, '');
  private readonly secretKey = process.env.NOVU_SECRET_KEY ?? '';
  private readonly subscriberId = process.env.NOVU_SUBSCRIBER_ID ?? 'flutter-test-001';
  private readonly workflowId = process.env.NOVU_WORKFLOW_ID ?? 'com-test-flutter';
  private readonly integrationIdentifier =
    process.env.NOVU_FCM_INTEGRATION_IDENTIFIER ?? '';

  get configuredSubscriberId(): string {
    return this.subscriberId;
  }

  async registerDeviceToken(input: {
    subscriberId: string;
    providerId: string;
    token: string;
  }): Promise<void> {
    if (
      input.subscriberId !== this.subscriberId ||
      input.providerId !== 'fcm' ||
      input.token.length < 20 ||
      input.token.length > 4096
    ) {
      throw new Error('INVALID_DEVICE_REGISTRATION');
    }

    try {
      await this.request(`/v1/subscribers/${encodeURIComponent(this.subscriberId)}`);
    } catch (error) {
      if (!(error instanceof NovuHttpError) || error.status !== 404) throw error;
      try {
        await this.request('/v1/subscribers', 'POST', { subscriberId: this.subscriberId });
      } catch (createError) {
        if (!(createError instanceof NovuHttpError) || createError.status !== 409) {
          throw createError;
        }
      }
    }

    await this.request(
      `/v1/subscribers/${encodeURIComponent(this.subscriberId)}/credentials`,
      'PUT',
      {
        providerId: 'fcm',
        ...(this.integrationIdentifier ? { integrationIdentifier: this.integrationIdentifier } : {}),
        credentials: { deviceTokens: [input.token] },
      },
    );
  }

  async triggerProductDeleted(productName: string): Promise<NovuResult> {
    if (!this.isConfigured()) {
      return { triggered: false, reason: 'NOVU_NOT_CONFIGURED' };
    }
    try {
      await this.request('/v1/events/trigger', 'POST', {
        name: this.workflowId,
        to: [this.subscriberId],
        payload: {
          title: 'Produit supprimé',
          body: `« ${productName} » a été supprimé.`,
        },
      });
      return { triggered: true };
    } catch (error) {
      const reason = error instanceof NovuHttpError
        ? `NOVU_HTTP_${error.status}`
        : 'NOVU_REQUEST_FAILED';
      this.logger.warn(`Product deletion event was not triggered (${reason}).`);
      return { triggered: false, reason };
    }
  }

  async checkConnection(): Promise<void> {
    await this.request('/v1/subscribers?limit=1');
  }

  async triggerTest(payload: { title?: string; body?: string }): Promise<unknown> {
    return this.request('/v1/events/trigger', 'POST', {
      name: this.workflowId,
      to: [this.subscriberId],
      payload: {
        title: payload.title?.slice(0, 120) || 'Test Flutter',
        body: payload.body?.slice(0, 500) || 'Notification de test depuis Novu.',
      },
    });
  }

  private isConfigured(): boolean {
    return this.apiBaseUrl.startsWith('https://') && this.secretKey.length > 0;
  }

  private async request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    if (!this.isConfigured()) throw new Error('NOVU_NOT_CONFIGURED');
    const response = await fetch(this.apiBaseUrl + path, {
      method,
      headers: {
        Authorization: `ApiKey ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    if (!response.ok) throw new NovuHttpError(response.status);
    return text ? (JSON.parse(text) as unknown) : {};
  }
}
