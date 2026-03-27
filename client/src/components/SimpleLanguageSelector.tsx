import React, { useState, useEffect } from 'react';
import type { Language } from '../utils/translations';
import { getCurrentLanguage, setCurrentLanguage, getTranslation } from '../utils/translations';

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'es', label: 'Espanol', flag: '🇪🇸' },
];

interface SimpleLanguageSelectorProps {
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SimpleLanguageSelector: React.FC<SimpleLanguageSelectorProps> = () => {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage);
  const t = (key: string) => getTranslation(key as any, language);
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguageState(lang);
    setCurrentLanguage(lang);
    setIsOpen(false);
    // Reload to apply language change
    window.location.reload();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentLang = languageOptions.find(l => l.code === language) || languageOptions[0];

  return (
    <div className="language-selector">
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('languageSelector.selectLanguage')}
        title={t('languageSelector.language')}
      >
        <span className="language-flag">{currentLang.flag}</span>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <div className="language-dropdown-header">{t('languageSelector.language')}</div>
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${language === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-label">{lang.label}</span>
              {language === lang.code && <span className="language-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleLanguageSelector;
