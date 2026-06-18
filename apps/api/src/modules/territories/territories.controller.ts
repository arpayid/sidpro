import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TerritoriesService } from './territories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('hamlets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HamletsController {
  constructor(private territoriesService: TerritoriesService) {}

  @Get()
  @RequirePermissions('population.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.territoriesService.findAllHamlets(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
  }

  @Post()
  @RequirePermissions('population.update')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; code: string },
    @Req() req: Request,
  ) {
    return this.territoriesService.createHamlet(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('population.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string },
    @Req() req: Request,
  ) {
    return this.territoriesService.updateHamlet(user, id, body, req.ip);
  }

  @Get(':hamletId/neighborhood-units')
  @RequirePermissions('population.read')
  findNeighborhoodUnits(
    @CurrentUser() user: JwtPayload,
    @Param('hamletId') hamletId: string,
  ) {
    return this.territoriesService.findNeighborhoodUnitsByHamlet(user, hamletId);
  }
}

@Controller('neighborhood-units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NeighborhoodUnitsController {
  constructor(private territoriesService: TerritoriesService) {}

  @Post()
  @RequirePermissions('population.update')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { hamletId: string; rt: string; rw: string },
    @Req() req: Request,
  ) {
    return this.territoriesService.createNeighborhoodUnit(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('population.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { rt?: string; rw?: string },
    @Req() req: Request,
  ) {
    return this.territoriesService.updateNeighborhoodUnit(user, id, body, req.ip);
  }
}
