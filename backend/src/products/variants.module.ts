import { Global, Module } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service.js';

// Global : le portail vérificateur, la console admin, le catalogue public et
// les commandes partagent la même gestion des SKU.
@Global()
@Module({
  providers: [ProductVariantsService],
  exports: [ProductVariantsService],
})
export class VariantsModule {}
