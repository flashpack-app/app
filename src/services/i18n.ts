import * as Localization from 'expo-localization';
import en from './translations/en.json';
import tr from './translations/tr.json';
import es from './translations/es.json';
import jp from './translations/jp.json';
import de from './translations/de.json';
import ru from './translations/ru.json';
import fr from './translations/fr.json';
import ko from './translations/ko.json';
import zh from './translations/zh.json';

const locales = Localization.getLocales();
const deviceLanguage = locales[0]?.languageCode ?? 'en';

const translations = {
  en,
  tr,
  es,
  jp,
  de,
  ru,
  fr,
  ko,
  zh,
};

export type LanguageCode = keyof typeof translations;

const VALID_LANGS = Object.keys(translations) as LanguageCode[];

function resolveLanguage(lang: string): LanguageCode {
  if (VALID_LANGS.includes(lang as LanguageCode)) {
    return lang as LanguageCode;
  }
  return 'en';
}

export let currentLanguage: LanguageCode = resolveLanguage(deviceLanguage);

export function setLanguage(lang: 'system' | LanguageCode) {
  if (lang === 'system') {
    const freshLocales = Localization.getLocales();
    const freshLang = freshLocales[0]?.languageCode ?? 'en';
    currentLanguage = resolveLanguage(freshLang);
  } else {
    currentLanguage = resolveLanguage(lang);
  }
}

export type TranslationKey = keyof typeof en;

export function t(key: TranslationKey, options?: { count?: number; [key: string]: any }): string {
  const dict = translations[currentLanguage] as Record<string, string>;
  const fallbackDict = en as Record<string, string>;
  let template = dict[key] || fallbackDict[key] || key;

  // Handle pluralization keys (suffix _one vs _other)
  if (options?.count !== undefined) {
    const isOne = options.count === 1;
    const suffix = isOne ? 'one' : 'other';
    const pluralKey = `${key}_${suffix}`;
    const pluralTemplate = dict[pluralKey] || fallbackDict[pluralKey];
    if (pluralTemplate) {
      template = pluralTemplate;
    }
  }

  // Handle dynamic parameters e.g., {{username}} or {{count}}
  if (options) {
    let result = template;
    for (const [param, val] of Object.entries(options)) {
      result = result.replace(new RegExp(`{{${param}}}`, 'g'), String(val));
    }
    return result;
  }

  return template;
}
