import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './core/auth/auth.module';
import { HealthModule } from './core/health/health.module';
import { DebugModule } from './debug/debug.module';
import { DatabaseModule } from './core/database/database.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BlueFolderModule } from './integrations/bluefolder/bluefolder.module';
import { VendorSourcingModule } from './integrations/vendor-sourcing/vendor-sourcing.module';
import { OrgModule } from './org/org.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
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
                    singleLine: false,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    messageFormat:
                      '{context} | {msg} {req.method} {req.url} {res.statusCode}',
                  },
                },
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                query: Object.keys(req.query ?? {}).length
                  ? req.query
                  : undefined,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
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
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    HealthModule,
    DebugModule,
    WebhooksModule,
    OrgModule,
    BlueFolderModule,
    VendorSourcingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
