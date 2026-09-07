import { Module } from '@nestjs/common';
import { AdminCategoriesController, AdminLocalAreasController, AdminServicesController } from './taxonomy-admin.controller.js';
import { TaxonomyPublicController } from './taxonomy-public.controller.js';
import { TaxonomyService } from './taxonomy.service.js';

@Module({
  controllers: [TaxonomyPublicController, AdminCategoriesController, AdminServicesController, AdminLocalAreasController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
