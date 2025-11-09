# Phase 4: Enterprise
## Enterprise Features & Scale Readiness

**Duration:** 4 weeks (2 sessions)  
**Team:** 4-6 engineers  
**Goal:** Make platform enterprise-ready with SSO, white-label, proctoring, and API access

---

## Phase Overview

By the end of Phase 4, the platform will:
- Support SSO authentication (SAML, OAuth, LDAP)
- Enable white-label customization
- Integrate remote proctoring
- Provide public API for LMS integration
- Support organization management
- Meet enterprise security standards

**Success Criteria:**
- SSO working for 2+ providers
- At least 1 white-label deployment
- Proctoring integration tested
- API documentation published
- 2+ enterprise deals closed
- SOC 2 audit initiated

---

## Session 15: SSO & Organization Management (Weeks 29-30)

### Objectives
- Implement SSO (SAML 2.0, OAuth 2.0)
- Build organization management
- Create multi-tenant features

### Tasks & Story Points

**Backend (30 pts)**
- [12] Implement SAML 2.0 authentication
- [8] Implement OAuth 2.0 (Google Workspace, Microsoft)
- [6] Build organization management API
- [4] Add sub-account provisioning

**Frontend (22 pts)**
- [10] Build organization admin dashboard
- [8] Create SSO configuration UI
- [4] Add user management interface

**DevOps (8 pts)**
- [4] Set up subdomain routing for white-label
- [4] Configure SSL wildcard certificates

### Deliverables

**SAML 2.0 Implementation:**
```typescript
import { Strategy as SamlStrategy } from 'passport-saml';

@Injectable()
export class SSOService {
  async configureSAML(orgId: string, config: SAMLConfig) {
    // Validate SAML metadata
    const metadata = await this.fetchMetadata(config.metadataUrl);
    
    // Save configuration
    const ssoConfig = await this.prisma.ssoConfiguration.create({
      data: {
        organization_id: orgId,
        provider: 'saml',
        entity_id: config.entityId,
        sso_url: config.ssoUrl,
        certificate: config.certificate,
        metadata_url: config.metadataUrl,
        active: true,
      },
    });
    
    // Create passport strategy
    const strategy = new SamlStrategy(
      {
        entryPoint: config.ssoUrl,
        issuer: config.entityId,
        cert: config.certificate,
        callbackUrl: `${process.env.API_URL}/auth/saml/callback/${orgId}`,
      },
      async (profile, done) => {
        const user = await this.findOrCreateUser(profile, orgId);
        done(null, user);
      }
    );
    
    // Register strategy
    passport.use(`saml-${orgId}`, strategy);
    
    return ssoConfig;
  }
  
  async handleSAMLCallback(orgId: string, profile: SAMLProfile) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.displayName,
          organization_id: orgId,
          tier: 'SCALE',
          email_verified: true,
        },
      });
    } else {
      // Link to organization if not already
      if (user.organization_id !== orgId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { organization_id: orgId },
        });
      }
    }
    
    // Generate JWT
    const tokens = await this.authService.generateTokens(user);
    return tokens;
  }
}
```

**OAuth 2.0 for Google Workspace:**
```typescript
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

@Injectable()
export class OAuth2Service {
  async configureGoogleWorkspace(orgId: string, config: OAuthConfig) {
    const strategy = new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: `${process.env.API_URL}/auth/google/callback`,
        hd: config.hostedDomain, // Restrict to specific domain
      },
      async (accessToken, refreshToken, profile, done) => {
        // Verify user belongs to organization domain
        if (profile._json.hd !== config.hostedDomain) {
          return done(new Error('Not authorized for this organization'));
        }
        
        const user = await this.findOrCreateUser(profile, orgId);
        done(null, user);
      }
    );
    
    passport.use(`google-${orgId}`, strategy);
    
    return await this.prisma.ssoConfiguration.create({
      data: {
        organization_id: orgId,
        provider: 'google',
        client_id: config.clientId,
        client_secret: this.encrypt(config.clientSecret),
        hosted_domain: config.hostedDomain,
        active: true,
      },
    });
  }
}
```

