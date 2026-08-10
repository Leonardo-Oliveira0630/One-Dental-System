const fs = require('fs');

let printOverlay = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');
printOverlay = printOverlay.replace(
    `import { Printer, X, MapPin, User, Package, Truck, Clock } from 'lucide-react';`,
    `import { Printer, X, MapPin, User, Package, Truck, Clock, FileText } from 'lucide-react';`
);
fs.writeFileSync('components/PrintOverlay.tsx', printOverlay);

let newJob = fs.readFileSync('pages/NewJob.tsx', 'utf8');
newJob = newJob.replace(
    `import { Plus, Trash2, Save, User as UserIcon, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign, Check, Calendar, AlertTriangle, Stethoscope, ChevronDown, Layers, Percent, Edit3, ShieldAlert, SearchIcon, Tag, AlertCircle, Crown, Package } from 'lucide-react';`,
    `import { Plus, Trash2, Save, User as UserIcon, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign, Check, Calendar, AlertTriangle, Stethoscope, ChevronDown, Layers, Percent, Edit3, ShieldAlert, SearchIcon, Tag, AlertCircle, Crown, Package, MapPin } from 'lucide-react';`
);
fs.writeFileSync('pages/NewJob.tsx', newJob);
