import { Job, JobStatus, UrgencyLevel, User, UserRole, JobType, BoxColor, Sector } from "../types";

export const BOX_COLORS: BoxColor[] = [
  { id: '1', name: 'Azul', hex: '#3b82f6' },
  { id: '2', name: 'Vermelho', hex: '#ef4444' },
  { id: '3', name: 'Verde', hex: '#22c55e' },
  { id: '4', name: 'Amarelo', hex: '#eab308' },
];

export const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Recepção / Triagem' },
  { id: 's2', name: 'Gesso' },
  { id: 's3', name: 'CAD (Desenho)' },
  { id: 's4', name: 'CAM (Fresagem/Impressão)' },
  { id: 's5', name: 'Cerâmica / Acabamento' },
  { id: 's6', name: 'Controle de Qualidade' },
];

export const JOB_TYPES: JobType[] = [
  { 
    id: 't1', 
    name: 'Coroa de Zircônia', 
    category: 'Coroas', 
    basePrice: 450,
    variations: [
      { id: 'v1', name: 'Cor Padrão (Escala)', priceModifier: 0, group: 'Cor' },
      { id: 'v2', name: 'Cor Personalizada (Foto)', priceModifier: 50, group: 'Cor' },
      { id: 'v3', name: 'Taxa de Urgência (24h)', priceModifier: 150, group: 'Prazo' },
      { id: 'v4', name: 'Parafuso de Implante', priceModifier: 120 }
    ]
  },
  { 
    id: 't2', 
    name: 'Lente E-Max', 
    category: 'Lentes', 
    basePrice: 550,
    variations: [
       { id: 'v5', name: 'Técnica Cut-back', priceModifier: 80 }
    ]
  },
  { 
    id: 't3', 
    name: 'Prótese Total (PT)', 
    category: 'Próteses', 
    basePrice: 1200,
    variations: []
  },
  { 
    id: 't4', 
    name: 'Metalocerâmica', 
    category: 'Coroas', 
    basePrice: 380,
    variations: [
       { id: 'v6', name: 'Metal Precioso', priceModifier: 200, group: 'Liga' },
       { id: 'v7', name: 'Metal Não-Precioso', priceModifier: 0, group: 'Liga' }
    ]
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@lab.com', role: UserRole.ADMIN },
  { id: 'u2', name: 'Gerente Marcos', email: 'manager@lab.com', role: UserRole.MANAGER },
  { id: 'u3', name: 'Operador João', email: 'ops@lab.com', role: UserRole.COLLABORATOR, sector: 'Cerâmica / Acabamento' },
  { id: 'u4', name: 'Dr. Silva', email: 'smith@clinic.com', role: UserRole.CLIENT, clinicName: 'Clínica Silva' },
];

const today = new Date();
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    osNumber: '1001',
    patientName: 'Alice Souza',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.IN_PROGRESS,
    urgency: UrgencyLevel.NORMAL,
    items: [{ ...JOB_TYPES[0], quantity: 1, id: 'i1', jobTypeId: 't1', price: JOB_TYPES[0].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: yesterday,
    dueDate: tomorrow,
    boxNumber: '12',
    boxColor: BOX_COLORS[0],
    currentSector: 'Cerâmica / Acabamento',
    totalValue: 450
  },
  {
    id: 'j2',
    osNumber: '1002',
    patientName: 'Roberto Dias',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.WAITING_APPROVAL,
    urgency: UrgencyLevel.NORMAL,
    items: [{ ...JOB_TYPES[1], quantity: 2, id: 'i2', jobTypeId: 't2', price: JOB_TYPES[1].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: today,
    dueDate: new Date(today.getTime() + 86400000 * 5),
    totalValue: 1100
  },
  {
    id: 'j3',
    osNumber: '1003',
    patientName: 'Carlos Oliveira',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.PENDING,
    urgency: UrgencyLevel.VIP,
    items: [{ ...JOB_TYPES[2], quantity: 1, id: 'i3', jobTypeId: 't3', price: JOB_TYPES[2].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: yesterday,
    dueDate: today,
    boxNumber: '05',
    boxColor: BOX_COLORS[1],
    currentSector: 'Gesso',
    totalValue: 1200
  }
];