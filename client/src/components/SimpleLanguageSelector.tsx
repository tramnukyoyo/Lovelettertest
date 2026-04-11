import React, { useState, useEffect } from 'react';
import { GB, DE, ES } from 'country-flag-icons/react/3x2';
import type { Language } from '../utils/translations';
import { getCurrentLanguage, setCurrentLanguage, getTranslation } from '../utils/translations';

// Match country-flag-icons's own exported type shape — avoids SVGProps<SVGSVGElement>
// vs HTMLSVGElement (HTMLElement & SVGElement) contravariance mismatch.
type FlagComponent = typeof GB;

const languageOptions: { code: Language; label: string; Flag: FlagComponent }[] = [
  { code: 'en', label: 'English', Flag: GB },
  { code: 'de', label: 'Deutsch', Flag: DE },
  { code: 'es', label: 'Español', Flag: ES },
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
  };

  // Sync language state when changed from another component
  useEffect(() => {
    const sync = () => setLanguageState(getCurrentLanguage());
    window.addEventListener('languagechange', sync);
    return () => window.removeEventListener('languagechange', sync);
  }, []);

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
  const CurrentFlag = currentLang.Flag;

  return (
    <div className="language-selector">
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('languageSelector.selectLanguage')}
        title={t('languageSelector.language')}
      >
        <CurrentFlag className="language-flag" title={currentLang.label} width={26} height={18} />
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <div className="language-dropdown-header">{t('languageSelector.language')}</div>
          {languageOptions.map((lang) => {
            const LangFlag = lang.Flag;
            return (
              <button
                key={lang.code}
                className={`language-option ${language === lang.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <LangFlag className="language-flag" title={lang.label} width={24} height={16} />
                <span className="language-label">{lang.label}</span>
                {language === lang.code && <span className="language-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimpleLanguageSelector;
