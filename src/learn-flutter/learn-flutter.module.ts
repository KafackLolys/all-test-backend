import { Module } from '@nestjs/common';
import { SqliteService } from '../database/sqlite.service.js';
import { PushModule } from '../push/push.module.js';
import { LearnFlutterController } from './learn-flutter.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [PushModule],
  controllers: [LearnFlutterController],
  providers: [SqliteService, ProductsService],
})
export class LearnFlutterModule {}
