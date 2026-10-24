import { Job, JobStatus, UrgencyLevel, UserRole, DeliveryRoute, RouteItem, ClinicPatient, InventoryItem } from '../types';

export const getReviewerSeedJobs = (orgId: string): Job[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'job-rev-101',
      organizationId: orgId,
      osNumber: 'OS-8001',
      boxNumber: 'CX-01',
      patientName: 'Carolina Mendes (Avaliador)',
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva (CRO 12345-SP)',
      clinicName: 'Clínica Odonto Prime Review',
      status: JobStatus.IN_PROGRESS,
      urgency: UrgencyLevel.NORMAL,
      totalValue: 850.00,
      createdAt: threeDaysAgo,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      items: [
        {
          id: 'item-101-1',
          jobTypeId: 'jt-zirconia',
          name: 'Coroa Metal Free Zircônia Pura Ultra 3D',
          quantity: 3,
          price: 280.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['11', '12', '21'],
          color: 'A2 (VITA Classic)'
        }
      ],
      currentSector: 'USINAGEM_CAD_CAM',
      sectorEntryTime: yesterday,
      history: [
        {
          id: 'hist-1',
          action: 'Caso recebido via aplicativo e registrado no sistema.',
          sector: 'RECEPCAO',
          timestamp: threeDaysAgo,
          userId: 'usr-rev-1',
          userName: 'Equipe de Recepção Review'
        },
        {
          id: 'hist-2',
          action: 'Usinagem de bloco de Zircônia iniciada.',
          sector: 'USINAGEM_CAD_CAM',
          timestamp: yesterday,
          userId: 'usr-rev-2',
          userName: 'Técnico CAD/CAM Review'
        }
      ]
    },
    {
      id: 'job-rev-102',
      organizationId: orgId,
      osNumber: 'OS-8002',
      boxNumber: 'CX-02',
      patientName: 'Marcelo Oliveira (Avaliador)',
      dentistId: 'dentist-rev-2',
      dentistName: 'Dra. Fernanda Lima (CRO 98765-SP)',
      clinicName: 'Clínica Sorriso Aberto',
      status: JobStatus.DELIVERED,
      urgency: UrgencyLevel.HIGH,
      totalValue: 1250.00,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      dueDate: yesterday,
      deliveredAt: yesterday,
      isDelivered: true,
      deliveryConfirmed: true,
      items: [
        {
          id: 'item-102-1',
          jobTypeId: 'jt-protocolo',
          name: 'Protocolo Superior Sobre Implante Zircônia',
          quantity: 1,
          price: 1250.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['46'],
          color: 'BL3 (Bleach)'
        }
      ],
      currentSector: 'ENTREGA',
      history: [
        {
          id: 'hist-102-1',
          action: 'Trabalho entregue com sucesso na clínica parceira.',
          sector: 'ENTREGA',
          timestamp: yesterday,
          userId: 'usr-rev-3',
          userName: 'Motoboy Lucas Review'
        }
      ]
    },
    {
      id: 'job-rev-103',
      organizationId: orgId,
      osNumber: 'OS-8003 (R)',
      boxNumber: 'CX-05',
      patientName: 'Juliana Paes (Repetição Teste)',
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva',
      clinicName: 'Clínica Odonto Prime Review',
      status: JobStatus.WAITING_APPROVAL,
      urgency: UrgencyLevel.VIP,
      totalValue: 420.00,
      createdAt: yesterday,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      items: [
        {
          id: 'item-103-1',
          jobTypeId: 'jt-e-max',
          name: 'Laminado Cerâmico E-Max CAD (Repetição)',
          quantity: 2,
          price: 210.00,
          nature: 'REPETITION',
          selectedVariationIds: [],
          selectedTeeth: ['14', '15'],
          color: 'A3'
        }
      ],
      currentSector: 'CONTROLE_QUALIDADE',
      history: [
        {
          id: 'hist-103-1',
          action: 'Aguardando aprovação de repetção pelo controle de qualidade.',
          sector: 'CONTROLE_QUALIDADE',
          timestamp: yesterday,
          userId: 'usr-rev-1',
          userName: 'Supervisão de Qualidade'
        }
      ]
    }
  ];
};

