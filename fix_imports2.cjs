const fs = require('fs');

function fix(file, funcName) {
    let content = fs.readFileSync(file, 'utf8');
    const searchStr = `import React, { useState, useMemo, useEffect };export const ${funcName} = () => {`;
    
    let imports = "";
    if (funcName === "Dentists") {
        imports = `import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, ManualDentist, Job, JobStatus, DentistPayment, BillingBatch } from '../../types';
import { Stethoscope, Building, Search, Loader2, ArrowRight, Tag, Percent, Save, X, DollarSign, Globe, HardDrive, UserCheck, Package, Table, FileText, Lock, Unlock, RefreshCw, Check, Calendar, ArrowUpCircle, ArrowDownCircle, Receipt, History, CreditCard, Banknote, Wallet, FileSpreadsheet, Plus, Info, MinusCircle, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDentistJobs, subscribeDentistJobs } from '../../services/firebaseService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
`;
    } else {
        imports = `import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, UserRole, Expense, Job, TransactionCategory, BillingBatch, DentistPayment } from '../../types';
import * as api from '../../services/firebaseService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Search, Calendar, Plus, Printer, 
  FileText, Download, AlertCircle, Wallet, Briefcase, CheckCircle, 
  CreditCard, Loader2, User, Package, Clock, X, Filter, 
  FileCheck, Receipt, Check, Trash2, ShoppingCart, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronLeft, History, ExternalLink, Copy, Tag, AlertTriangle, ShieldCheck, Zap, ArrowUpCircle,
  ArrowDownCircle, FileSpreadsheet, Building, UserCheck, Save, Banknote, ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
`;
    }
    
    const translationBlock = `
const translatePaymentMethod = (method: string) => {
    switch (method) {
        case 'PIX': return 'PIX';
        case 'CASH': return 'Dinheiro';
        case 'CREDIT_CARD': return 'Cartão Crédito';
        case 'DEBIT_CARD': return 'Cartão Débito';
        case 'BANK_TRANSFER': return 'Transf. Bancária';
        case 'BOLETO': return 'Boleto';
        case 'DISCOUNT': return 'Desconto/Cortesia';
        case 'CLIENT_CREDIT': return 'Saldo Crédito';
        default: return method;
    }
};

`;

    content = content.replace(searchStr, imports + translationBlock + `export const ${funcName} = () => {`);
    fs.writeFileSync(file, content);
}

fix('pages/lab/Dentists.tsx', 'Dentists');
fix('pages/lab/Finance.tsx', 'Finance');