**Organization Management:**
```typescript
@Injectable()
export class OrganizationService {
  async createOrganization(dto: CreateOrgDto) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        domain: dto.domain,
        tier: 'SCALE',
        seats_limit: dto.seatsLimit || 50,
        seats_used: 0,
      },
    });
    
    // Create admin user
    const adminUser = await this.prisma.user.create({
      data: {
        email: dto.adminEmail,
        name: dto.adminName,
        organization_id: org.id,
        role: 'ORG_ADMIN',
        tier: 'SCALE',
      },
    });
    
    // Send setup email
    await this.emailService.sendOrganizationSetup(adminUser, org);
    
    return org;
  }
  
  async inviteUsers(orgId: string, emails: string[]) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    
    if (org.seats_used + emails.length > org.seats_limit) {
      throw new BadRequestException('Seat limit exceeded');
    }
    
    // Create invitations
    const invitations = await Promise.all(
      emails.map(email =>
        this.prisma.invitation.create({
          data: {
            organization_id: orgId,
            email,
            token: this.generateInviteToken(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })
      )
    );
    
    // Send invitation emails
    await Promise.all(
      invitations.map(inv =>
        this.emailService.sendOrganizationInvite(inv)
      )
    );
    
    return invitations;
  }
  
  async acceptInvitation(token: string, userData: SignupDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });
    
    if (!invitation || invitation.expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }
    
    // Create user
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        organization_id: invitation.organization_id,
        email_verified: true,
        tier: 'SCALE',
      },
    });
    
    // Update seats used
    await this.prisma.organization.update({
      where: { id: invitation.organization_id },
      data: { seats_used: { increment: 1 } },
    });
    
    // Mark invitation as used
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { accepted_at: new Date() },
    });
    
    return user;
  }
}
```

**Organization Dashboard:**
```typescript
export function OrganizationDashboard({ orgId }: Props) {
  const { data: org } = useQuery(['org', orgId], () => api.org.get(orgId));
  const { data: users } = useQuery(['org-users', orgId], () => api.org.getUsers(orgId));
  const { data: analytics } = useQuery(['org-analytics', orgId], () => api.org.getAnalytics(orgId));
  
  return (
    <div className="org-dashboard">
      <header className="mb-8">
        <h1>{org.name}</h1>
        <p>Seats: {org.seats_used} / {org.seats_limit}</p>
      </header>
      
      {/* SSO Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Single Sign-On</CardTitle>
        </CardHeader>
        <CardContent>
          {org.sso_enabled ? (
            <div>
              <Badge>Active</Badge>
              <p>Provider: {org.sso_provider}</p>
              <Button variant="outline" onClick={() => setSSOModalOpen(true)}>
                Reconfigure
              </Button>
            </div>
          ) : (
            <Button onClick={() => setSSOModalOpen(true)}>
              Configure SSO
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* User Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <Button onClick={() => setInviteModalOpen(true)}>
            Invite Users
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={users}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { key: 'last_login_at', label: 'Last Active' },
              { key: 'actions', label: 'Actions' },
            ]}
          />
        </CardContent>
      </Card>
      
      {/* Aggregate Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="Total Tests" value={analytics.totalTests} />
            <StatCard title="Avg Score" value={`${analytics.avgScore}%`} />
            <StatCard title="Active Users" value={analytics.activeUsers} />
          </div>
          <BarChart
            data={analytics.userPerformance}
            xKey="user"
            yKey="score"
            height={300}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Checkpoint 4.1: SSO & Org Management** ✅
- [ ] SAML 2.0 working (test with Okta/OneLogin)
- [ ] OAuth 2.0 working (Google Workspace)
- [ ] Organization creation functional
- [ ] User invitation flow working
- [ ] Admin dashboard complete
- [ ] Seat management enforced

---

## Session 16: White-Label, Proctoring & API (Weeks 31-32)

### Objectives
- Implement white-label customization
- Integrate proctoring solution
- Build and document public API
- Launch preparation

### Tasks & Story Points

**Backend (28 pts)**
- [10] Build white-label configuration API
- [8] Integrate proctoring provider (ProctorU/Proctorio)
- [6] Create public API endpoints
- [4] Generate API documentation (Swagger)

**Frontend (24 pts)**
- [10] Implement white-label theming
- [8] Build proctoring interface
- [6] Create API key management UI

**DevOps (10 pts)**
- [6] Set up subdomain routing (org.answly.com)
- [4] Configure custom domain support

**Documentation (8 pts)**
- [4] Write API documentation
- [2] Create integration guides
- [2] Write security documentation

### Deliverables

**White-Label System:**
```typescript
@Injectable()
export class WhiteLabelService {
  async configureTheme(orgId: string, theme: ThemeConfig) {
    const config = await this.prisma.whiteLabelConfig.upsert({
      where: { organization_id: orgId },
      create: {
        organization_id: orgId,
        ...theme,
      },
      update: theme,
    });
    
    // Upload logo to S3
    if (theme.logo) {
      const logoUrl = await this.s3.upload({
        bucket: 'answly-white-label',
        key: `${orgId}/logo.png`,
        file: theme.logo,
      });
      
      await this.prisma.whiteLabelConfig.update({
        where: { organization_id: orgId },
        data: { logo_url: logoUrl },
      });
    }
    
    // Invalidate CDN cache
    await this.cdn.invalidate(`/org/${orgId}/*`);
    
    return config;
  }
  
