import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="btn-group" role="group">
      <button 
        type="button"
        className={`btn btn-sm ${i18n.language === 'ar' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => changeLanguage('ar')}
      >
        العربية
      </button>
      <button 
        type="button"
        className={`btn btn-sm ${i18n.language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => changeLanguage('en')}
      >
        English
      </button>
    </div>
  );
};

export default LanguageSwitcher;
