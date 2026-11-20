import { Module } from '@nestjs/common';
import { NovuService } from './novu.service.js';
import { PushController } from './push.controller.js';

@Module({
  controllers: [PushController],
  providers: [NovuService],
  exports: [NovuService],
})
export class PushModule {}
