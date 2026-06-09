import React from 'react';

// ==========================================
// CONFIGURAÇÃO DA LOGO DO SMILEPROX
// ==========================================
// 1. Se você fez o upload da imagem da LOGO COMPLETA (que já contém o dente E o texto "SmileProX" juntos),
//    substitua as aspas simples de LOGO_COMPLETO_URL pelo seu link. Exemplo: 'https://sua-url-do-firebase.svg'
export const LOGO_COMPLETO_URL: string = ''; 

// 2. Se você fez o upload APENAS do ícone do dente separado e quer que o sistema continue escrevendo
//    o texto "SmileProX" ao lado via código, cole o seu link em LOGO_ICONE_URL abaixo:
export const LOGO_ICONE_URL: string = 'gs://one-dental-system.firebasestorage.app/logo/logoapp.svg'; 
// ==========================================

// Função auxiliar para converter URLs "gs://" do Firebase Storage em links HTTPS públicos que o navegador entende
const getBrowserUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('gs://')) {
    const match = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (match) {
      const bucket = match[1];
      const filePath = match[2];
      const encodedPath = encodeURIComponent(filePath);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    }
  }
  return url;
};

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'colored';
}

export const LogoIcon: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Map friendly size presets to dimensions
  const dimensions = typeof size === 'number' 
    ? size 
    : {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64
      }[size];

  // Se o usuário colou o URL do dente separado, renderiza uma tag img de alta qualidade
  if (LOGO_ICONE_URL) {
    return (
      <img 
        src={getBrowserUrl(LOGO_ICONE_URL)} 
        alt="SmileProX Icon" 
        style={{ width: dimensions, height: dimensions }}
        className={`object-contain shrink-0 ${className}`} 
      />
    );
  }

  return (
    <svg
      width={dimensions}
      height={dimensions}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="SmileProX Logo"
      {...props}
    >
      <defs>
        {/* Deep blue to indigo 3D metallic gradient for the tooth */}
        <linearGradient id="toothGradient" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E4D8C" />
          <stop offset="40%" stopColor="#0F4C81" />
          <stop offset="100%" stopColor="#0B3256" />
        </linearGradient>

        {/* Shiny highlight gradient for the tooth crown */}
        <linearGradient id="toothHighlight" x1="50" y1="15" x2="50" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F4C81" stopOpacity="0" />
        </linearGradient>

        {/* Teal/cyan gradient for the outer orbit crescent */}
        <linearGradient id="orbitGradient" x1="10" y1="75" x2="90" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#00B8D9" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        
        {/* Subtle drop shadow filter for professional depth */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* High-quality styled vector tooth with an exact digital step/notch on the upper-right shoulder */}
      <path
        d="M 32 23
           C 25 23, 23 35, 27 50
           C 30 62, 33 72, 37 77
           C 40 81, 43 75, 45 70
           C 47 62, 49 62, 51 70
           C 53 75, 56 81, 59 77
           C 63 72, 65 60, 67 52
           C 68 45, 68 39, 68 35
           H 61
           V 27
           C 61 24, 57 23, 51 28
           C 47 22, 39 21, 32 23 Z"
        fill="url(#toothGradient)"
        filter="url(#logoShadow)"
      />

      {/* Accurate Tooth Highlight / 3D Detail */}
      <path
        d="M 32 23
           C 27 23, 25 31, 29 42
           C 33 39, 44 38, 51 28
           C 44 23, 37 23, 32 23 Z"
        fill="url(#toothHighlight)"
        opacity="0.8"
      />

      {/* Tech node lines / squares exactly placed according to the logo image */}
      {/* 1. Dark Blue Square nestled in the shoulder notch */}
      <rect x="63" y="29" width="6" height="6" rx="1" fill="#0F4C81" />

      {/* 2. Vibrant Cyan Square flying to the top-right */}
      <rect x="71.5" y="23" width="5.5" height="5.5" rx="1" fill="#00B8D9" />

      {/* 3. Small Cyan Square floating slightly higher */}
      <rect x="71" y="15.5" width="4" height="4" rx="0.5" fill="#00E5FF" />

      {/* Orbit swoosh (The beautiful dynamic cyan/teal ring) */}
      <path
        d="M 16 51
           C 14 56, 24 64, 43 60
           C 62 55, 75 46, 81 37
           C 71 47, 51 55, 36 55
           C 23 55, 18 51, 16 51 Z"
        fill="url(#orbitGradient)"
        filter="url(#logoShadow)"
      />

      {/* Thin secondary dark blue accent sweep below the orbit for shadow-like rotation effect */}
      <path
        d="M 19 60
           C 22 64, 30 67, 39 65
           C 31 65, 23 63, 19 60 Z"
        fill="#0F4C81"
        opacity="0.9"
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'colored', 
  showText = true, 
  className = '',
  ...props
}) => {
  // Determine standard colors for "Smile" and "ProX" parts based on theme variant
  let smileColor = 'text-[#1E293B]'; // Deep slate
  let proXColor = 'text-[#00B8D9]'; // Vibrant teal
  
  if (variant === 'light') {
    smileColor = 'text-white';
    proXColor = 'text-[#00B8D9]';
  } else if (variant === 'dark') {
    smileColor = 'text-slate-100';
    proXColor = 'text-[#00B8D9]';
  } else if (variant === 'colored') {
    smileColor = 'text-[#0F4C81]'; // Primary brand color
    proXColor = 'text-[#00B8D9]'; // Secondary brand color
  }

  // Text sizes corresponding to logo presets
  const textSizes = {
    xs: 'text-sm tracking-tight',
    sm: 'text-lg tracking-tight',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-tight',
    xl: 'text-3xl tracking-tight'
  }[typeof size === 'string' ? size : 'md'];

  // Alturas apropriadas baseadas nos tamanhos da logo
  const wrapperHeight = typeof size === 'number'
    ? size
    : {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 72
      }[size];

  // Se o usuário colou a logo completa com ÍCONE E TEXTO juntos, renderiza apenas o link da imagem
  if (LOGO_COMPLETO_URL) {
    return (
      <div className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
        <img 
          src={getBrowserUrl(LOGO_COMPLETO_URL)} 
          alt="SmileProX Logo" 
          style={{ height: wrapperHeight, width: 'auto' }}
          className="object-contain max-w-full shrink-0"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 overflow-hidden shrink-0 ${className}`}>
      <LogoIcon size={size} {...props} />
      {showText && (
        <span className={`font-black font-display uppercase tracking-tight select-none ${textSizes} leading-none flex items-center`}>
          <span className={smileColor}>Smile</span>
          <span className={proXColor}>ProX</span>
        </span>
      )}
    </div>
  );
};
