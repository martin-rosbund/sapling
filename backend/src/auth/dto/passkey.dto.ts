import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export class BeginPasskeyRegistrationDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the passkey',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}

export class VerifyPasskeyRegistrationDto {
  @ApiProperty({ type: Object })
  @IsObject()
  response!: RegistrationResponseJSON;

  @ApiPropertyOptional({
    description: 'Human-readable name for the passkey',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}

export class VerifyPasskeyAuthenticationDto {
  @ApiProperty({ type: Object })
  @IsObject()
  response!: AuthenticationResponseJSON;
}

export class PasskeyResponseDto {
  @ApiProperty()
  handle!: number;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional({ type: [String] })
  transports?: string[];

  @ApiPropertyOptional()
  credentialDeviceType?: string;

  @ApiPropertyOptional()
  credentialBackedUp!: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  lastUsedAt?: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: Date;
}

export class PasskeyRegistrationOptionsResponseDto {
  @ApiProperty({ type: Object })
  options!: PublicKeyCredentialCreationOptionsJSON;
}

export class PasskeyAuthenticationOptionsResponseDto {
  @ApiProperty({ type: Object })
  options!: PublicKeyCredentialRequestOptionsJSON;
}

export class LocalLoginPasskeyChallengeResponseDto {
  @ApiProperty()
  passkeyRequired!: boolean;

  @ApiProperty({ type: Object })
  options!: PublicKeyCredentialRequestOptionsJSON;
}
