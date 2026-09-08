import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { BioLink, BioSettings } from '../types';

const BIO_SETTINGS_DOC = 'system_settings/bio_page';

export const getBioSettings = async (): Promise<BioSettings> => {
  try {
    const docRef = doc(db, BIO_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as BioSettings;
    }
    
    // Default fallback
    return {
      links: [
        { id: '1', label: 'Acessar Web App', url: 'https://labprox.com.br', type: 'web', isActive: true, order: 1 },
        { id: '2', label: 'Baixar na Play Store', url: '', type: 'playstore', isActive: true, order: 2 },
        { id: '3', label: 'Baixar na App Store', url: '', type: 'appstore', isActive: true, order: 3 },
        { id: '4', label: 'Instagram', url: 'https://instagram.com/labprox', type: 'instagram', isActive: true, order: 4 },
        { id: '5', label: 'WhatsApp', url: '', type: 'whatsapp', isActive: true, order: 5 },
        { id: '6', label: 'YouTube', url: '', type: 'youtube', isActive: true, order: 6 },
      ]
    };
  } catch (error) {
    console.error('Error fetching bio settings:', error);
    throw error;
  }
};

export const updateBioSettings = async (settings: BioSettings): Promise<void> => {
  try {
    const docRef = doc(db, BIO_SETTINGS_DOC);
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating bio settings:', error);
    throw error;
  }
};