  async getTheme(domain: string): Promise<ThemeConfig> {
    // Check if custom domain
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { custom_domain: domain },
          { subdomain: domain.split('.')[0] },
        ],
      },
      include: { whiteLabelConfig: true },
    });
    
    if (!org?.whiteLabelConfig) {
      return this.getDefaultTheme();
    }
    
    return {
      primary_color: org.whiteLabelConfig.primary_color,
      secondary_color: org.whiteLabelConfig.secondary_color,
      logo_url: org.whiteLabelConfig.logo_url,
      favicon_url: org.whiteLabelConfig.favicon_url,
      custom_css: org.whiteLabelConfig.custom_css,
    };
  }
}
```

**Proctoring Integration:**
```typescript
@Injectable()
export class ProctoringService {
  async startProctoredSession(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });
    
    // Create proctoring session with provider
    const proctoringSession = await this.proctorAPI.createSession({
      exam_name: session.exam.name,
      user_id: userId,
      duration_minutes: session.exam.duration_minutes,
      features: {
        webcam: true,
        screen_sharing: true,
        identity_verification: true,
        ai_monitoring: true,
      },
    });
    
    // Save proctoring metadata
    await this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        proctoring_enabled: true,
        proctoring_session_id: proctoringSession.id,
        proctoring_data: proctoringSession,
      },
    });
    
    return {
      proctoring_url: proctoringSession.launch_url,
      session_id: proctoringSession.id,
    };
  }
  
  async handleProctoringWebhook(event: ProctoringWebhookEvent) {
    const session = await this.prisma.testSession.findFirst({
      where: { proctoring_session_id: event.session_id },
    });
    
    switch (event.type) {
      case 'session.started':
        await this.prisma.testSession.update({
          where: { id: session.id },
          data: { proctoring_status: 'active' },
        });
        break;
        
      case 'violation.detected':
        await this.prisma.proctoringViolation.create({
          data: {
            session_id: session.id,
            type: event.violation_type,
            severity: event.severity,
            timestamp: event.timestamp,
            details: event.details,
          },
        });
        
        // Alert admin if severe
        if (event.severity === 'high') {
          await this.notificationService.alertAdmin({
            type: 'proctoring_violation',
            session_id: session.id,
            violation: event,
          });
        }
        break;
        
      case 'session.completed':
        await this.prisma.testSession.update({
          where: { id: session.id },
          data: {
            proctoring_status: 'completed',
            proctoring_report_url: event.report_url,
          },
        });
        break;
    }
  }
}
```

**Public API:**
```typescript
// API versioning and documentation
@Controller('api/v1')
@ApiTags('Answly Public API')
@UseGuards(ApiKeyGuard)
export class PublicAPIController {
  @Get('exams')
  @ApiOperation({ summary: 'List available exams' })
  @ApiResponse({ status: 200, description: 'List of exams' })
  async listExams(@Query() filters: ExamFilters) {
    return this.examService.findAll(filters);
  }
  
