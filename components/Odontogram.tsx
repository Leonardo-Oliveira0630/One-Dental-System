import React from 'react';

export interface OdontogramProps {
  selectedTeeth?: string[];
  onChange?: (selectedIds: string[]) => void;
  // deprecated, use onChange instead
  onToothClick?: (id: string, shiftKey?: boolean) => void;
  toothColors?: Record<string, string>;
  disabledTeeth?: string[];
  readOnly?: boolean;
  className?: string;
  selectionColor?: string;
}

const UPPER_ARCH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_ARCH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

const toothPaths = {
  incisor: {
    body: "M -12,-12 C -6,-14 6,-14 12,-12 C 16,-4 13,6 8,12 C 4,16 -4,16 -8,12 C -13,6 -16,-4 -12,-12 Z",
    sulcus: "M -7,-7 C -3,-2 0,3 0,3 C 0,3 3,-2 7,-7 M -4,7 C -2,10 2,10 4,7 M 0,3 L 0,7"
  },
  lower_incisor: {
    body: "M -8,-10 C -4,-12 4,-12 8,-10 C 11,-3 9,5 5,11 C 3,14 -3,14 -5,11 C -9,5 -11,-3 -8,-10 Z",
    sulcus: "M -5,-5 C -2,-1 0,3 0,3 C 0,3 2,-1 5,-5 M -3,6 C -1,9 1,9 3,6 M 0,3 L 0,6"
  },
  canine: {
    body: "M -12,-9 C -5,-16 5,-16 12,-9 C 16,-2 14,7 7,13 C 3,17 -3,17 -7,13 C -14,7 -16,-2 -12,-9 Z",
    sulcus: "M 0,-11 L 0,0 M -6,-5 C -3,1 -1,3 -1,3 M 6,-5 C 3,1 1,3 1,3 M -4,9 C -2,12 2,12 4,9 M 0,3 L 0,11"
  },
  premolar: {
    body: "M -12,-12 C -6,-16 6,-16 12,-12 C 18,-4 14,-2 14,0 C 14,2 18,4 12,12 C 6,16 -6,16 -12,12 C -18,4 -14,2 -14,0 C -14,-2 -18,-4 -12,-12 Z",
    sulcus: "M -9,0 C -4,2 4,2 9,0 M -9,0 C -11,3 -9,6 -7,8 M 9,0 C 11,3 9,6 7,8 M -9,0 C -11,-3 -9,-6 -7,-8 M 9,0 C 11,-3 9,-6 7,-8 M -3,0 L -3,3 M 3,0 L 3,-3"
  },
  upper_molar: {
    body: "M -16,-16 C -8,-20 -2,-18 0,-18 C 2,-18 8,-20 16,-16 C 22,-8 18,-2 18,0 C 18,2 22,8 16,16 C 8,20 2,18 0,18 C -2,18 -8,20 -16,16 C -22,8 -18,2 -18,0 C -18,-2 -22,-8 -16,-16 Z",
    sulcus: "M -10,-2 C -4,2 2,2 6,-2 M 6,-2 C 10,-6 14,-6 16,-4 M -2,1 C -2,6 -5,10 0,15 M 6,-2 C 4,-8 7,-12 3,-16 M -10,-2 C -12,2 -14,2 -13,6 M -10,-2 L -14,-6 M -4,-2 L -4,-6 M 2,-4 L -1,-8 M -6,5 L -2,8"
  },
  lower_molar: {
    body: "M -18,-14 C -10,-18 -4,-16 0,-16 C 4,-16 10,-18 18,-14 C 24,-6 20,-2 20,0 C 20,2 24,6 18,14 C 10,18 4,16 0,16 C -4,16 -10,18 -18,14 C -24,6 -20,2 -20,0 C -20,-2 -24,-6 -18,-14 Z",
    sulcus: "M -14,0 C -7,2 7,2 14,0 M -3,1 C -3,7 -5,11 -1,15 M 5,1 C 3,7 5,11 9,14 M -5,0 C -3,-6 -6,-10 -2,-14 M 3,0 C 5,-6 3,-10 7,-14 M -14,0 L -16,4 M -14,0 L -16,-4 M 14,0 L 16,4 M 14,0 L 16,-4 M -1,-2 L 2,1"
  }
};

type ToothDef = {
  id: string;
  type: keyof typeof toothPaths;
  x: number;
  y: number;
  angle: number;
  quadrant: 1 | 2 | 3 | 4;
}

