
import React, { useState, Suspense, useEffect, ReactNode } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Html, useProgress, Center } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { Attachment } from '../types';
import { Eye, EyeOff, Layers, X, Box, Sun, AlertTriangle, Download } from 'lucide-react';
import * as THREE from 'three';
import FileSaver from 'file-saver';

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
  // Explicitly declare state and props to fix TypeScript property access errors
  state: ViewerErrorBoundaryState = { hasError: false, errorMsg: '' };
  props: ViewerErrorBoundaryProps;

  constructor(props: ViewerErrorBoundaryProps) {
    super(props);
    this.props = props;
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

// --- Helper to Proxy URLs to bypass CORS ---
const getProxiedUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/') || url.startsWith(window.location.origin)) {
    return url;
  }
  // Avoid double prefixing
  if (url.includes('corsproxy.io')) {
    return url;
  }
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

// --- Componente Individual de Malha (Mesh) ---
interface ModelProps {
  url: string;
  color: string;
  opacity: number;
  visible: boolean;
}

const Model: React.FC<ModelProps> = ({ url, color, opacity, visible }) => {
  const proxiedUrl = getProxiedUrl(url);
  // Carrega o STL
  const geometry = useLoader(STLLoader, proxiedUrl);

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
  isStale?: boolean;
}

const DEFAULT_COLORS = ['#e2e8f0', '#fca5a5', '#93c5fd', '#86efac', '#fde047'];

export const STLViewer: React.FC<STLViewerProps> = ({ files, onClose }) => {
  // Filtra apenas arquivos STL
  const stlFiles = files.filter(f => f.name.toLowerCase().endsWith('.stl'));
  
  // Estado de configuração de cada malha
  const [meshes, setMeshes] = useState<MeshConfig[]>(() => 
    stlFiles.map((f, index) => {
      const isStale = f.url.startsWith('blob:');
      return {
        id: f.url, // Usa URL como ID único temporário
        name: f.name,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length], // Cores cíclicas
        opacity: 1,
        visible: !isStale,
        isStale: isStale
      };
    })
  );

  const [showControls, setShowControls] = useState(true);

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      FileSaver.saveAs(blob, name);
    } catch (e) {
      console.error("Erro ao baixar pelo Blob. Tentando direto...", e);
      FileSaver.saveAs(url, name);
    }
  };

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

  const allStale = meshes.every(m => m.isStale);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex">
      {/* 3D Canvas Area */}
      <div className="flex-1 relative h-full">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-[110] bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
        >
            <X size={24} />
        </button>

        {/* Warning card overlay for stale (blob:) files */}
        {allStale ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-950/90 z-50">
            <div className="bg-amber-500/10 p-5 rounded-full mb-4">
              <AlertTriangle size={48} className="text-amber-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Arquivos de Visualização Expirados</h3>
            <p className="text-slate-400 text-sm max-w-md mb-2 leading-relaxed">
              Os arquivos associados a esta requisição foram anexados em uma versão anterior usando links temporários locais do navegador, que expiraram ao fechar a página.
            </p>
            <p className="text-blue-400 text-xs max-w-sm font-semibold">
              Por favor, reenvie (upload) os arquivos STL originais acessando os detalhes do pedido ou da requisição.
            </p>
          </div>
        ) : null}

        {/* Wrapping the Canvas in ViewerErrorBoundary to catch 3D rendering or model loading issues */}
        {!allStale && (
          <ViewerErrorBoundary>
              <Canvas shadows camera={{ position: [0, 0, 100], fov: 50 }}>
              <Color attach="background" args={['#1e293b']} /> {/* Slate-800 Background */}
              
              <Suspense fallback={<Loader />}>
                  {/* Stage provides default environment lighting. Center ensures model is in camera focus. */}
                  <Stage environment="city" intensity={0.6} adjustCamera={false}>
                      <Center>
                          {meshes.filter(mesh => !mesh.isStale).map((mesh) => (
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
        )}
        
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {meshes.map((mesh) => (
                <div key={mesh.id} className={`rounded-xl border p-3 shadow-sm transition-colors ${mesh.isStale ? 'bg-red-50/40 border-red-100' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                            {!mesh.isStale ? (
                              <>
                                <button 
                                    onClick={() => updateMesh(mesh.id, { visible: !mesh.visible })}
                                    className={`p-1.5 rounded-lg shrink-0 ${mesh.visible ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                                    title={mesh.visible ? "Ocultar malha" : "Mostrar malha"}
                                >
                                    {mesh.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button 
                                    onClick={() => handleDownload(mesh.id, mesh.name)}
                                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors shrink-0"
                                    title="Baixar arquivo "
                                >
                                    <Download size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="p-1 px-1.5 bg-red-100 border border-red-200 text-red-700 text-[9px] font-black uppercase rounded shrink-0" title="Upload local expirou">
                                Expirado
                              </div>
                            )}
                            <span className={`text-xs font-bold truncate flex-1 ${mesh.isStale ? 'text-red-600 line-through' : 'text-slate-700'}`} title={mesh.name}>{mesh.name}</span>
                        </div>
                        {!mesh.isStale && (
                          <input 
                              type="color" 
                              value={mesh.color}
                              onChange={(e) => updateMesh(mesh.id, { color: e.target.value })}
                              className="w-7 h-7 rounded cursor-pointer border-0 p-0 overflow-hidden shrink-0"
                          />
                        )}
                    </div>
                    
                    {mesh.isStale ? (
                      <p className="text-[9px] text-red-500/80 leading-normal font-medium">
                        Este arquivo STL foi anexado via link local provisório no passado. Reenvie o arquivo real para visualizá-lo.
                      </p>
                    ) : (
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
                    )}
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
