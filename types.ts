
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT' // Dentist
}

export enum JobStatus {
  WAITING_APPROVAL = 'WAITING_APPROVAL', // Web order not yet accepted
  PENDING = 'PENDING', // Accepted, ready to start
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED' // New: Order refused by lab
}

export enum UrgencyLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VIP = 'VIP' // Promised
}

export interface BoxColor {
  id: string;
  name: string;
  hex: string;
}

export interface Sector {
  id: string;
  name: string;
}

// --- NEW VARIATION STRUCTURE ---

export interface VariationOption {
  id: string;
  name: string;
  priceModifier: number;
  // New: Conditional logic field. List of OPTION IDs this option disables.
  disablesOptions?: string[]; 
}

export interface VariationGroup {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  options: VariationOption[];
}

export interface JobType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  // Replaced flat variations list with structured groups
  variationGroups: VariationGroup[]; 
}


// --- JOB & USER STRUCTURES ---

export interface JobItem {
  id: string;
  jobTypeId: string;
  name: string;
  quantity: number;
  price: number; // Calculated unit price (Base + Variations)
  // Updated to reflect new structure, still stores flat list of selected OPTION IDs
  selectedVariationIds?: string[];
  commissionDisabled?: boolean; // New: Flag to disable commission
}

export interface JobHistoryEvent {
  id:string;
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  sector?: string;
}

export interface Job {
  id: string; // Internal ID (UUID)
  osNumber?: string; // Lab visible number (e.g. 8090)
  patientName: string;
  dentistId: string;
  dentistName: string;
  status: JobStatus;
  urgency: UrgencyLevel;
  items: JobItem[];
  history: JobHistoryEvent[];
  createdAt: Date;
  dueDate: Date;
  boxNumber?: string;
  boxColor?: BoxColor;
  currentSector?: string;
  totalValue: number;
  notes?: string;
  managerNotes?: string; // New: Internal notes for production manager
}

export interface JobAlert {
  id: string;
  jobId: string;
  osNumber: string;
  message: string;
  targetSector?: string; // If set, alerts anyone in this sector
  targetUserId?: string; // If set, alerts specific user
  scheduledFor: Date;
  createdBy: string;
  createdAt: Date;
  readBy: string[]; // List of user IDs who have dismissed/read the alert
}

export interface CustomPrice {
  jobTypeId: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicName?: string; // For Clients
  sector?: string; // For Collaborators
  customPrices?: CustomPrice[]; // Table of individual prices for this user
}

// --- NEW CART STRUCTURE ---
export interface CartItem {
  cartItemId: string; // Unique ID for this specific cart entry
  jobType: JobType;
  quantity: number;
  unitPrice: number; // Price per unit after variations
  finalPrice: number; // unitPrice * quantity
  selectedVariationIds: string[];
}
