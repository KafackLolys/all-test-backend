import { Module } from '@nestjs/common';
import { NovuService } from './novu.service';
import { PushController } from './push.controller';

@Module({
  controllers: [PushController],
  providers: [NovuService],
  exports: [NovuService],
})
export class PushModule {}
