
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionCategory = 
  | 'PRODUCTION' 
  | 'STORE' 
  | 'SUPPLIES' 
  | 'RENT' 
  | 'SALARY' 
  | 'MARKETING' 
  | 'TAX'
  | 'OFFICE'   
  | 'OTHER';

export interface MarketplaceBannerConfig {
  id: string;
  imageUrl: string;
  text?: string;
  button?: {
    show: boolean;
    text: string;
    link: string;
    color: string;
    size: 'sm' | 'md' | 'lg';
  };
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  subcategories?: MarketplaceCategory[];
}

export interface GlobalWhatsAppTemplate {
  id: string;
  action: string;
  name: string;
  body: string;
  active: boolean;
  metaTemplateName?: string;
}

export interface GlobalSettings {
  platformCommission: number;
  whatsappModulePrice?: number;
  marketplaceBanners?: MarketplaceBannerConfig[];
  officialStoresIds?: string[];
  marketplaceCategories?: MarketplaceCategory[];
  geminiApiKey?: string;
  ycloudApiKey?: string;
  ycloudPhoneNumber?: string;
  globalWhatsappTemplates?: GlobalWhatsAppTemplate[];
  updatedAt: Date;
  updatedBy: string;
}

export interface StoreLayoutBlock {
  id: string;
  type: 'BANNER' | 'CAROUSEL' | 'GRID' | 'RELATED' | 'LIST';
  title: string;
  productIds?: string[];
  categoryId?: string;
}

export interface BannerConfig {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonSize?: 'small' | 'medium' | 'large';
  buttonBorderRadius?: string;
}

export interface StoreSettings {
  banners?: BannerConfig[];
  profilePhotoUrl?: string;
  layoutType?: 'CARDS' | 'LIST';
  portfolio?: {
    id: string;
    title: string;
    imageUrl: string;
    description?: string;
  }[];
  menuOptions?: string[];
  catchphrase?: string;
  theme?: 'shopee' | 'light' | 'dark' | 'amber' | 'indigo' | 'emerald' | 'orange';
  layoutBlocks?: StoreLayoutBlock[];
}

export interface Organization {
  whatsapp?: string;
  id: string;
  name: string;
  logoUrl?: string; 
  planId: string;
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'PENDING' | 'FREE' | 'TEST';
  trialEndsAt?: Date;
  createdAt: Date;
  orgType?: 'LAB' | 'CLINIC' | 'LAB_OUTSOURCED' | 'SUPPLIER';
  cpfCnpj?: string;
  asaasApiKey?: string;
  frenetToken?: string;
  ratingAverage?: number;
  ratingCount?: number;
  storeSettings?: StoreSettings;
  storeSlug?: string;
  storeVisibility?: 'PUBLIC' | 'PRIVATE';
  financialSettings?: {
    pixKey?: string;
    bankInfo?: string;
    instructions?: string;
    paymentLink?: string;
    asaasWalletId?: string;
    asaasWalletStatus?: string;
    asaasAccountNumber?: string;
    customSplitPercent?: number;
    businessData?: any;
    balance?: number;
    pendingBalance?: number;
    techResponsibleName?: string;
    techResponsibleCpf?: string;
  };
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  country?: string;
  phone?: string;
  email?: string;
  croUf?: string;
  croNumero?: string;
  croCategoria?: string;
  croValid?: boolean;
  isApproved?: boolean;
  revealJobStatusToDentist?: boolean;
  targetAudience?: 'CLINIC' | 'LAB' | 'SUPPLIER';
  hasWhatsappModule?: boolean;
  ycloudPhoneNumber?: string;
  ycloudApiKey?: string;
  whatsappTemplates?: {
    id: string;
    name: string;
    body: string;
    type: 'CLINIC_APPOINTMENT' | 'CLINIC_APPOINTMENT_CONFIRMED' | 'CLINIC_APPOINTMENT_CANCELED' | 'LAB_DISPATCH' | 'LAB_DELIVERED' | 'SUPPLIER_UPDATE' | 'CUSTOM';
    active: boolean;
  }[];
  receiptSettings?: {
    referentePresets?: string[];
    mensagemPresets?: string[];
  };
}

