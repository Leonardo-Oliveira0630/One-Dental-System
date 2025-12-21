
import React, { useState, Suspense, useEffect, ReactNode } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Html, useProgress, Center } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { Attachment } from '../types';
import { Eye, EyeOff, Layers, X, Box, Sun, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';

// Define R3F elements as any to avoid TypeScript errors with IntrinsicElements
const Mesh = 'mesh' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const Color = 'color' as any;

// --- Error Boundary for 3D Loading ---
interface ViewerErrorBoundaryProps {
  children?: ReactNode;
}

interface ViewerErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

// Fixed ViewerErrorBoundary by using React.Component explicitly to ensure property access for state and props.
class ViewerErrorBoundary extends React.Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  constructor(props: ViewerErrorBoundaryProps) {
    super(props);
    // Properly initializing state property inherited from Component
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any): ViewerErrorBoundaryState {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("STL Viewer Error:", error, errorInfo);
  }

  render() {
    // Accessing this.state inherited from Component
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center bg-slate-900">
          <div className="bg-red-500/20 p-4 rounded-full mb-4">
             <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Não foi possível carregar o modelo 3D</h2>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            O navegador bloqueou o carregamento do arquivo. Isso geralmente ocorre devido a restrições de segurança (CORS) no servidor de arquivos.
          </p>
          <div className="bg-slate-800 p-4 rounded-xl text-left border border-slate-700 text-xs text-slate-300 w-full max-w-lg">
             <p className="font-bold text-yellow-500 mb-2">Dica Técnica para o Administrador:</p>
             <p>Configure o CORS no Firebase Storage para permitir requisições deste domínio.</p>
             <code className="block bg-black p-2 mt-2 rounded font-mono text-green-400">
               [<br/>
               &nbsp;&nbsp;{'{'}<br/>
               &nbsp;&nbsp;&nbsp;&nbsp;"origin": ["*"],<br/>
               &nbsp;&nbsp;&nbsp;&nbsp;"method": ["GET"],<br/>
               &nbsp;&nbsp;&nbsp;&nbsp;"maxAgeSeconds": 3600<br/>
               &nbsp;&nbsp;{'}'}<br/>
               ]
             </code>
          </div>
        </div>
      );
    }

    // Accessing this.props inherited from Component
    return this.props.children;
  }
}

// --- Componente Individual de Malha (Mesh) ---
interface ModelProps {
  url: string;
  color: string;
  opacity: number;
  visible: boolean;
}

const Model: React.FC<ModelProps> = ({ url, color, opacity, visible }) => {
  // Carrega o STL
  const geometry = useLoader(STLLoader, url);

  // Computa normais e CENTRALIZA a geometria (Correção para scanners intraorais)
  useEffect(() => {
    if (geometry) {
      // Scanners odontológicos muitas vezes têm coordenadas distantes da origem.
      // geometry.center() move o objeto para (0,0,0) localmente.
      geometry.center(); 
      
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
    }
  }, [geometry]);

  return (
    <Mesh geometry={geometry} visible={visible} castShadow receiveShadow>
      <MeshStandardMaterial 
        color={color} 
        roughness={0.5} 
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide} // Renderiza interior e exterior
      />
    </Mesh>
  );
};

// --- Loader Visual ---
const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-lg">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-sm font-bold text-slate-700">{progress.toFixed(0)}% Carregando...</p>
      </div>
    </Html>
  );
};

interface STLViewerProps {
  files: Attachment[];
  onClose: () => void;
}

interface MeshConfig {
  id: string;
  name: string;
  color: string;
  opacity: number;
  visible: boolean;
}

const DEFAULT_COLORS = ['#e2e8f0', '#fca5a5', '#93c5fd', '#86efac', '#fde047'];

