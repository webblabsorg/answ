import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationService } from './services/organization.service';
import { TeamService } from './services/team.service';
import { InviteService } from './services/invite.service';
import { SSOService } from './services/sso.service';
import { OrganizationController } from './controllers/organization.controller';
import { TeamController } from './controllers/team.controller';
import { InviteController } from './controllers/invite.controller';
import { SSOController } from './controllers/sso.controller';
import { OrganizationGuard } from './guards/organization.guard';

@Module({
  imports: [ConfigModule, PrismaModule, UsersModule, AuthModule],
  controllers: [OrganizationController, TeamController, InviteController, SSOController],
  providers: [
    OrganizationService,
    TeamService,
    InviteService,
    SSOService,
    OrganizationGuard,
  ],
  exports: [
    OrganizationService,
    TeamService,
    InviteService,
    SSOService,
    OrganizationGuard,
  ],
})
export class EnterpriseModule {}
