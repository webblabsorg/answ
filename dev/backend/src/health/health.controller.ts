import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('/')
  root() {
    return { status: 'ok' };
  }

  @Public()
  @Get('/health')
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('/ready')
  ready() {
    return { status: 'ready' };
  }
}