export const STLViewer: React.FC<STLViewerProps> = ({ files, onClose }) => {
  // Filtra apenas arquivos STL
  const stlFiles = files.filter(f => f.name.toLowerCase().endsWith('.stl'));
  
  // Estado de configuração de cada malha
  const [meshes, setMeshes] = useState<MeshConfig[]>(() => 
    stlFiles.map((f, index) => ({
      id: f.url, // Usa URL como ID único temporário
      name: f.name,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length], // Cores cíclicas
      opacity: 1,
      visible: true
    }))
  );

  const [showControls, setShowControls] = useState(true);

  const updateMesh = (id: string, updates: Partial<MeshConfig>) => {
    setMeshes(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  if (stlFiles.length === 0) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center text-white">
            <div className="text-center">
                <p className="text-xl mb-4">Nenhum arquivo STL encontrado neste pedido.</p>
                <button onClick={onClose} className="px-4 py-2 bg-white text-black rounded font-bold">Fechar</button>
            </div>
        </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex">
      {/* 3D Canvas Area */}
      <div className="flex-1 relative h-full">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
        >
            <X size={24} />
        </button>

        {/* Wrapping the Canvas in ViewerErrorBoundary to catch 3D rendering or model loading issues */}
        <ViewerErrorBoundary>
            <Canvas shadows camera={{ position: [0, 0, 100], fov: 50 }}>
            <Color attach="background" args={['#1e293b']} /> {/* Slate-800 Background */}
            
            <Suspense fallback={<Loader />}>
                {/* Stage provides default environment lighting. Center ensures model is in camera focus. */}
                <Stage environment="city" intensity={0.6} adjustCamera={false}>
                    <Center>
                        {meshes.map((mesh) => (
                            <Model 
                                key={mesh.id} 
                                url={mesh.id} // URL is stored in ID field
                                color={mesh.color}
                                opacity={mesh.opacity}
                                visible={mesh.visible}
                            />
                        ))}
                    </Center>
                </Stage>
            </Suspense>
            
            <Grid 
                renderOrder={-1} 
                position={[0, -50, 0]} // Grid below the model
                infiniteGrid 
                cellSize={10} 
                sectionSize={50} 
                fadeDistance={400} 
                sectionColor="#475569" 
                cellColor="#334155" 
            />
            <OrbitControls makeDefault />
            </Canvas>
        </ViewerErrorBoundary>
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none select-none">
            Botão Esq: Rotacionar • Botão Dir: Mover • Scroll: Zoom
        </div>
      </div>

      {/* Controls Sidebar */}
      <div className={`w-80 bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ${showControls ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Box size={20} className="text-blue-600" /> Inspector 3D
            </h3>
            <button onClick={() => setShowControls(!showControls)} className="text-slate-400 hover:text-slate-600">
                {showControls ? <X size={20} /> : <Layers size={20} />}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {meshes.map((mesh) => (
                <div key={mesh.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <button 
                                onClick={() => updateMesh(mesh.id, { visible: !mesh.visible })}
                                className={`p-1.5 rounded-lg ${mesh.visible ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                            >
                                {mesh.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <span className="text-sm font-bold text-slate-700 truncate" title={mesh.name}>{mesh.name}</span>
                        </div>
                        <input 
                            type="color" 
                            value={mesh.color}
                            onChange={(e) => updateMesh(mesh.id, { color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>Opacidade</span>
                            <span>{(mesh.opacity * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="1" 
                            step="0.1" 
                            value={mesh.opacity} 
                            onChange={(e) => updateMesh(mesh.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <p className="flex items-center gap-2 mb-2"><Sun size={14} /> Dicas de Visualização:</p>
            <ul className="list-disc pl-4 space-y-1">
                <li>O modelo foi centralizado automaticamente.</li>
                <li>Use cores contrastantes para antagonistas.</li>
                <li>Reduza opacidade para ver oclusão interna.</li>
            </ul>
        </div>
      </div>
      
      {/* Toggle Button when sidebar closed */}
      {!showControls && (
          <button 
            onClick={() => setShowControls(true)}
            className="absolute top-20 right-4 bg-white p-3 rounded-xl shadow-lg text-slate-600 hover:text-blue-600 z-10"
          >
              <Layers size={24} />
          </button>
      )}
    </div>
  );
};
