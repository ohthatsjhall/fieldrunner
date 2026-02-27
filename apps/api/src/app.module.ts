import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './core/auth/auth.module';
import { HealthModule } from './core/health/health.module';
import { DebugModule } from './debug/debug.module';
import { DatabaseModule } from './core/database/database.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BlueFolderModule } from './integrations/bluefolder/bluefolder.module';
import { OrgModule } from './org/org.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                  },
                },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
          },
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    DebugModule,
    WebhooksModule,
    OrgModule,
    BlueFolderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
