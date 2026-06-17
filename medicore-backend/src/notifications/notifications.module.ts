import { Module } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
// import { NotificationsScheduler } from './notifications.scheduler'; // TODO: activar cuando haya dominio verificado en Resend
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