  @Post('test-sessions')
  @ApiOperation({ summary: 'Create a test session for a user' })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @ApiKey() apiKey: string,
  ) {
    const org = await this.getOrgFromApiKey(apiKey);
    return this.testSessionService.create(dto.user_id, dto.exam_id, org.id);
  }
  
  @Get('test-sessions/:id/results')
  @ApiOperation({ summary: 'Get test results' })
  @ApiResponse({ status: 200, description: 'Test results' })
  async getResults(
    @Param('id') sessionId: string,
    @ApiKey() apiKey: string,
  ) {
    await this.validateAccess(apiKey, sessionId);
    return this.testSessionService.getResults(sessionId);
  }
  
  @Post('webhooks')
  @ApiOperation({ summary: 'Receive webhooks for test events' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handleWebhook(
    @Body() event: WebhookEvent,
    @Headers('x-answly-signature') signature: string,
  ) {
    this.validateSignature(event, signature);
    await this.webhookService.process(event);
    return { received: true };
  }
}
```

**API Documentation (Swagger):**
```yaml
openapi: 3.0.0
info:
  title: Answly API
  version: 1.0.0
  description: Public API for LMS integration

servers:
  - url: https://api.answly.com/v1

security:
  - ApiKeyAuth: []

paths:
  /exams:
    get:
      summary: List available exams
      parameters:
        - in: query
          name: category
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Exam'

  /test-sessions:
    post:
      summary: Create test session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                user_id:
                  type: string
                exam_id:
                  type: string
      responses:
        '201':
          description: Session created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSession'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      
  schemas:
    Exam:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        duration_minutes:
          type: integer
          
    TestSession:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        status:
          type: string
```

**Checkpoint 4.2: Enterprise Ready** ✅
- [ ] White-label working (test with custom domain)
- [ ] Proctoring integration functional
- [ ] Public API documented and tested
- [ ] API keys can be generated
- [ ] Webhooks deliver events
- [ ] Custom domains configured

---

## Phase 4 Final Deliverables

### Enterprise Features
✅ SSO (SAML, OAuth, Google Workspace, Microsoft)  
✅ Organization management  
✅ White-label customization  
✅ Remote proctoring integration  
✅ Public API for LMS  
✅ Custom domain support  

### Documentation
✅ API documentation (Swagger/OpenAPI)  
✅ Integration guides  
✅ Security documentation  
✅ Admin guides  
✅ Deployment runbooks  

### Security & Compliance
✅ SOC 2 audit initiated  
✅ GDPR compliance verified  
✅ Penetration testing completed  
✅ Security headers configured  
✅ Data encryption at rest/transit  

---

## Phase 4 Gate Review

Final review before production launch:

### Enterprise Readiness
- [ ] SSO working with 2+ providers
- [ ] At least 1 white-label deployment live
- [ ] Proctoring tested end-to-end
- [ ] API used by at least 1 partner
- [ ] 2+ enterprise contracts signed

### Technical Excellence
- [ ] Load tested (10k concurrent users)
- [ ] Security audit passed (no critical issues)
- [ ] API documentation complete
- [ ] Monitoring dashboards operational
- [ ] Disaster recovery plan tested

### Business Readiness
- [ ] Enterprise sales process defined
- [ ] Support team trained
- [ ] Pricing finalized
- [ ] Legal agreements ready
- [ ] Customer success plan in place

---

## Production Launch Checklist

### Pre-Launch (1 week before)
- [ ] Final security audit
- [ ] Load testing passed
- [ ] Backup systems verified
- [ ] Monitoring alerts configured
- [ ] Support team briefed
- [ ] Marketing materials ready
- [ ] Press release prepared

### Launch Day
- [ ] Database migrations run
- [ ] Production deployment
- [ ] DNS switched
- [ ] SSL certificates verified
- [ ] Monitoring active
- [ ] Support on standby
- [ ] Announcement sent

### Post-Launch (First week)
- [ ] Monitor error rates
- [ ] Track conversion metrics
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Optimize performance
- [ ] Plan next features

---

## Post-Launch: Continuous Improvement

### Week 1-4: Stabilization
- Monitor and fix production issues
- Optimize performance bottlenecks
- Gather user feedback
- Address critical bugs

### Month 2-3: Optimization
- A/B test conversion flows
- Optimize AI costs
- Improve user onboarding
- Add requested features

### Month 4-6: Scale
- Expand to new exams
- International expansion
- Mobile apps (React Native)
- Advanced features

### Long-term Roadmap
- Collaborative study features
- Live classes integration
- B2B2C partnerships with schools
- International certifications

---

## Success Metrics Summary

### Technical Metrics
- **Availability:** 99.95%+
- **Latency:** <200ms API, <3s pages
- **Error Rate:** <0.1%
- **Test Success:** 99.9% (no data loss)

### Product Metrics
- **Active Users:** 10k+ (Month 3)
- **Tests Taken:** 50k+ (Month 3)
- **AI Questions:** 50k+ generated
- **User Satisfaction:** >4.2/5.0

### Business Metrics
- **MRR:** $50k+ (Month 6)
- **Conversion:** >5%
- **Churn:** <10%
- **LTV:CAC:** >3:1
- **Enterprise:** 5+ customers

---

## Conclusion

**8-Month Journey Complete:**
- ✅ Phase 1: Foundation (12 weeks)
- ✅ Phase 2: AI Integration (8 weeks)
- ✅ Phase 3: Monetization (8 weeks)
- ✅ Phase 4: Enterprise (4 weeks)

**Total:** Production-ready exam platform with AI, subscriptions, and enterprise features.

**Next Steps:**
1. Execute launch plan
2. Monitor metrics closely
3. Iterate based on feedback
4. Scale infrastructure as needed
5. Expand to new markets

---

# Phase 4 Spec Parity Addendum

This addendum augments Phase 4 with enterprise, compliance, and scale-readiness items from the technical specification.

## Session 15: SSO & Organization Management (Weeks 29-30)

- **Advanced RBAC & Audit Logs**
  - Fine-grained org-level permissions (seat admin, instructor, reviewer)
  - Immutable audit log (append-only) for admin actions and SSO events
  - Exportable audit trail (CSV) with tamper-evident hash chain
- **Data Residency & Multi-Region**
  - Region selection per org (EU/US) with S3 buckets + RDS read replicas pinned to region
  - Geo routing at CDN (CloudFront/Cloudflare); failover plan
  - Data processing addendum (DPA) templates and SCC readiness
- **Mobile Readiness (React Native/Expo) – Plan**
  - Shared API surface and auth flows; deep linking
  - Offline cache (SQLite/AsyncStorage) for practice sessions; background sync
  - Minimum viable mobile screens (Dashboard, Practice, Results)

## Session 16: White-Label, Proctoring & API (Weeks 31-32)

- **Secure Browser / Exam Integrity**
  - Kiosk/lockdown mode support (Safe Exam Browser config, or Chromebooks managed mode)
  - Clipboard/print prevention where permitted; tab switch detection + soft warnings
  - Configurable per exam/section to preserve fidelity
- **Plagiarism Detection (Essays)**
  - Turnitin API integration (primary) with Copyscape fallback
  - Essay similarity scores stored with attempt; admin thresholds and flags
- **API Access, Quotas & WAF**
  - API keys per org; scopes and per-key rate limits (Burst/SLM by tier)
  - Global WAF rules (L7) for abuse prevention; IP allow/deny lists by org
  - Usage analytics per API key (requests, errors, latency, cost)
- **DB Scale & Archival**
  - Partition large tables (Attempts, AIInteractions) by month; indexes by (user_id, question_id)
  - Warm/cold storage policy: move >12-month data to cheaper storage + parquet in data lake
  - PITR validated; DR runbook tested (RTO 1h, RPO 15m)
- **Compliance**
  - GDPR: DSAR automated flows (export/delete)
  - Accessibility conformance statement and regression checks each release
  - FERPA/COPPA guidance where applicable (schools/minors)

## Acceptance Criteria Additions

- Audit logs present and exportable; integrity verified via hash chain
- Region pinning works (EU org data stays in EU resources)
- Secure browser mode available for supported contexts
- Plagiarism detection live in staging; flags visible in review UI
- API keys with quotas/rate limits and usage analytics
- Partitioning + archival policies implemented and tested
- DR drill executed and documented


---

**🎉 Congratulations on completing the Answly implementation!**

For questions or support, contact:
- **Tech Lead:** [Name]
- **Product Manager:** [Name]
- **Email:** engineering@answly.com

