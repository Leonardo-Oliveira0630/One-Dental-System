import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Só inicializa se o ID estiver configurado
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    
    if (measurementId && measurementId !== 'G-XXXXXXXXXX') {
      if (!ReactGA.isInitialized) {
        ReactGA.initialize(measurementId);
      }
      
      // Envia evento de pageview sempre que a rota mudar
      ReactGA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });
    }
  }, [location]);
};
