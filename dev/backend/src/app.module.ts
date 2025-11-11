import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExamsModule } from './exams/exams.module';
import { QuestionsModule } from './questions/questions.module';
import { TestSessionsModule } from './test-sessions/test-sessions.module';
import { GradingModule } from './grading/grading.module';
import { AdminModule } from './admin/admin.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { HomeworkModule } from './homework/homework.module';
import { HealthModule } from './health/health.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RealtimeModule } from './realtime/realtime.module';
// Optional modules will be conditionally required below to avoid build-time resolution
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScheduleModule } from '@nestjs/schedule';

const baseImports = [
  ConfigModule.forRoot({ isGlobal: true }),
  ThrottlerModule.forRoot([
    {
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per minute
    },
  ]),
  PrismaModule,
  CacheModule,
  ScheduleModule.forRoot(),
  AuthModule,
  UsersModule,
  ExamsModule,
  QuestionsModule,
  TestSessionsModule,
  GradingModule,
  AuditLogsModule,
  HomeworkModule,
  HealthModule,
  SubscriptionsModule,
];

// Feature-flag optional modules for easier local dev
if (process.env.FEATURE_ADMIN !== 'false') baseImports.push(AdminModule);

// Optional modules - disabled by default until fully implemented
const dynamicRequire = (p: string) => (eval('require') as NodeRequire)(p);
try {
  if (process.env.FEATURE_AI === 'true') {
    try {
      baseImports.push(dynamicRequire('./ai/ai.module').AIModule);
    } catch (e1) {
      baseImports.push(dynamicRequire('./_disabled_ai/ai.module').AIModule);
    }
  }
} catch (e) {
  console.log('AI module not available (optional feature)');
}

try {
  if (process.env.FEATURE_REALTIME === 'true') {
    baseImports.push(RealtimeModule);
  }
} catch (e) {
  console.log('Realtime module not available (optional feature)');
}

try {
  if (process.env.FEATURE_CALENDAR === 'true') {
    baseImports.push(dynamicRequire('./calendar/calendar.module').CalendarModule);
  }
} catch (e) {
  console.log('Calendar module not available (optional feature)');
}

try {
  if (process.env.FEATURE_LMS === 'true') {
    baseImports.push(dynamicRequire('./lms/lms.module').LMSModule);
  }
} catch (e) {
  console.log('LMS module not available (optional feature)');
}

try {
  if (process.env.FEATURE_BILLING === 'true') {
    baseImports.push(dynamicRequire('./billing/billing.module').BillingModule);
  }
} catch (e) {
  console.log('Billing module not available (optional feature)');
}

try {
  if (process.env.FEATURE_ENTERPRISE === 'true') {
    baseImports.push(dynamicRequire('./enterprise/enterprise.module').EnterpriseModule);
  }
} catch (e) {
  console.log('Enterprise module not available (optional feature)');
}

try {
  if (process.env.FEATURE_COMPLIANCE === 'true') {
    baseImports.push(dynamicRequire('./compliance/compliance.module').ComplianceModule);
  }
} catch (e) {
  console.log('Compliance module not available (optional feature)');
}

@Module({
  imports: baseImports,
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
