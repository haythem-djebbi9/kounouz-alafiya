import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BatchStatus, QrCodeStatus, Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { PortalDashboardService } from './portal-dashboard.service.js';
import { PortalRequestsService } from './portal-requests.service.js';
import { PortalSamplesService } from './portal-samples.service.js';
import { PortalLaboratoryService } from './portal-laboratory.service.js';
import { PortalDecisionsService } from './portal-decisions.service.js';
import { ReferenceHoneysService } from './reference-honeys.service.js';
import { SampleEventsService } from './sample-events.service.js';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto.js';
import { ReviewActionDto } from './dto/review-action.dto.js';
import { ListSamplesQueryDto } from './dto/list-samples-query.dto.js';
import { RegisterSampleDto } from './dto/register-sample.dto.js';
import { FlagSampleIssueDto } from './dto/flag-sample-issue.dto.js';
import { RegisterReferenceSampleDto, UpdateReferenceSampleStatusDto } from './dto/reference-sample.dto.js';
import { OpenAnalysisDto } from './dto/open-analysis.dto.js';
import { SaveAnalysisResultsDto } from './dto/save-analysis-results.dto.js';
import { DecisionDto } from './dto/decision.dto.js';
import { CreateReferenceHoneyDto } from './dto/create-reference-honey.dto.js';
import { UpdateReferenceHoneyDto } from './dto/update-reference-honey.dto.js';
import { ListReferenceHoneysQueryDto } from './dto/list-reference-honeys-query.dto.js';
import { PortalBatchesService } from './portal-batches.service.js';
import { PortalPackagingService } from './portal-packaging.service.js';
import { PortalProductsService } from './portal-products.service.js';
import { PortalQrService } from './portal-qr.service.js';
import { CreateVerifiedBatchDto } from './dto/create-verified-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { ListBatchesQueryDto } from './dto/list-batches-query.dto.js';
import { SavePackagingDto } from './dto/save-packaging.dto.js';
import { SavePackagingUnitDto } from './dto/save-packaging-unit.dto.js';
import { CreateBatchProductDto } from './dto/create-batch-product.dto.js';
import { UpdateBatchProductDto } from './dto/update-batch-product.dto.js';
import { ProductVariantInputDto, UpdateProductVariantDto } from '../products/dto/product-variant.dto.js';
import { GenerateQrCodesDto } from './dto/generate-qr-codes.dto.js';
import { ListQrCodesQueryDto } from './dto/list-qr-codes-query.dto.js';
import { SensitiveAction } from '../common/admin-override.js';

const ANALYSIS_FILES_DIR = join(process.cwd(), 'uploads', 'analyses');
const REFERENCE_DIR = join(process.cwd(), 'uploads', 'reference-honeys');
const PRODUCT_DOCS_DIR = join(process.cwd(), 'uploads', 'product-documents');
const PRODUCT_IMAGES_DIR = join(process.cwd(), 'uploads', 'products');
const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

for (const dir of [ANALYSIS_FILES_DIR, REFERENCE_DIR, PRODUCT_DOCS_DIR, PRODUCT_IMAGES_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function fileInterceptor(destination: string, allowedMimeTypes: string[], label: string) {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination,
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new BadRequestException(`Formats acceptés : ${label}.`), false);
        return;
      }
      cb(null, true);
    },
  });
}

/**
 * Portail interne de l'équipe de vérification Kounouz.
 *
 * Tout est réservé à ADMIN / VERIFICATION_TEAM : ni le producteur ni l'agent
 * terrain n'accèdent à ces routes (cahier des charges §20). Le producteur suit
 * son dossier via ses propres endpoints, en lecture seule.
 */
@ApiBearerAuth()
@ApiTags('verification-portal')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('verification-portal')
export class VerificationPortalController {
  constructor(
    private readonly dashboard: PortalDashboardService,
    private readonly requests: PortalRequestsService,
    private readonly samples: PortalSamplesService,
    private readonly laboratory: PortalLaboratoryService,
    private readonly decisions: PortalDecisionsService,
    private readonly referenceHoneys: ReferenceHoneysService,
    private readonly events: SampleEventsService,
    private readonly batches: PortalBatchesService,
    private readonly packaging: PortalPackagingService,
    private readonly products: PortalProductsService,
    private readonly qr: PortalQrService,
  ) {}