export const getReviewerSeedRoutes = (orgId: string): { route: DeliveryRoute; items: RouteItem[] } => {
  const now = new Date();
  const routeId = 'route-rev-001';

  return {
    route: {
      id: routeId,
      organizationId: orgId,
      date: now,
      shift: 'MORNING',
      driverName: 'Carlos Motoboy (Reviewer Express)',
      status: 'IN_TRANSIT',
      createdAt: now
    },
    items: [
      {
        id: 'item-rev-1',
        routeId: routeId,
        jobId: 'job-rev-101',
        dentistId: 'dentist-rev-1',
        dentistName: 'Dr. Roberto Silva',
        clinicName: 'Clínica Odonto Prime Review',
        patientName: 'Carolina Mendes (Avaliador)',
        address: 'Av. Paulista, 1000 - Cj 502, São Paulo - SP',
        type: 'DELIVERY',
        order: 1,
        observations: 'Deixar a caixa na recepção com a Sra. Amanda',
        addedByUserId: 'usr-rev-admin',
        addedByUserName: 'Avaliador App Store',
        addedAt: now
      },
      {
        id: 'item-rev-2',
        routeId: routeId,
        dentistId: 'dentist-rev-2',
        dentistName: 'Dra. Fernanda Lima',
        clinicName: 'Clínica Sorriso Aberto',
        patientName: 'Coleta de Moldagem Alginato',
        address: 'Rua Augusta, 450 - Sl 12, São Paulo - SP',
        type: 'PICKUP',
        order: 2,
        observations: 'Retirar moldeira metálica e caixa de silicone',
        addedByUserId: 'usr-rev-admin',
        addedByUserName: 'Avaliador App Store',
        addedAt: now
      }
    ]
  };
};

export const getReviewerSeedInventory = (orgId: string): InventoryItem[] => [
  {
    id: 'inv-rev-1',
    organizationId: orgId,
    name: 'Bloco de Zircônia Pura HT A2 (Usinagem CAD/CAM)',
    code: 'ZIRC-HT-A2',
    type: 'MATERIAL',
    currentStock: 48,
    minStock: 10,
    costPrice: 85.00,
    sellPrice: 280.00,
    isVisibleInStore: true,
    description: 'Bloco de zircônia odontológica de altíssima translucidez para restaurações estéticas.'
  },
  {
    id: 'inv-rev-2',
    organizationId: orgId,
    name: 'Resina Acrílica Autopolimerizável Rosa Médio 500g',
    code: 'RES-ROSA-500',
    type: 'SUPPLY',
    currentStock: 12,
    minStock: 5,
    costPrice: 42.00,
    sellPrice: 95.00,
    isVisibleInStore: true,
    description: 'Resina de alta estabilidade dimensional para confecção de placas e acrilização.'
  }
];

export const getReviewerSeedPatients = (orgId: string): ClinicPatient[] => {
  const now = new Date();
  return [
    {
      id: 'patient-rev-1',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      name: 'Mariana Costa (Paciente Teste)',
      cpf: '123.456.789-00',
      email: 'mariana.paciente@labprox.com.br',
      phone: '(11) 98888-7777',
      birthDate: '1992-05-14',
      createdAt: now
    },
    {
      id: 'patient-rev-2',
      organizationId: orgId,
      dentistId: 'dentist-rev-2',
      name: 'Lucas Eduardo Prado',
      cpf: '987.654.321-11',
      email: 'lucas.prado@labprox.com.br',
      phone: '(11) 97777-6666',
      birthDate: '1985-11-20',
      createdAt: now
    }
  ];
};
