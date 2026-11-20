import { Module } from '@nestjs/common';
import { SqliteService } from '../database/sqlite.service';
import { PushModule } from '../push/push.module';
import { LearnFlutterController } from './learn-flutter.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PushModule],
  controllers: [LearnFlutterController],
  providers: [SqliteService, ProductsService],
})
export class LearnFlutterModule {}
