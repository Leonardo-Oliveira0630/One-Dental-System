import React from 'react';

export interface OdontogramProps {
  selectedTeeth?: string[];
  onToothClick?: (id: string) => void;
  toothColors?: Record<string, string>;
  disabledTeeth?: string[];
  readOnly?: boolean;
  className?: string;
}

const toothPaths = {
  incisor: {
    body: "M -12,-8 C -14,-15 14,-15 12,-8 C 14,8 -14,8 -12,-8 Z",
    sulcus: ""
  },
  lower_incisor: {
    body: "M -10,-6 C -12,-12 12,-12 10,-6 C 12,6 -12,6 -10,-6 Z",
    sulcus: ""
  },
  canine: {
    body: "M 0,-13 C 14,-8 14,8 0,11 C -14,8 -14,-8 0,-13 Z",
    sulcus: ""
  },
  premolar: {
    body: "M -14,-10 C -14,-18 14,-18 14,-10 C 16,12 -16,12 -14,-10 Z",
    sulcus: "M -6,0 L 6,0 M -3,-2 L -6,0 L -3,2 M 3,-2 L 6,0 L 3,2"
  },
  molar: {
    body: "M -18,-15 C -22,-22 22,-22 18,-15 C 24,15 -24,15 -18,-15 Z",
    sulcus: "M -10,0 L 10,0 M 0,-8 L 0,8 M -5,-3 L 0,0 L 5,-3 M -5,3 L 0,0 L 5,3"
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
  { id: '11', type: 'incisor', x: 283.3, y: 41.1, angle: -6, quadrant: 1 },
  { id: '12', type: 'incisor', x: 250.6, y: 49.8, angle: -18, quadrant: 1 },
  { id: '13', type: 'canine', x: 215.2, y: 70.4, angle: -32, quadrant: 1 },
  { id: '14', type: 'premolar', x: 181.1, y: 106.2, angle: -48, quadrant: 1 },
  { id: '15', type: 'premolar', x: 156.2, y: 152.3, angle: -64, quadrant: 1 },
  { id: '16', type: 'molar', x: 142.4, y: 205.3, angle: -80, quadrant: 1 },
  { id: '17', type: 'molar', x: 140.6, y: 257.4, angle: -95, quadrant: 1 },
  { id: '18', type: 'molar', x: 149.6, y: 308.4, angle: -110, quadrant: 1 },
  { id: '21', type: 'incisor', x: 316.7, y: 41.1, angle: 6, quadrant: 2 },
  { id: '22', type: 'incisor', x: 349.4, y: 49.8, angle: 18, quadrant: 2 },
  { id: '23', type: 'canine', x: 384.8, y: 70.4, angle: 32, quadrant: 2 },
  { id: '24', type: 'premolar', x: 418.9, y: 106.2, angle: 48, quadrant: 2 },
  { id: '25', type: 'premolar', x: 443.8, y: 152.3, angle: 64, quadrant: 2 },
  { id: '26', type: 'molar', x: 457.6, y: 205.3, angle: 80, quadrant: 2 },
  { id: '27', type: 'molar', x: 459.4, y: 257.4, angle: 95, quadrant: 2 },
  { id: '28', type: 'molar', x: 450.4, y: 308.4, angle: 110, quadrant: 2 },
  { id: '31', type: 'lower_incisor', x: 316.7, y: 858.9, angle: 186, quadrant: 3 },
  { id: '32', type: 'lower_incisor', x: 349.4, y: 850.2, angle: 198, quadrant: 3 },
  { id: '33', type: 'canine', x: 384.8, y: 829.6, angle: 212, quadrant: 3 },
  { id: '34', type: 'premolar', x: 418.9, y: 793.8, angle: 228, quadrant: 3 },
  { id: '35', type: 'premolar', x: 443.8, y: 747.7, angle: 244, quadrant: 3 },
  { id: '36', type: 'molar', x: 457.6, y: 694.7, angle: 260, quadrant: 3 },
  { id: '37', type: 'molar', x: 459.4, y: 642.6, angle: 275, quadrant: 3 },
  { id: '38', type: 'molar', x: 450.4, y: 591.6, angle: 290, quadrant: 3 },
  { id: '41', type: 'lower_incisor', x: 283.3, y: 858.9, angle: -186, quadrant: 4 },
  { id: '42', type: 'lower_incisor', x: 250.6, y: 850.2, angle: -198, quadrant: 4 },
  { id: '43', type: 'canine', x: 215.2, y: 829.6, angle: -212, quadrant: 4 },
  { id: '44', type: 'premolar', x: 181.1, y: 793.8, angle: -228, quadrant: 4 },
  { id: '45', type: 'premolar', x: 156.2, y: 747.7, angle: -244, quadrant: 4 },
  { id: '46', type: 'molar', x: 142.4, y: 694.7, angle: -260, quadrant: 4 },
  { id: '47', type: 'molar', x: 140.6, y: 642.6, angle: -275, quadrant: 4 },
  { id: '48', type: 'molar', x: 149.6, y: 591.6, angle: -290, quadrant: 4 },
];

export function Odontogram({ selectedTeeth = [], onToothClick, toothColors = {}, disabledTeeth = [], readOnly = false, className = '' }: OdontogramProps) {
  
  const renderTooth = (tooth: ToothDef) => {
    const isUpper = tooth.quadrant === 1 || tooth.quadrant === 2;
    const distance = 40;
    const rad = tooth.angle * (Math.PI / 180);
    const dx = distance * Math.sin(rad);
    const dy = distance * -Math.cos(rad);

    const isSelected = selectedTeeth.includes(tooth.id);
    const customColor = toothColors[tooth.id];
    const isDisabled = disabledTeeth.includes(tooth.id) || readOnly;

    return (
      <g 
        key={tooth.id}
        id={`tooth-${tooth.id}`}
        className={`tooth-group ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
        transform={`translate(${tooth.x}, ${tooth.y})`}
        onClick={() => !isDisabled && onToothClick?.(tooth.id)}
      >
        <g transform={`rotate(${tooth.angle})`}>
          <path 
            className="tooth-body" 
            d={toothPaths[tooth.type].body} 
            style={customColor ? { fill: customColor, opacity: 0.8 } : undefined}
          />
          {toothPaths[tooth.type].sulcus && (
            <path 
              className="tooth-sulcus" 
              d={toothPaths[tooth.type].sulcus}
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
    <svg viewBox="100 0 400 900" className={`w-full h-auto max-h-[80vh] max-w-lg mx-auto ${className}`}>

      
      
      
      
      
      
      
      

      
      

      
      

      
      

      
      

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
