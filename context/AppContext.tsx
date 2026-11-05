import React, { createContext, useContext, useState } from 'react';
import { Job, User, ManualDentist, Sector, JobType, Organization, DentistPayment, BillingBatch, UserRole, JobStatus } from '../types';

interface AppContextType {
  jobs: Job[];
  allUsers: User[];
  manualDentists: ManualDentist[];
  sectors: Sector[];
  jobTypes: JobType[];
  currentOrg: Organization | null;
  currentUser: User | null;
  dentistPayments: DentistPayment[];
  billingBatches: BillingBatch[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setJobTypes: React.Dispatch<React.SetStateAction<JobType[]>>;
}

const initialJobTypes: JobType[] = [
  {
    id: 'jt-1',
    name: 'Coroa de Zircônia',
    category: 'Monolítico',
    price: 100
  },
  {
    id: 'jt-2',
    name: 'Faceta Emax',
    category: 'Monolítico',
    price: 100
  },
  {
    id: 'jt-3',
    name: 'Prótese Total Superior',
    category: 'Prótese Total',
    price: 350
  },
  {
    id: 'jt-4',
    name: 'Placa Miorelaxante',
    category: 'Placas',
    price: 150
  }
];

const initialJobs: Job[] = [
  {
    id: 'job-1',
    osNumber: '0655',
    boxNumber: '565',
    dentistId: 'd-1',
    dentistName: 'Dr. Carlos Silva',
    clinicName: 'Odonto Silva',
    patientName: 'João Santos',
    status: JobStatus.COMPLETED,
    totalValue: 2000,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-1',
        jobTypeId: 'jt-1',
        name: 'Coroa de Zircônia',
        quantity: 10,
        price: 100
      },
      {
        id: 'item-2',
        jobTypeId: 'jt-2',
        name: 'Faceta Emax',
        quantity: 10,
        price: 100
      }
    ]
  },
  {
    id: 'job-2',
    osNumber: '0656',
    boxNumber: '25L',
    dentistId: 'd-2',
    dentistName: 'Dra. Maria Fernandes',
    clinicName: 'Sorriso Total',
    patientName: 'Ana Oliveira',
    status: JobStatus.DELIVERED,
    totalValue: 350,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date().toISOString(),
    items: [
      {
        id: 'item-3',
        jobTypeId: 'jt-3',
        name: 'Prótese Total Superior',
        quantity: 1,
        price: 350
      }
    ]
  }
];

const initialDentists: ManualDentist[] = [
  {
    id: 'd-1',
    name: 'Dr. Carlos Silva',
    clinicName: 'Odonto Silva',
    phone: '(11) 98765-4321',
    email: 'carlos@odontosilva.com'
  },
  {
    id: 'd-2',
    name: 'Dra. Maria Fernandes',
    clinicName: 'Sorriso Total',
    phone: '(11) 91234-5678',
    email: 'maria@sorrisototal.com'
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [jobTypes, setJobTypes] = useState<JobType[]>(initialJobTypes);

  const [allUsers] = useState<User[]>([
    {
      id: 'u-1',
      name: 'Administrador Labprox',
      role: UserRole.SUPER_ADMIN,
      email: 'admin@labprox.app'
    }
  ]);

  const [manualDentists] = useState<ManualDentist[]>(initialDentists);

  const [sectors] = useState<Sector[]>([
    { id: 's-1', name: 'Gesso' },
    { id: 's-2', name: 'CAD/CAM' },
    { id: 's-3', name: 'Cerâmica' },
    { id: 's-4', name: 'Acabamento' }
  ]);

  const currentOrg: Organization = {
    id: 'org-1',
    name: 'Labprox - Laboratório Modelo'
  };

  const currentUser: User = {
    id: 'u-1',
    name: 'Administrador',
    role: UserRole.SUPER_ADMIN,
    email: 'admin@labprox.app'
  };

  const dentistPayments: DentistPayment[] = [
    {
      id: 'pay-1',
      dentistId: 'd-1',
      dentistName: 'Dr. Carlos Silva',
      amount: 1000,
      paymentMethod: 'PIX',
      paymentDate: new Date().toISOString(),
      notes: 'Pagamento parcial OS 0655'
    }
  ];

  const billingBatches: BillingBatch[] = [];

  return (
    <AppContext.Provider value={{
      jobs,
      allUsers,
      manualDentists,
      sectors,
      jobTypes,
      currentOrg,
      currentUser,
      dentistPayments,
      billingBatches,
      setJobs,
      setJobTypes
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
