const fs = require('fs');

function fix(file, funcName) {
    let content = fs.readFileSync(file, 'utf8');
    
    // find index of "export const Dentists ="
    const index = content.indexOf(`export const ${funcName} =`);
    if (index === -1) return;
    
    let imports = "";
    if (funcName === "Dentists") {
        imports = `import React, { useState, useMemo, useEffect } from 'react';\nimport { useApp } from '../../context/AppContext';\nimport { UserRole, ManualDentist, Job, JobStatus, DentistPayment, BillingBatch } from '../../types';\nimport { Stethoscope, Building, Search, Loader2, ArrowRight, Tag, Percent, Save, X, DollarSign, Globe, HardDrive, UserCheck, Package, Table, FileText, Lock, Unlock, RefreshCw, Check, Calendar, ArrowUpCircle, ArrowDownCircle, Receipt, History, CreditCard, Banknote, Wallet, FileSpreadsheet, Plus, Info, MinusCircle, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';\nimport { getDentistJobs, subscribeDentistJobs } from '../../services/firebaseService';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n`;
    } else {
        imports = `import React, { useState, useMemo, useEffect } from 'react';\nimport { useApp } from '../../context/AppContext';\nimport { JobStatus, UserRole, Expense, Job, TransactionCategory, BillingBatch, DentistPayment } from '../../types';\nimport * as api from '../../services/firebaseService';\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';\nimport { DollarSign, TrendingUp, TrendingDown, Search, Calendar, Plus, Printer, FileText, Download, AlertCircle, Wallet, Briefcase, CheckCircle, CreditCard, Loader2, User, Package, Clock, X, Filter, FileCheck, Receipt, Check, Trash2, ShoppingCart, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronLeft, History, ExternalLink, Copy, Tag, AlertTriangle, ShieldCheck, Zap, ArrowUpCircle, ArrowDownCircle, FileSpreadsheet, Building, UserCheck, Save, Banknote, ChevronRight } from 'lucide-react';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n`;
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

    content = imports + translationBlock + content.slice(index);
    fs.writeFileSync(file, content);
}

fix('pages/lab/Dentists.tsx', 'Dentists');
fix('pages/lab/Finance.tsx', 'Finance');
