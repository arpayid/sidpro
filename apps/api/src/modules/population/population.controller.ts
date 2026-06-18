import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PopulationService } from './population.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('residents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PopulationController {
  constructor(private populationService: PopulationService) {}

  @Get()
  @RequirePermissions('population.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const viewSensitive = user.permissions.includes('population.view_sensitive');
    return this.populationService.findAll(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      viewSensitive,
    );
  }

  @Get(':id')
  @RequirePermissions('population.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const viewSensitive = user.permissions.includes('population.view_sensitive');
    return this.populationService.findOne(user, id, viewSensitive);
  }

  @Post()
  @RequirePermissions('population.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      nik: string;
      fullName: string;
      gender: string;
      birthPlace: string;
      birthDate: string;
      religion?: string;
      education?: string;
      occupation?: string;
      maritalStatus?: string;
      bloodType?: string;
      disabilityStatus?: string;
      residentStatus?: string;
      familyId?: string;
      addressId?: string;
    },
    @Req() req: Request,
  ) {
    return this.populationService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('population.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.populationService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('population.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.populationService.remove(user, id, req.ip);
  }
}