export interface ClinicRoom {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ClinicDentist {
  id: string;
  name: string;
  cro: string;
  specialty: string;
  color: string; 
  active: boolean;
}

export interface DeliveryRoute {
  id: string;
  organizationId: string;
  date: Date;
  shift: 'MORNING' | 'AFTERNOON';
  driverName: string;
  status: 'OPEN' | 'IN_TRANSIT' | 'COMPLETED';
  createdAt: Date;
}

export interface RouteItem {
  id: string;
  routeId: string;
  jobId?: string;
  dentistId: string;
  dentistName: string;
  clinicName?: string;
  patientName?: string;
  address: string;
  type: 'DELIVERY' | 'PICKUP';
  order: number;
}

export interface Courier {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  vehicle?: string;
  active: boolean;
  createdAt: Date;
}

export interface Expense {
  id: string;
  organizationId: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  date: Date;
  status: 'PENDING' | 'PAID';
  attachmentUrl?: string;
  createdAt: Date;
}

export interface BillingBatch {
  id: string;
  organizationId: string;
  dentistId: string;
  dentistName: string;
  jobIds: string[];
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  invoiceUrl?: string; 
  boletoUrl?: string;
  nfeUrl?: string;     
  nfeNumber?: string;
  createdAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT',
  SUPER_ADMIN = 'SUPER_ADMIN',
  HELPDESK = 'HELPDESK'
}

export type PermissionKey = 
  | 'jobs:view' | 'jobs:create' | 'jobs:edit' | 'jobs:delete'
  | 'finance:view' | 'finance:create' | 'finance:edit' | 'finance:delete'
  | 'catalog:view' | 'catalog:create' | 'catalog:edit' | 'catalog:delete' | 'catalog:prices_view'
  | 'clients:view' | 'clients:create' | 'clients:edit' | 'clients:delete' | 'clients:block_manage' | 'clients:statement_view'
  | 'sectors:view' | 'sectors:create' | 'sectors:edit' | 'sectors:delete'
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete'
  | 'commissions:view' | 'commissions:create' | 'commissions:edit' | 'commissions:delete'
  | 'receipts:view' | 'receipts:create' | 'receipts:edit' | 'receipts:delete'
  | 'logistics:view' | 'logistics:create' | 'logistics:edit' | 'logistics:delete'
  | 'boxes:view' | 'boxes:create' | 'boxes:edit' | 'boxes:delete'
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:delete'
  | 'vip:view'
  | 'calendar:view'
  | 'store_suppliers:view';

export type InventoryItemType = 'MATERIAL' | 'MACHINERY' | 'SUPPLY' | 'IMPLANT' | 'OTHER';

export interface InventoryCategory {
  id: string;
  name: string;
  type: InventoryItemType;
  organizationId: string;
  imageUrl?: string;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: InventoryItemType;
  categoryId?: string;
  costPrice: number;
  sellPrice: number;
  isPromotion?: boolean;
  promotionalPrice?: number;
  organizationId: string;
}

export interface InventoryItem {
  id: string;
  categoryId?: string;
  marketplaceCategoryIds?: string[]; // Path of category ids from root to leaf
  name: string;
  code?: string;
  description?: string;
  type: InventoryItemType;
  currentStock: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  isPromotion?: boolean;
  promotionalPrice?: number;
  dentistOwnerId?: string | null;
  organizationId: string;
  isVisibleInStore?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  variations?: Array<{ id: string; name: string; priceModifier: number; imageUrl?: string; currentStock?: number }>;
  variationGroups?: VariationGroup[];
  isCombo?: boolean;
  comboItems?: Array<{ productId: string; name: string; quantity: number }>;
  targetAudience?: 'DENTIST' | 'LAB' | 'BOTH';
}

export interface JobProduct {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  basePriceBeforeDiscount?: number;
  appliedDiscount?: number;
  dentistOwnerId?: string | null;
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  SECTOR_TRANSITION = 'SECTOR_TRANSITION'
}

export enum UrgencyLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VIP = 'VIP'
}

export type JobNature = 'NORMAL' | 'REPETITION' | 'ADJUSTMENT';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface BoxColor {
  id: string;
  name: string;
  hex: string;
}

