import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SSOProvider, SSOStatus, OrganizationRole } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';

export interface CreateSSOConnectionDto {
  name: string;
  provider: SSOProvider;
  // SAML Config
  saml_entity_id?: string;
  saml_sso_url?: string;
  saml_certificate?: string;
  saml_sign_requests?: boolean;
  // OAuth Config
  oauth_client_id?: string;
  oauth_client_secret?: string;
  oauth_authorize_url?: string;
  oauth_token_url?: string;
  oauth_userinfo_url?: string;
  // Domain Config
  domains?: string[];
  auto_provision?: boolean;
  default_role?: OrganizationRole;
}

export interface UpdateSSOConnectionDto {
  name?: string;
  status?: SSOStatus;
  saml_entity_id?: string;
  saml_sso_url?: string;
  saml_certificate?: string;
  saml_sign_requests?: boolean;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  oauth_authorize_url?: string;
  oauth_token_url?: string;
  oauth_userinfo_url?: string;
  domains?: string[];
  auto_provision?: boolean;
  default_role?: OrganizationRole;
  is_active?: boolean;
}

export interface SAMLLoginRequest {
  nameID: string;
  sessionIndex?: string;
  attributes?: Record<string, any>;
  email: string;
  name?: string;
}

export interface OAuthLoginRequest {
  code: string;
  state: string;
}

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);

  constructor(private prisma: PrismaService) {}

  // Simple AES-256-GCM encryption for secrets at rest
  private encryptSecret(plain?: string | null): string | null {
    if (!plain) return null;
    const keyStr = process.env.SSO_SECRET_KEY || '';
    if (!keyStr || keyStr.length < 16) {
      // Fallback: store in plain if no key configured
      this.logger.warn('SSO_SECRET_KEY not set; storing oauth_client_secret in plain text');
      return plain;
    }
    const key = crypto.createHash('sha256').update(keyStr).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  private decryptSecret(stored?: string | null): string | null {
    if (!stored) return null;
    const keyStr = process.env.SSO_SECRET_KEY || '';
    if (!keyStr || keyStr.length < 16) {
      return stored; // Plain
    }
    const [ivB64, tagB64, dataB64] = stored.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return stored;
    const key = crypto.createHash('sha256').update(keyStr).digest();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  }

  /**
   * Create SSO connection
   */
  async createConnection(organizationId: string, userId: string, data: CreateSSOConnectionDto) {
    // Verify user is owner or admin
    await this.verifyOrganizationAccess(organizationId, userId);

    const connection = await this.prisma.sSOConnection.create({
      data: {
        organization_id: organizationId,
        name: data.name,
        provider: data.provider,
        saml_entity_id: data.saml_entity_id,
        saml_sso_url: data.saml_sso_url,
        saml_certificate: data.saml_certificate,
        saml_sign_requests: data.saml_sign_requests || false,
        oauth_client_id: data.oauth_client_id,
        oauth_client_secret: this.encryptSecret(data.oauth_client_secret),
        oauth_authorize_url: data.oauth_authorize_url,
        oauth_token_url: data.oauth_token_url,
        oauth_userinfo_url: data.oauth_userinfo_url,
        domains: data.domains || [],
        auto_provision: data.auto_provision || false,
        default_role: data.default_role || OrganizationRole.MEMBER,
        status: SSOStatus.PENDING_SETUP,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`SSO connection created: ${connection.name} (${connection.id})`);

    return connection;
  }

  /**
   * Get SSO connection
   */
  async getConnection(connectionId: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            logins: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    // Don't expose sensitive data
    return {
      ...connection,
      oauth_client_secret: connection.oauth_client_secret ? '***' : null,
      saml_certificate: connection.saml_certificate ? '*** (SET)' : null,
    };
  }

  /**
   * Get organization SSO connections
   */
  async getOrganizationConnections(organizationId: string, userId: string) {
    await this.verifyOrganizationAccess(organizationId, userId);

    const connections = await this.prisma.sSOConnection.findMany({
      where: { organization_id: organizationId },
      include: {
        _count: {
          select: {
            logins: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Mask sensitive data
    return connections.map((conn) => ({
      ...conn,
      oauth_client_secret: conn.oauth_client_secret ? '***' : null,
      saml_certificate: conn.saml_certificate ? '*** (SET)' : null,
    }));
  }

  /**
   * Update SSO connection
   */
  async updateConnection(connectionId: string, userId: string, data: UpdateSSOConnectionDto) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    await this.verifyOrganizationAccess(connection.organization_id, userId);

    const updated = await this.prisma.sSOConnection.update({
      where: { id: connectionId },
      data: {
        ...data,
        oauth_client_secret: data.oauth_client_secret !== undefined
          ? this.encryptSecret(data.oauth_client_secret)
          : undefined,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`SSO connection updated: ${updated.name} (${connectionId})`);

    return updated;
  }

  /**
   * Delete SSO connection
   */
  async deleteConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    await this.verifyOrganizationAccess(connection.organization_id, userId);

    await this.prisma.sSOConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(`SSO connection deleted: ${connection.name} (${connectionId})`);

    return { message: 'SSO connection deleted successfully' };
  }

  /**
   * Test SSO connection
   */
  async testConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    await this.verifyOrganizationAccess(connection.organization_id, userId);

    // Basic validation
    const errors: string[] = [];

    if (connection.provider === SSOProvider.SAML) {
      if (!connection.saml_entity_id) errors.push('Missing SAML Entity ID');
      if (!connection.saml_sso_url) errors.push('Missing SAML SSO URL');
      if (!connection.saml_certificate) errors.push('Missing SAML Certificate');
    } else {
      if (!connection.oauth_client_id) errors.push('Missing OAuth Client ID');
      if (!connection.oauth_client_secret) errors.push('Missing OAuth Client Secret');
      if (!connection.oauth_authorize_url) errors.push('Missing OAuth Authorize URL');
      if (!connection.oauth_token_url) errors.push('Missing OAuth Token URL');
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      message: 'SSO connection configuration is valid',
    };
  }

  /**
   * Get SSO connection by domain
   */
  async getConnectionByDomain(domain: string) {
    const connections = await this.prisma.sSOConnection.findMany({
      where: {
        is_active: true,
        status: SSOStatus.ACTIVE,
      },
    });

    // Find connection that matches domain
    const connection = connections.find((conn) =>
      conn.domains.some((d) => domain.endsWith(d)),
    );

    if (!connection) {
      throw new NotFoundException('No SSO connection found for this domain');
    }

    return connection;
  }

  /**
   * Handle SAML login
   */
  async handleSAMLLogin(connectionId: string, samlResponse: SAMLLoginRequest, ipAddress?: string, userAgent?: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
      include: {
        organization: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    if (!connection.is_active || connection.status !== SSOStatus.ACTIVE) {
      throw new BadRequestException('SSO connection is not active');
    }

    if (connection.provider !== SSOProvider.SAML) {
      throw new BadRequestException('Connection is not configured for SAML');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: samlResponse.email },
    });

    if (!user) {
      if (!connection.auto_provision) {
        throw new UnauthorizedException('User does not exist and auto-provisioning is disabled');
      }

      // Auto-provision user
      // Enforce seat limits
      if (connection.organization.used_seats >= connection.organization.max_seats) {
        throw new BadRequestException('Organization has reached maximum seats');
      }

      user = await this.prisma.user.create({
        data: {
          email: samlResponse.email,
          name: samlResponse.name || samlResponse.email.split('@')[0],
          password_hash: crypto.randomBytes(32).toString('hex'), // Random password (won't be used)
          organization_id: connection.organization_id,
          organization_role: connection.default_role || OrganizationRole.MEMBER,
          is_verified: true,
        },
      });

      // Update organization seat count
      await this.prisma.organization.update({
        where: { id: connection.organization_id },
        data: { used_seats: { increment: 1 } },
      });

      this.logger.log(`Auto-provisioned user via SSO: ${user.email}`);
    } else if (!user.organization_id && connection.auto_provision) {
      if (connection.organization.used_seats >= connection.organization.max_seats) {
        throw new BadRequestException('Organization has reached maximum seats');
      }
      // Add user to organization
      await this.prisma.user.update({
        where: { id: user.id },
        data: { organization_id: connection.organization_id, organization_role: connection.default_role || OrganizationRole.MEMBER },
      });

      await this.prisma.organization.update({
        where: { id: connection.organization_id },
        data: { used_seats: { increment: 1 } },
      });
    }

    // Log the SSO login
    await this.prisma.sSOLogin.create({
      data: {
        sso_connection_id: connectionId,
        user_id: user.id,
        nameID: samlResponse.nameID,
        session_index: samlResponse.sessionIndex,
        attributes: samlResponse.attributes,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Update last used
    await this.prisma.sSOConnection.update({
      where: { id: connectionId },
      data: { last_used_at: new Date() },
    });

    // Update user last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    this.logger.log(`SAML login successful: ${user.email} via ${connection.name}`);

    return user;
  }

  /**
   * Handle OAuth login
   */
  async handleOAuthLogin(connectionId: string, userInfo: any, ipAddress?: string, userAgent?: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
      include: {
        organization: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    if (!connection.is_active || connection.status !== SSOStatus.ACTIVE) {
      throw new BadRequestException('SSO connection is not active');
    }

    const email = userInfo.email;
    if (!email) {
      throw new BadRequestException('Email not provided by OAuth provider');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      if (!connection.auto_provision) {
        throw new UnauthorizedException('User does not exist and auto-provisioning is disabled');
      }

      // Enforce seat limits
      if (connection.organization.used_seats >= connection.organization.max_seats) {
        throw new BadRequestException('Organization has reached maximum seats');
      }
      // Auto-provision user
      user = await this.prisma.user.create({
        data: {
          email,
          name: userInfo.name || userInfo.given_name || email.split('@')[0],
          password_hash: crypto.randomBytes(32).toString('hex'),
          organization_id: connection.organization_id,
          organization_role: connection.default_role || OrganizationRole.MEMBER,
          is_verified: true,
        },
      });

      await this.prisma.organization.update({
        where: { id: connection.organization_id },
        data: { used_seats: { increment: 1 } },
      });

      this.logger.log(`Auto-provisioned user via OAuth: ${user.email}`);
    } else if (!user.organization_id && connection.auto_provision) {
      if (connection.organization.used_seats >= connection.organization.max_seats) {
        throw new BadRequestException('Organization has reached maximum seats');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { organization_id: connection.organization_id, organization_role: connection.default_role || OrganizationRole.MEMBER },
      });

      await this.prisma.organization.update({
        where: { id: connection.organization_id },
        data: { used_seats: { increment: 1 } },
      });
    }

    // Log the SSO login
    await this.prisma.sSOLogin.create({
      data: {
        sso_connection_id: connectionId,
        user_id: user.id,
        attributes: userInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Update last used
    await this.prisma.sSOConnection.update({
      where: { id: connectionId },
      data: { last_used_at: new Date() },
    });

    // Update user last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    this.logger.log(`OAuth login successful: ${user.email} via ${connection.name}`);

    return user;
  }

  /**
   * OAuth authorization-code callback: exchanges code for token and fetches userinfo
   */
  async handleOAuthCallback(connectionId: string, code?: string, _state?: string, ipAddress?: string, userAgent?: string) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
      include: { organization: true },
    });

    if (!connection) throw new NotFoundException('SSO connection not found');
    if (!connection.is_active || connection.status !== SSOStatus.ACTIVE) {
      throw new BadRequestException('SSO connection is not active');
    }
    if (!connection.oauth_client_id || !connection.oauth_client_secret || !connection.oauth_token_url || !connection.oauth_userinfo_url) {
      throw new BadRequestException('OAuth configuration incomplete');
    }

    const clientSecret = this.decryptSecret(connection.oauth_client_secret) as string;
    const base = process.env.SSO_OAUTH_REDIRECT_BASE || process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const redirectUri = `${base.replace(/\/$/, '')}/sso/oauth/callback/${connectionId}`;

    // Exchange code for token
    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
    params.set('client_id', connection.oauth_client_id);
    params.set('client_secret', clientSecret);

    const tokenResp = await axios.post(connection.oauth_token_url!, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResp.data?.access_token;
    if (!accessToken) {
      throw new BadRequestException('Failed to obtain access token');
    }

    // Fetch user info
    const userinfoResp = await axios.get(connection.oauth_userinfo_url!, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = userinfoResp.data;

    return this.handleOAuthLogin(connectionId, userInfo, ipAddress, userAgent);
  }

  /**
   * Get SSO login history
   */
  async getLoginHistory(connectionId: string, userId: string, limit = 50) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    await this.verifyOrganizationAccess(connection.organization_id, userId);

    const logins = await this.prisma.sSOLogin.findMany({
      where: { sso_connection_id: connectionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return logins;
  }

  /**
   * Get SSO stats
   */
  async getConnectionStats(connectionId: string, userId: string) {
    const connection = await this.prisma.sSOConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('SSO connection not found');
    }

    await this.verifyOrganizationAccess(connection.organization_id, userId);

    const totalLogins = await this.prisma.sSOLogin.count({
      where: { sso_connection_id: connectionId },
    });

    const uniqueUsers = await this.prisma.sSOLogin.findMany({
      where: { sso_connection_id: connectionId },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    const last30Days = await this.prisma.sSOLogin.count({
      where: {
        sso_connection_id: connectionId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      total_logins: totalLogins,
      unique_users: uniqueUsers.length,
      logins_last_30_days: last30Days,
      last_used_at: connection.last_used_at,
      status: connection.status,
      is_active: connection.is_active,
    };
  }

  /**
   * Verify user has access to organization
   */
  private async verifyOrganizationAccess(organizationId: string, userId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization_id: true,
        organization_role: true,
        organization_owned: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOwner = user.organization_owned?.id === organizationId;
    const isAdmin = user.organization_id === organizationId && user.organization_role === OrganizationRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions for SSO management');
    }
  }
}