  // --- Centre de vérification -------------------------------------------

  @Get('dashboard')
  @ApiOperation({ summary: 'Indicateurs, tendance, répartitions et dossiers récents.' })
  overview(@Query('months', new ParseIntPipe({ optional: true })) months?: number) {
    return this.dashboard.overview(months && months > 0 && months <= 24 ? months : 6);
  }

  // --- Revue des demandes -------------------------------------------------

  @Get('requests')
  listRequests(@Query() query: ListRequestsQueryDto) {
    return this.requests.list(query);
  }

  @Get('requests/:id')
  findRequest(@Param('id') id: string) {
    return this.requests.findOne(id);
  }

  @Get('requests/:id/history')
  requestHistory(@Param('id') id: string) {
    return this.requests.history(id);
  }

  @Post('requests/:id/review')
  @ApiOperation({ summary: 'Prendre en charge, accepter, refuser ou demander un complément.' })
  review(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: ReviewActionDto) {
    return this.requests.review(id, user.sub, dto);
  }

  @Patch('requests/:id/assignee')
  assignRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('assigneeId') assigneeId: string | null,
  ) {
    return this.requests.assign(id, user.sub, assigneeId ?? null);
  }

  @Patch('requests/:id/notes')
  updateRequestNotes(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('internalNotes') notes: string,
  ) {
    return this.requests.updateInternalNotes(id, user.sub, notes ?? '');
  }

  @Post('requests/:id/comments')
  addRequestComment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('body') body: string,
  ) {
    if (!body?.trim()) {
      throw new BadRequestException('Le commentaire est vide.');
    }
    return this.requests.addComment(id, user.sub, body.trim());
  }

  @Delete('comments/:commentId')
  deleteRequestComment(@Param('commentId') commentId: string, @CurrentUser() user: JwtPayload) {
    return this.requests.deleteComment(commentId, user.sub);
  }

  // --- Gestion des échantillons -------------------------------------------

  @Get('samples')
  listSamples(@Query() query: ListSamplesQueryDto) {
    return this.samples.list(query);
  }

  @Get('samples/:id')
  findSample(@Param('id') id: string) {
    return this.samples.findOne(id);
  }

  @Get('samples/:id/custody')
  @ApiOperation({ summary: 'Chaîne de possession complète de l’échantillon.' })
  sampleCustody(@Param('id') id: string) {
    return this.events.timeline(id);
  }

  @Post('samples')
  registerSample(@CurrentUser() user: JwtPayload, @Body() dto: RegisterSampleDto) {
    return this.samples.register(user.sub, dto);
  }

  @Post('samples/:id/receive')
  receiveSample(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('note') note?: string,
  ) {
    return this.samples.markReceived(id, user.sub, note);
  }

  @Post('samples/:id/seal')
  @ApiOperation({ summary: 'Apposer le scellé Kounouz (apport producteur, sans agent terrain).' })
  sealSample(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.samples.applySeal(id, user.sub);
  }

  @Post('samples/:id/reference-sample')
  registerReferenceSample(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterReferenceSampleDto,
  ) {
    return this.samples.registerReferenceSample(id, user.sub, dto);
  }

  @Patch('samples/:id/reference-sample/status')
  updateReferenceSampleStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateReferenceSampleStatusDto,
  ) {
    return this.samples.updateReferenceSampleStatus(id, user.sub, dto);
  }

  @Post('samples/:id/move-to-laboratory')
  moveSampleToLaboratory(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('note') note?: string,
  ) {
    return this.samples.moveToLaboratory(id, user.sub, note);
  }

  @Post('samples/:id/issue')
  flagSampleIssue(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FlagSampleIssueDto,
  ) {
    return this.samples.flagIssue(id, user.sub, dto);
  }

  // --- Laboratoire ---------------------------------------------------------

  @Get('laboratory/parameters')
  @ApiOperation({ summary: 'Référentiel des paramètres et de leurs plages de référence.' })
  labParameters() {
    return this.laboratory.parameters();
  }

  @Get('laboratory/queue')
  labQueue() {
    return this.laboratory.queue();
  }

  @Get('laboratory/by-sample/:sampleId')
  labBySample(@Param('sampleId') sampleId: string) {
    return this.laboratory.findBySample(sampleId);
  }

  @Get('laboratory/analyses/:id')
  findAnalysis(@Param('id') id: string) {
    return this.laboratory.findAnalysis(id);
  }

  @Post('laboratory/analyses')
  openAnalysis(@CurrentUser() user: JwtPayload, @Body() dto: OpenAnalysisDto) {
    return this.laboratory.openAnalysis(user.sub, dto);
  }

  @Patch('laboratory/analyses/:id/results')
  saveAnalysisResults(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveAnalysisResultsDto,
  ) {
    return this.laboratory.saveResults(id, user.sub, dto);
  }

  @Post('laboratory/analyses/:id/complete')
  completeAnalysis(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.laboratory.markCompleted(id, user.sub);
  }

  @Post('laboratory/analyses/:id/files')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(fileInterceptor(ANALYSIS_FILES_DIR, DOCUMENT_MIME_TYPES, 'PDF, JPEG, PNG, WebP'))
  uploadAnalysisFile(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return this.laboratory.addFile(id, user.sub, file);
  }

  @Get('laboratory/files/:fileId/download')
  downloadAnalysisFile(@Param('fileId') fileId: string, @CurrentUser() user: JwtPayload) {
    return this.laboratory.fileDownload(fileId, user.sub);
  }

  @Delete('laboratory/files/:fileId')
  deleteAnalysisFile(@Param('fileId') fileId: string, @CurrentUser() user: JwtPayload) {
    return this.laboratory.deleteFile(fileId, user.sub);
  }

  // --- Décision de vérification -------------------------------------------

  @Get('decisions/queue')
  decisionQueue() {
    return this.decisions.queue();
  }

  @Get('decisions/:id')
  findDecision(@Param('id') id: string) {
    return this.decisions.findOne(id);
  }

  @Post('decisions/open/:analysisId')
  openDecision(@Param('analysisId') analysisId: string, @CurrentUser() user: JwtPayload) {
    return this.decisions.openForAnalysis(analysisId, user.sub);
  }

  @Patch('decisions/:id/draft')
  saveDecisionDraft(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DecisionDto,
  ) {
    return this.decisions.saveDraft(id, user.sub, dto);
  }

  @Post('decisions/:id/confirm')
  confirmDecision(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: DecisionDto) {
    return this.decisions.confirm(id, user.sub, dto);
  }

  // --- Bibliothèque d'étalons ---------------------------------------------

  @Get('reference-honeys')
  listReferenceHoneys(@Query() query: ListReferenceHoneysQueryDto) {
    return this.referenceHoneys.list(query);
  }

  @Get('reference-honeys/:id')
  findReferenceHoney(@Param('id') id: string) {
    return this.referenceHoneys.findOne(id);
  }

  @Post('reference-honeys')
  createReferenceHoney(@CurrentUser() user: JwtPayload, @Body() dto: CreateReferenceHoneyDto) {
    return this.referenceHoneys.create(user.sub, dto);
  }

  @Patch('reference-honeys/:id')
  updateReferenceHoney(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateReferenceHoneyDto,
  ) {
    return this.referenceHoneys.update(id, user.sub, dto);
  }

  @Post('reference-honeys/:id/activate')
  activateReferenceHoney(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.referenceHoneys.setActive(id, user.sub, true);
  }

  @Post('reference-honeys/:id/deactivate')
  deactivateReferenceHoney(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.referenceHoneys.setActive(id, user.sub, false);
  }

  // --- Lots vérifiés (B01 / B04) ------------------------------------------

  @Get('batches')
  listBatches(@Query() query: ListBatchesQueryDto) {
    return this.batches.list(query);
  }

  @Get('batches/eligible-verifications')
  @ApiOperation({ summary: "Vérifications approuvées sans lot commercial." })
  eligibleVerifications() {
    return this.batches.eligibleVerifications();
  }

  @Get('batches/:id')
  findBatch(@Param('id') id: string) {
    return this.batches.findOne(id);
  }

  @Get('batches/:id/timeline')
  batchTimeline(@Param('id') id: string) {
    return this.batches.timeline(id);
  }

  @Post('batches')
  createBatch(@CurrentUser() user: JwtPayload, @Body() dto: CreateVerifiedBatchDto) {
    return this.batches.create(user.sub, dto);
  }

  @Patch('batches/:id')
  updateBatch(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateBatchDto) {
    return this.batches.update(id, user.sub, dto);
  }

  @Post('batches/:id/advance')
  @ApiOperation({ summary: "Faire avancer le lot d'une étape de son cycle de vie." })
  advanceBatch(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('status') status: BatchStatus,
  ) {
    return this.batches.advance(id, user.sub, status);
  }

  @Post('batches/:id/hold')
  @ApiOperation({ summary: 'Suspendre ou rappeler un lot (motif obligatoire).' })
  holdBatch(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('status') status: BatchStatus,
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('Un motif est obligatoire pour retirer un lot du marché.');
    }
    return this.batches.hold(id, user.sub, status, reason.trim());
  }

  @Post('batches/:id/release')
  releaseBatch(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.batches.release(id, user.sub);
  }

  // --- Emballage (B02) -----------------------------------------------------

  @Get('packaging/queue')
  packagingQueue() {
    return this.packaging.queue();
  }

  @Get('packaging/by-batch/:batchId')
  packagingByBatch(@Param('batchId') batchId: string) {
    return this.packaging.findByBatch(batchId);
  }

  @Put('packaging/by-batch/:batchId')
  @ApiOperation({ summary: "Créer ou mettre à jour le dossier d'emballage d'un lot." })
  savePackaging(
    @Param('batchId') batchId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SavePackagingDto,
  ) {
    return this.packaging.save(batchId, user.sub, dto);
  }

  @Post('packaging/by-batch/:batchId/units')
  addPackagingUnit(
    @Param('batchId') batchId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SavePackagingUnitDto,
  ) {
    return this.packaging.addUnit(batchId, user.sub, dto);
  }

  @Patch('packaging/units/:unitId')
  updatePackagingUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SavePackagingUnitDto,
  ) {
    return this.packaging.updateUnit(unitId, user.sub, dto);
  }

  @Delete('packaging/units/:unitId')
  deletePackagingUnit(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.packaging.deleteUnit(unitId, user.sub);
  }

  @Post('packaging/by-batch/:batchId/complete')
  completePackaging(@Param('batchId') batchId: string, @CurrentUser() user: JwtPayload) {
    return this.packaging.complete(batchId, user.sub);
  }

  // --- Produits (B03) -------------------------------------------------------

  @Get('products/queue')
  productQueue() {
    return this.products.queue();
  }

  @Get('products/by-batch/:batchId')
  productsByBatch(@Param('batchId') batchId: string) {
    return this.products.findByBatch(batchId);
  }

  @Get('products/:id')
  findProduct(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: JwtPayload, @Body() dto: CreateBatchProductDto) {
    return this.products.create(user.sub, dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBatchProductDto,
  ) {
    return this.products.update(id, user.sub, dto);
  }

  @Post('products/:id/variants')
  addProductVariant(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProductVariantInputDto,
  ) {
    return this.products.addVariant(id, user.sub, dto);
  }

  @Patch('products/variants/:variantId')
  updateProductVariant(
    @Param('variantId') variantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.products.updateVariant(variantId, user.sub, dto);
  }

  @Post('products/:id/activate')
  @ApiOperation({ summary: 'Mise en marché : publication au catalogue.' })
  activateProduct(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.products.activate(id, user.sub);
  }

  @Post('products/:id/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(fileInterceptor(PRODUCT_DOCS_DIR, DOCUMENT_MIME_TYPES, 'PDF, JPEG, PNG, WebP'))
  uploadProductDocument(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return this.products.addDocument(id, user.sub, type ?? 'OTHER', file);
  }

  @Get('products/documents/:documentId/download')
  downloadProductDocument(@Param('documentId') documentId: string, @CurrentUser() user: JwtPayload) {
    return this.products.documentDownload(documentId, user.sub);
  }

  @Delete('products/documents/:documentId')
  deleteProductDocument(@Param('documentId') documentId: string, @CurrentUser() user: JwtPayload) {
    return this.products.deleteDocument(documentId, user.sub);
  }

  @Post('products/image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(fileInterceptor(PRODUCT_IMAGES_DIR, IMAGE_MIME_TYPES, 'JPEG, PNG, WebP'))
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return { url: `/uploads/products/${file.filename}` };
  }

  // --- QR codes (Q01 / Q02) --------------------------------------------------

  @Get('qr/queue')
  qrQueue() {
    return this.qr.generationQueue();
  }

  @Get('qr/codes')
  listQrCodes(@Query() query: ListQrCodesQueryDto) {
    return this.qr.list(query);
  }

  @Get('qr/codes/:qrId')
  findQrCode(@Param('qrId') qrId: string) {
    return this.qr.findOne(qrId);
  }

  @Get('qr/codes/:qrId/scans')
  qrScans(@Param('qrId') qrId: string) {
    return this.qr.scans(qrId);
  }

  @Get('qr/codes/:qrId/image')
  @Header('Content-Type', 'image/png')
  async qrImage(@Param('qrId') qrId: string, @Res({ passthrough: true }) res: Response) {
    res.send(await this.qr.image(qrId));
  }

  @Post('qr/generate')
  @ApiOperation({ summary: "Tirer une série de QR uniques pour un produit." })
  generateQrCodes(@CurrentUser() user: JwtPayload, @Body() dto: GenerateQrCodesDto) {
    return this.qr.generate(user.sub, dto);
  }

  @Get('qr/generations/by-batch/:batchId')
  qrGenerations(@Param('batchId') batchId: string) {
    return this.qr.generationsForBatch(batchId);
  }

  @Get('qr/generations/:id')
  findQrGeneration(@Param('id') id: string) {
    return this.qr.findGeneration(id);
  }

  @Get('qr/generations/:id/export')
  @ApiOperation({ summary: "Export CSV (numéro de série + URL) pour l'imprimeur d'étiquettes." })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportQrGeneration(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const csv = await this.qr.exportGeneration(id);
    res.setHeader('Content-Disposition', `attachment; filename="qr-${id}.csv"`);
    res.send(csv);
  }

  @Post('qr/codes/:qrId/deactivate')
  deactivateQrCode(@Param('qrId') qrId: string, @CurrentUser() user: JwtPayload) {
    return this.qr.setStatus(qrId, user.sub, QrCodeStatus.DEACTIVATED);
  }

  @Post('qr/codes/:qrId/activate')
  activateQrCode(@Param('qrId') qrId: string, @CurrentUser() user: JwtPayload) {
    return this.qr.setStatus(qrId, user.sub, QrCodeStatus.ACTIVE);
  }

  @Post('qr/codes/bulk-deactivate')
  bulkDeactivateQrCodes(@CurrentUser() user: JwtPayload, @Body('qrIds') qrIds: string[]) {
    if (!Array.isArray(qrIds) || qrIds.length === 0) {
      throw new BadRequestException('Aucun code sélectionné.');
    }
    return this.qr.deactivateMany(qrIds, user.sub);
  }

  @Post('reference-honeys/photo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(fileInterceptor(REFERENCE_DIR, IMAGE_MIME_TYPES, 'JPEG, PNG, WebP'))
  uploadReferencePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    return { url: `/uploads/reference-honeys/${file.filename}` };
  }
}
