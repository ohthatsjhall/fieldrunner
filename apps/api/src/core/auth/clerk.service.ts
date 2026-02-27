import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import type { ClerkJwtPayload } from './interfaces/clerk-payload.interface';

@Injectable()
export class ClerkService {
  private readonly secretKey: string;
  private readonly jwtKey?: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.getOrThrow<string>('CLERK_SECRET_KEY');
    this.jwtKey = this.config.get<string>('CLERK_JWT_KEY');
  }

  async verifySessionToken(token: string): Promise<ClerkJwtPayload> {
    const payload = await verifyToken(token, {
      secretKey: this.secretKey,
      ...(this.jwtKey ? { jwtKey: this.jwtKey } : {}),
    });

    return payload as unknown as ClerkJwtPayload;
  }
}