const TEETH: ToothDef[] = [
  { id: '11', type: 'incisor', x: 286.0, y: 55.0, angle: -4, quadrant: 1 },
  { id: '12', type: 'incisor', x: 258.9, y: 59.5, angle: -15, quadrant: 1 },
  { id: '13', type: 'canine', x: 233.5, y: 71.4, angle: -35, quadrant: 1 },
  { id: '14', type: 'premolar', x: 212.3, y: 92.6, angle: -55, quadrant: 1 },
  { id: '15', type: 'premolar', x: 199.0, y: 121.1, angle: -75, quadrant: 1 },
  { id: '16', type: 'upper_molar', x: 192.5, y: 157.6, angle: -85, quadrant: 1 },
  { id: '17', type: 'upper_molar', x: 190.7, y: 199.0, angle: -90, quadrant: 1 },
  { id: '18', type: 'upper_molar', x: 192.5, y: 240.5, angle: -95, quadrant: 1 },
  { id: '21', type: 'incisor', x: 314.0, y: 55.0, angle: 4, quadrant: 2 },
  { id: '22', type: 'incisor', x: 341.1, y: 59.5, angle: 15, quadrant: 2 },
  { id: '23', type: 'canine', x: 366.5, y: 71.4, angle: 35, quadrant: 2 },
  { id: '24', type: 'premolar', x: 387.7, y: 92.6, angle: 55, quadrant: 2 },
  { id: '25', type: 'premolar', x: 401.0, y: 121.1, angle: 75, quadrant: 2 },
  { id: '26', type: 'upper_molar', x: 407.5, y: 157.6, angle: 85, quadrant: 2 },
  { id: '27', type: 'upper_molar', x: 409.3, y: 199.0, angle: 90, quadrant: 2 },
  { id: '28', type: 'upper_molar', x: 407.5, y: 240.5, angle: 95, quadrant: 2 },
  { id: '31', type: 'lower_incisor', x: 309.0, y: 465.0, angle: 176, quadrant: 3 },
  { id: '32', type: 'lower_incisor', x: 328.3, y: 462.3, angle: 168, quadrant: 3 },
  { id: '33', type: 'canine', x: 349.5, y: 454.6, angle: 152, quadrant: 3 },
  { id: '34', type: 'premolar', x: 370.7, y: 438.0, angle: 132, quadrant: 3 },
  { id: '35', type: 'premolar', x: 386.9, y: 412.1, angle: 112, quadrant: 3 },
  { id: '36', type: 'lower_molar', x: 396.9, y: 374.9, angle: 98, quadrant: 3 },
  { id: '37', type: 'lower_molar', x: 400.9, y: 329.1, angle: 92, quadrant: 3 },
  { id: '38', type: 'lower_molar', x: 400.9, y: 283.1, angle: 88, quadrant: 3 },
  { id: '41', type: 'lower_incisor', x: 291.0, y: 465.0, angle: -176, quadrant: 4 },
  { id: '42', type: 'lower_incisor', x: 271.7, y: 462.3, angle: -168, quadrant: 4 },
  { id: '43', type: 'canine', x: 250.5, y: 454.6, angle: -152, quadrant: 4 },
  { id: '44', type: 'premolar', x: 229.3, y: 438.0, angle: -132, quadrant: 4 },
  { id: '45', type: 'premolar', x: 213.1, y: 412.1, angle: -112, quadrant: 4 },
  { id: '46', type: 'lower_molar', x: 203.1, y: 374.9, angle: -98, quadrant: 4 },
  { id: '47', type: 'lower_molar', x: 199.1, y: 329.1, angle: -92, quadrant: 4 },
  { id: '48', type: 'lower_molar', x: 199.1, y: 283.1, angle: -88, quadrant: 4 },
];

