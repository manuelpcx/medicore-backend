import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoClientService } from './mercadopago-client.service';
import { PaymentsScheduler } from './payments.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User])],
  controllers: [PaymentsController],
  providers: [PaymentsService, MercadoPagoClientService, PaymentsScheduler],
  exports: [TypeOrmModule],
})
export class PaymentsModule {}
