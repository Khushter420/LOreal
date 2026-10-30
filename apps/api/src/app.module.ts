import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { ClaimsModule } from './claims/claims.module';
// PostgreSQL remains available for a future switch back:
// import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),
    // Re-enable PrismaModule when PostgreSQL persistence is restored.
    // PrismaModule,
    ClaimsModule,
  ],
})
export class AppModule {}
