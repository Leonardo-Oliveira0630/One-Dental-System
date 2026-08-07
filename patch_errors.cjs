const fs = require('fs');

// PrintOverlay.tsx
let printOverlay = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');
if (!printOverlay.includes('FileText')) {
    printOverlay = printOverlay.replace(`import { Printer, MapPin, Truck, Clock } from 'lucide-react';`, `import { Printer, MapPin, Truck, Clock, FileText } from 'lucide-react';`);
} else {
    // maybe it is already imported? Wait, let's check.
}
fs.writeFileSync('components/PrintOverlay.tsx', printOverlay);

// NewJob.tsx
let newJob = fs.readFileSync('pages/NewJob.tsx', 'utf8');
newJob = newJob.replace(`status: 'COMPLETED'`, `status: 'APPROVED'`);
if (!newJob.includes('MapPin')) {
    newJob = newJob.replace(`import { Search, Plus, Trash2, Camera, AlertCircle, Info, Truck, Box, CheckCircle2, ChevronDown, ChevronRight, X, Crown, Calendar, CalendarRange } from 'lucide-react';`, `import { Search, Plus, Trash2, Camera, AlertCircle, Info, Truck, Box, CheckCircle2, ChevronDown, ChevronRight, X, Crown, Calendar, CalendarRange, MapPin } from 'lucide-react';`);
}
fs.writeFileSync('pages/NewJob.tsx', newJob);

