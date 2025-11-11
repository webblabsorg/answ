import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SSOService, CreateSSOConnectionDto, UpdateSSOConnectionDto, SAMLLoginRequest } from '../services/sso.service';
import { OrganizationGuard } from '../guards/organization.guard';
import { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthService } from '../../auth/auth.service';

@Controller('sso')
@UseGuards(JwtAuthGuard)
export class SSOController {
  constructor(private ssoService: SSOService, private authService: AuthService) {}

  /**
   * Create SSO connection
   * POST /sso/connections
   */
  @Post('connections')
  @UseGuards(OrganizationGuard)
  async createConnection(@CurrentUser() user: any, @Body() data: CreateSSOConnectionDto & { organization_id: string }) {
    return this.ssoService.createConnection(data.organization_id, user.id, data);
  }

  /**
   * Get SSO connection
   * GET /sso/connections/:id
   */
  @Get('connections/:id')
  async getConnection(@Param('id') id: string) {
    return this.ssoService.getConnection(id);
  }

  /**
   * Get organization SSO connections
   * GET /sso/connections/organization/:organizationId
   */
  @Get('connections/organization/:organizationId')
  @UseGuards(OrganizationGuard)
  async getOrganizationConnections(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.ssoService.getOrganizationConnections(organizationId, user.id);
  }

  /**
   * Update SSO connection
   * PUT /sso/connections/:id
   */
  @Put('connections/:id')
  async updateConnection(@Param('id') id: string, @CurrentUser() user: any, @Body() data: UpdateSSOConnectionDto) {
    return this.ssoService.updateConnection(id, user.id, data);
  }

  /**
   * Delete SSO connection
   * DELETE /sso/connections/:id
   */
  @Delete('connections/:id')
  async deleteConnection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ssoService.deleteConnection(id, user.id);
  }

  /**
   * Test SSO connection
   * POST /sso/connections/:id/test
   */
  @Post('connections/:id/test')
  async testConnection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ssoService.testConnection(id, user.id);
  }

  /**
   * Get SSO connection by domain
   * GET /sso/domain/:domain
   */
  @Get('domain/:domain')
  @Public()
  async getConnectionByDomain(@Param('domain') domain: string) {
    return this.ssoService.getConnectionByDomain(domain);
  }

  /**
   * Get SSO login history
   * GET /sso/connections/:id/history
   */
  @Get('connections/:id/history')
  async getLoginHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.ssoService.getLoginHistory(id, user.id, limitNumber);
  }

  /**
   * Get SSO connection stats
   * GET /sso/connections/:id/stats
   */
  @Get('connections/:id/stats')
  async getConnectionStats(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ssoService.getConnectionStats(id, user.id);
  }

  /**
   * SAML callback handler
   * POST /sso/saml/callback/:connectionId
   * This would be called by the SAML IdP after authentication
   */
  @Post('saml/callback/:connectionId')
  @Public()
  async samlCallback(
    @Param('connectionId') connectionId: string,
    @Body() samlResponse: SAMLLoginRequest,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    
    const user = await this.ssoService.handleSAMLLogin(
      connectionId,
      samlResponse,
      ipAddress,
      userAgent,
    );

    const tokens = await this.authService.generateTokens(user.id, user.email);
    return {
      message: 'SAML login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * OAuth callback handler
   * POST /sso/oauth/callback/:connectionId
   * This would be called after OAuth provider authentication
   */
  @Post('oauth/callback/:connectionId')
  @Public()
  async oauthCallback(
    @Param('connectionId') connectionId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const code = body?.code || (req.query?.code as string);
    const state = body?.state || (req.query?.state as string);

    const user = await this.ssoService.handleOAuthCallback(connectionId, code, state, ipAddress, userAgent);

    const tokens = await this.authService.generateTokens(user.id, user.email);
    return {
      message: 'OAuth login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }
}