export interface JobItem {
  id: string;
  jobTypeId: string;
  name: string;
  quantity: number;
  price: number;
  basePriceBeforeDiscount?: number;
  appliedDiscount?: number;
  appliedPriceTable?: string;
  nature: JobNature;
  selectedVariationIds: string[];
  variationValues?: Record<string, string>;
  commissionDisabled?: boolean;
  sectorQuantities?: Record<string, number>;
  sectorCommissionDisabled?: Record<string, boolean>;
  selectedTeeth?: string[];
  color?: string;
}

export interface JobHistory {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  sector?: string;
}

export interface LabRating {
  id: string;
  labId: string;
  dentistId: string;
  dentistName: string;
  jobId: string;
  score: number; 
  comment?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text?: string;
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt?: Date;
  deleted?: boolean;
}

export interface CaseApprovalReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: Date;
}

export interface CaseApprovalFile {
  name: string;
  url: string;
  type: string; // 'photo' | 'video' | 'html' | 'stl' | 'other'
}

export interface CaseApprovalItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  files: CaseApprovalFile[];
  createdAt: Date;
  replies?: CaseApprovalReply[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  statusFeedback?: string;
  resolvedAt?: Date;
}

export interface JobItemExecution {
  itemId: string;
  jobTypeId: string;
  jobTypeName: string;
  sector: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface SectorMovement {
  id: string;
  sector: string;
  entryTime: Date;
  entryUserId: string;
  entryUserName: string;
  exitTime?: Date;
  exitUserId?: string;
  exitUserName?: string;
}

export interface Job {
  id: string;
  organizationId: string;
  osNumber?: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  status: JobStatus;
  urgency: UrgencyLevel;
  items: JobItem[];
  products?: JobProduct[];
  history: JobHistory[];
  sectorMovements?: SectorMovement[];
  itemExecutions?: JobItemExecution[];
  createdAt: Date;
  dueDate: Date;
  dueTime?: string;
  boxNumber?: string;
  boxColor?: BoxColor;
  currentSector?: string;
  sectorEntryTime?: Date;
  totalValue: number;
  notes?: string;
  isComboPurchase?: boolean;
  vouchersUsed?: string[];
  managerNotes?: string;
  attachments?: Attachment[];
  rejectionReason?: string;
  paymentStatus?: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'VOUCHER';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'CASH' | 'TRANSFER';
  pixQrCode?: string;
  pixCopyPaste?: string;
  asaasPaymentId?: string;
  batchId?: string;
  ratingId?: string; 
  routeId?: string;
  chatEnabled?: boolean;
  approvalEnabled?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  origin?: 'MANUAL' | 'ONLINE_ORDER' | 'ONLINE_REQUISITION' | 'OUTSOURCING';
  dentistUserId?: string;
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface Sector {
  id: string;
  name: string;
}

export interface VariationOption {
  id: string;
  name: string;
  priceModifier: number;
  disablesOptions?: string[];
  isDiscountExempt?: boolean; 
  imageUrl?: string;
}

export interface VariationGroup {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE' | 'TEXT';
  options: VariationOption[];
}

export interface JobType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  baseCommission?: number;
  variationGroups: VariationGroup[];
  isVisibleInStore?: boolean;
  isVisibleInOutsourcing?: boolean;
  isVisibleInternally?: boolean;
  imageUrl?: string;
  allowedSectors?: string[];
  isPromotion?: boolean;
  promotionQuantity?: number;
  promotionCallText?: string;
  originalJobTypeId?: string;
  isVoucherCombo?: boolean;
  applyToAllVariations?: boolean;
  promoVariationOptionId?: string;
  promoVariationOptionIds?: string[];
  promoVariationOptionName?: string;
  promoVariationGroupName?: string;
}

export interface ClinicService {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes: number;
  active: boolean;
}

export interface UserCommissionSetting {
  jobTypeId: string;
  value?: number;
  type: 'FIXED' | 'PERCENTAGE';
  variationSettings?: Record<string, { value: number; type: 'FIXED' | 'PERCENTAGE' }>;
}

export interface PriceTable {
  id: string;
  organizationId: string;
  name: string;
  isDefault?: boolean;
  prices: {
    [jobTypeId: string]: {
      basePrice: number;
      variations: {
        [optionId: string]: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  whatsapp?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  cpfCnpj?: string;
  organizationId?: string;
  sector?: string;
  permissions?: PermissionKey[]; 
  createdAt?: any;
  termsAcceptedAt?: Date | string;
  clinicName?: string;
  clientType?: 'PESSOA_FISICA' | 'CLINICA' | 'LABORATORIO';
  commissionSettings?: UserCommissionSetting[];
  globalDiscountPercent?: number; 
  priceTableId?: string;
  isCustomPricing?: boolean;
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number;
    fixedPrice?: number;
    variations?: { [optionId: string]: number };
  }[];
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  country?: string;
  fcmTokens?: string[];
  deliveryViaPost?: boolean;
  billingLimit?: number;
  isBlocked?: boolean;
  blockReason?: 'DEBT' | 'FINANCIAL_APPROVAL';
  temporaryUnblockUntil?: Date;
  croUf?: string;
  croNumero?: string;
  croCategoria?: string;
  croValid?: boolean;
  isApproved?: boolean;
  manualDentistId?: string;
}

export interface CartItem {
  cartItemId: string;
  jobType: JobType;
  quantity: number;
  unitPrice: number;
  finalPrice: number;
  selectedVariationIds: string[];
  variationValues?: Record<string, string>;
  selectedTeeth?: string[];
}

export interface JobAlert {
  id: string;
  organizationId: string;
  jobId: string;
  osNumber: string;
  message: string;
  targetSector?: string;
  targetUserId?: string;
  scheduledFor: Date;
  createdBy: string;
  createdAt: Date;
  readBy: string[];
  repeatInterval?: number;
  repeatCount?: number;
  repeatedCount?: number;
}

export interface ClinicPatient {
  id: string;
  organizationId: string;
  dentistId: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  planName?: string;
  clinicalAlerts?: string[];
  createdAt: Date;
}

export interface OnlineRequisitionItem {
  id: string;
  serviceId: string;
  serviceName: string;
  selectedVariationIds?: string[];
  quantity?: number;
  selectedTeeth?: string[];
}

export interface OnlineRequisition {
  id: string;
  dentistId: string;
  dentistName: string;
  dentistClinicName?: string;
  dentistManualId?: string;
  labId: string;
  labName?: string;
  patientName: string;
  serviceId: string; // Keep for backward compatibility
  serviceName: string; // Keep for backward compatibility
  notes?: string;
  attachments?: Attachment[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  acceptedAsJobId?: string;
  rejectionReason?: string;
  selectedVariationIds?: string[]; // Keep for backward compatibility
  quantity?: number; // Keep for backward compatibility
  selectedTeeth?: string[]; // Keep for backward compatibility
  items?: OnlineRequisitionItem[]; // Support for multiple items
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

// NOVO: Prontuário do Paciente
export interface PatientHistoryRecord {
  id: string;
  patientId: string;
  type: 'PROCEDURE' | 'SCAN' | 'XRAY' | 'EVOLUTION' | 'NOTE' | 'PROSTHESIS';
  description: string;
  date: Date;
  attachments?: Attachment[];
  professionalId?: string;
  professionalName?: string;
  createdAt: Date;
  labName?: string;
  labId?: string;
  specs?: string;
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export interface Appointment {
  id: string;
  organizationId: string;
  dentistId: string; 
  patientId: string;
  patientName: string;
  date: Date;
  durationMinutes: number;
  procedure: string;
  selectedTeeth?: string[];
  status: AppointmentStatus;
  notes?: string;
  roomId?: string; 
  clinicDentistId?: string; 
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  whatsappModulePrice?: number;
  isPublic: boolean;
  active: boolean;
  targetAudience?: 'LAB' | 'CLINIC' | 'LAB_OUTSOURCED' | 'SUPPLIER';
  trialDays?: number;
  features: {
    maxUsers: number;
    maxStorageGB: number;
    maxDentists: number;
    maxJobsPerMonth: number;
    hasStoreModule: boolean;
    hasClinicModule: boolean;
    splitPercent?: number;
    isLabFreeStoreOnly?: boolean;
  };
}

export interface OrganizationConnection {
  id: string;
  organizationId: string;
  organizationName: string;
  status: 'ACTIVE' | 'PENDING';
  createdAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'TRIAL_EXT' | 'FREE_FOREVER';
  discountValue: number;
  validUntil?: Date;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  applicablePlans?: string[];
}

export interface LabCoupon {
  id: string;
  organizationId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validUntil?: string;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export interface CommissionRecord {
  id: string;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  amount: number;
  status: CommissionStatus;
  createdAt: Date;
  sector: string;
  paidAt?: Date;
}

export interface PaymentRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  paymentDate?: Date;
  dueDate: Date;
  paymentMethod?: string;
  createdAt: Date;
}

export interface DentistPayment {
  id: string;
  organizationId: string;
  dentistId: string;
  dentistName: string;
  amount: number;
  interest?: number; // Juros
  fees?: number;     // Taxas
  discount?: number; // Desconto no ato do pagamento
  paymentMethod: 'PIX' | 'BOLETO' | 'CARD' | 'CASH' | 'TRANSFER' | 'DISCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';
  paymentDate: Date;
  cardMachineId?: string;
  bankAccountId?: string;
  type: 'PAYMENT' | 'DISCOUNT';
  notes?: string;
  batchId?: string;
  createdAt: Date;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface CardMachine {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface BankAccount {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface ManualDentist {
  id: string;
  organizationId: string;
  name: string;
  userId?: string;
  clinicName?: string;
  clientType?: 'PESSOA_FISICA' | 'CLINICA' | 'LABORATORIO';
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  cro?: string;
  birthDate?: string;
  approvalDate?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: Date;
  globalDiscountPercent?: number; 
  priceTableId?: string;
  isCustomPricing?: boolean;
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number;
    fixedPrice?: number;
    variations?: { [optionId: string]: number };
  }[];
  deliveryViaPost?: boolean;
  billingLimit?: number;
  isBlocked?: boolean;
  blockReason?: 'DEBT' | 'FINANCIAL_APPROVAL';
  temporaryUnblockUntil?: Date;
}

export interface Receipt {
  id: string;
  organizationId: string;
  dtEmissao: Date;
  numero: string;
  clienteId: string;
  clienteName: string;
  cpfCnpj: string;
  emitidoComo: 'PF' | 'PJ';
  titularRecibo: string;
  empresaId?: string;
  nomeTitular: string;
  cpfCnpjTitular: string;
  referente: string;
  descricaoServico: string;
  mensagem: string;
  cheque: string;
  banco: string;
  impostos: string;
  valorBruto: number;
  valorDesconto: number;
  valorBrutoComDesconto: number;
  valorLiquido: number;
  createdAt: Date;
  createdBy: string;
}

export interface TutorialStep {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAudience: 'LAB' | 'CLINIC';
  writtenContent: string;
  steps: TutorialStep[];
  videoUrl?: string;
  videoSubtitle?: string;
  orderIndex: number;
  createdAt?: any;
}

export interface ClinicBudget {
  id: string;
  patientId: string;
  title: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: Date;
  notes?: string;
  items?: { description: string; qty: number; value: number }[];
  createdAt: Date;
}

export interface ClinicPrescription {
  id: string;
  patientId: string;
  dentistName: string;
  date: Date;
  items: { medication: string; instructions: string }[];
  notes?: string;
  createdAt: Date;
}

export interface ClinicClinicalCard {
  id: string;
  patientId: string;
  title: string;
  date: Date;
  notes: string;
  toothNumber?: string;
  dentistName: string;
  createdAt: Date;
}

export interface ClinicAnamnesis {
  id: string;
  patientId: string;
  updatedAt: Date;
  responses: { [key: string]: boolean | string };
}

export interface ClinicPatientFinance {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  date: Date;
  createdAt: Date;
}

export interface PatientPayment {
  id: string;
  organizationId: string;
  patientId: string;
  amount: number;
  interest?: number;
  fees?: number;
  discount?: number;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CASH' | 'OTHER';
  paymentDate: Date;
  createdAt: Date;
  type: 'PAYMENT' | 'DISCOUNT' | 'REFUND';
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  bankAccountId?: string;
  cardMachineId?: string;
}

export interface PatientBillingBatch {
  id: string;
  organizationId: string;
  patientId: string;
  appointmentIds: string[];
  totalAmount: number;
  billingDate: Date;
  dueDate: Date;
  status: 'PENDING' | 'CONFIRMED' | 'OVERDUE' | 'RECEIVED' | 'CANCELLED';
  createdAt: Date;
  paymentLink?: string;
  asaasInvoiceId?: string;
  bankSlipUrl?: string;
  pixCopyPaste?: string;
  pixQrCode?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  buyerOrgId: string;
  buyerOrgName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    variationId?: string;
    variationName?: string;
    selectedOptions?: {
      groupId: string;
      groupName: string;
      optionId: string;
      optionName: string;
    }[];
    selectedTeeth?: string[];
  }[];
  totalValue: number;
  discountValue?: number;
  couponCode?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  deliveryStatus?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: Date;
  notes?: string;
  paymentMethod: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  asaasPaymentId?: string;
  asaasPixQrCode?: string;
  asaasPixCopyPaste?: string;
  asaasInvoiceUrl?: string;
  buyerAddress?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  shippingMethod?: 'COMBINE' | 'PAC' | 'SEDEX' | 'FRENET';
  shippingCost?: number;
  trackingCode?: string;
  trackingInfo?: string;
  chat?: {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
  }[];
}




export interface ProductReview {
  id: string;
  productId: string;
  orderId: string;
  supplierId: string;
  buyerOrgId: string;
  buyerName: string;
  rating: number; // 1 to 5
  feedbackText: string;
  imageUrls?: string[];
  createdAt: Date;
}

export interface SupplierCoupon {
  id: string;
  organizationId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validUntil?: Date;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  applicableProductIds?: string[];
}
export interface Voucher {
  id: string;
  code: string;
  organizationId: string; // The lab that sold it
  clientId: string; // The dentist/clinic user ID or org ID
  clientName: string;
  jobTypeId: string; // The original service ID
  jobTypeName: string; // The original service name
  promotionName: string; // The combo name
  initialQuantity: number;
  remainingQuantity: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXHAUSTED';
  orderId: string; // The job ID that created this
  createdAt: Date;
  updatedAt?: Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole: string;
  organizationId?: string;
  organizationName?: string;
  category: string;
  description: string;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED';
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  createdAt: any;
  updatedAt: any;
  closedAt?: any;
  resolutionNote?: string;
  rating?: number;
  ratingComment?: string;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'BOT' | 'CLIENT' | 'AGENT';
  text: string;
  createdAt: any;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'audio';
}

export interface ICommunicationProvider {
  name: string;
  connect(credentials: any): Promise<any>;
  disconnect(channelId: string): Promise<any>;
  sendMessage(channelId: string, to: string, message: string): Promise<any>;
  sendTemplate(channelId: string, to: string, template: any, variables: any): Promise<any>;
  receiveWebhook(payload: any): Promise<any>;
}

export type CommunicationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RETRYING';

export interface CommunicationChannel {
  id?: string;
  tenantId: string;
  companyId: string;
  provider: string;
  channelId: string;
  phoneNumber: string;
  businessName: string;
  apiKey?: string;
  accessToken?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MessageTemplate {
  id?: string;
  tenantId: string;
  module: 'LAB' | 'CLINIC' | 'SUPPLIER' | 'GLOBAL';
  name: string;
  type: string;
  language: string;
  variables: string[];
  templateProviderId?: string;
  provider: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  body: string;
}

export interface MessageLog {
  id?: string;
  tenantId: string;
  companyId: string;
  channelId: string;
  provider: string;
  direction: 'INBOUND' | 'OUTBOUND';
  templateId?: string;
  recipient: string;
  message: string;
  status: CommunicationStatus;
  providerMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedReason?: string;
  createdAt?: Date;
}

export interface NfcKit {
  id: string;
  codigoKit: string;
  nome: string;
  descricao?: string;
  quantidadeCaixas: number;
  caixaInicial: number;
  caixaFinal: number;
  status: 'Disponível' | 'Vendido' | 'Ativado';
  empresaDestino?: string | null;
  createdAt: any;
  updatedAt: any;
  activatedAt?: any;
  activatedBy?: string;
  activatedByOrgId?: string;
}

export interface NfcBox {
  id: string;
  numeroCaixa: string;
  uid: string;
  uidHex?: string;
  uidDecimal?: string;
  textoGravado?: string;
  status: 'Disponível' | 'Associada';
  updatedAt?: any;
  kitCodigo?: string;
  kitId?: string;
}