export function Odontogram({ selectedTeeth = [], onChange, onToothClick, toothColors = {}, disabledTeeth = [], readOnly = false, className = '', selectionColor }: OdontogramProps) {
  
  const [lastSelected, setLastSelected] = React.useState<string | null>(null);

  const handleClick = (id: string, shiftKey: boolean) => {
    if (readOnly || disabledTeeth.includes(id)) return;
    
    if (onChange) {
      if (shiftKey && lastSelected) {
        const arch = UPPER_ARCH.includes(id) && UPPER_ARCH.includes(lastSelected) ? UPPER_ARCH 
                   : LOWER_ARCH.includes(id) && LOWER_ARCH.includes(lastSelected) ? LOWER_ARCH : null;
        
        if (arch) {
          const idx1 = arch.indexOf(lastSelected);
          const idx2 = arch.indexOf(id);
          const start = Math.min(idx1, idx2);
          const end = Math.max(idx1, idx2);
          const range = arch.slice(start, end + 1);
          
          const newSet = new Set(selectedTeeth);
          range.forEach(t => newSet.add(t));
          onChange(Array.from(newSet));
          setLastSelected(id);
          return;
        }
      }

      const isSelected = selectedTeeth.includes(id);
      const newSelection = isSelected
        ? selectedTeeth.filter(t => t !== id)
        : [...selectedTeeth, id];
        
      onChange(newSelection);
      setLastSelected(isSelected ? null : id);
    } else if (onToothClick) {
      onToothClick(id, shiftKey);
    }
  };

  const renderTooth = (tooth: ToothDef) => {
    const isUpper = tooth.quadrant === 1 || tooth.quadrant === 2;
    const distance = 40;
    const rad = tooth.angle * (Math.PI / 180);
    const dx = distance * Math.sin(rad);
    const dy = distance * -Math.cos(rad);

    const isSelected = selectedTeeth.includes(tooth.id);
    const customColor = toothColors[tooth.id];
    const isDisabled = disabledTeeth.includes(tooth.id) || readOnly;

    const activeSelectionColor = selectionColor || '#4f46e5';
    const fillColor = isSelected ? activeSelectionColor : customColor;

    return (
      <g 
        key={tooth.id}
        id={`tooth-${tooth.id}`}
        className={`tooth-group ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
        transform={`translate(${tooth.x}, ${tooth.y})`}
        onClick={(e) => handleClick(tooth.id, e.shiftKey)}
      >
        <g transform={`rotate(${tooth.angle})`}>
          <path 
            className="tooth-body" 
            d={toothPaths[tooth.type].body} 
            style={fillColor ? { fill: fillColor, opacity: isSelected ? 1 : 0.8, stroke: isSelected ? fillColor : undefined } : undefined}
          />
          {toothPaths[tooth.type].sulcus && (
            <path 
              className="tooth-sulcus" 
              d={toothPaths[tooth.type].sulcus}
              style={isSelected ? { stroke: '#ffffff', opacity: 0.8 } : undefined}
            />
          )}
        </g>
        <text 
          x={dx} 
          y={dy} 
          textAnchor="middle" 
          dominantBaseline="middle"
          className={`text-xs font-bold select-none transition-colors duration-200 ${isSelected ? 'fill-blue-600' : 'fill-slate-500'}`}
        >
          {tooth.id}
        </text>
      </g>
    );
  };

  return (
    <svg viewBox="80 -60 440 640" className={`w-full h-auto max-h-[80vh] max-w-lg mx-auto ${className}`}>

      
      
      
      
      
      
      
      

      
      

      
      

      
      

      
      

      <defs>
        <style>{`
          .tooth-group {
            cursor: pointer;
          }
          .tooth-group.disabled {
            cursor: not-allowed;
          }
          .tooth-body {
            fill: transparent;
            stroke: #1e293b;
            stroke-width: 2;
            transition: all 0.2s ease;
          }
          .tooth-sulcus {
            fill: none;
            stroke: #475569;
            stroke-width: 1.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            transition: all 0.2s ease;
          }
          .tooth-group:not(.disabled):hover .tooth-body {
            fill: #f1f5f9;
            stroke: #3B82F6;
          }
          .tooth-group.selected .tooth-body {
            fill: #EFF6FF;
            stroke: #2563EB;
            stroke-width: 2.5;
          }
          .tooth-group.selected .tooth-sulcus {
            stroke: #60A5FA;
          }
        `}</style>
      </defs>
      
      {/* Upper Arch */}
      <g id="upper-arch">
        {/* Quadrant 1 */}
        {TEETH.filter(t => t.quadrant === 1).map(tooth => renderTooth(tooth))}
        {/* Quadrant 2 */}
        {TEETH.filter(t => t.quadrant === 2).map(tooth => renderTooth(tooth))}
      </g>

      {/* Lower Arch */}
      <g id="lower-arch">
        {/* Quadrant 3 */}
        {TEETH.filter(t => t.quadrant === 3).map(tooth => renderTooth(tooth))}
        {/* Quadrant 4 */}
        {TEETH.filter(t => t.quadrant === 4).map(tooth => renderTooth(tooth))}
      </g>
    </svg>
  );
}
