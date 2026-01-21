import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Cookies from 'js-cookie';
import pt from './locales/pt.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const savedLanguage = Cookies.get('language') || localStorage.getItem('language') || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: savedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
