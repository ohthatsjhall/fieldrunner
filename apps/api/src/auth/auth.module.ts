import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Module({
  providers: [
    ClerkService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
  exports: [ClerkService],
})
export class AuthModule {}
