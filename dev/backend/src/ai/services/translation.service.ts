import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestrator } from './ai-orchestrator.service';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
};

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private aiOrchestrator: AIOrchestrator) {}

  /**
   * Translate text to target language
   */
  async translate(
    text: string,
    targetLanguage: SupportedLanguage,
    sourceLanguage: SupportedLanguage = 'en',
  ): Promise<string> {
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    this.logger.log(`Translating from ${sourceLanguage} to ${targetLanguage}`);

    const prompt = `Translate the following text from ${LANGUAGE_NAMES[sourceLanguage]} to ${LANGUAGE_NAMES[targetLanguage]}. Maintain the same tone and formality. Only return the translation, nothing else.\n\nText to translate:\n${text}`;

    try {
      const response = await this.aiOrchestrator.generate({
        type: 'tutor',
        prompt,
        temperature: 0.3, // Lower temperature for more consistent translations
        maxTokens: Math.ceil(text.length * 1.5), // Estimate token count
      });

      return response.content.trim();
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<SupportedLanguage> {
    const prompt = `Detect the language of the following text. Respond with only the ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar', 'hi').\n\nText:\n${text.substring(0, 200)}`;

    try {
      const response = await this.aiOrchestrator.generate({
        type: 'tutor',
        prompt,
        temperature: 0.1,
        maxTokens: 10,
      });

      const detected = response.content.trim().toLowerCase();
      
      // Validate it's a supported language
      if (this.isSupportedLanguage(detected)) {
        return detected as SupportedLanguage;
      }

      // Default to English if detection fails
      this.logger.warn(`Unsupported language detected: ${detected}, defaulting to English`);
      return 'en';
    } catch (error) {
      this.logger.error(`Language detection failed: ${error.message}`);
      return 'en'; // Default to English on error
    }
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      code: code as SupportedLanguage,
      name,
    }));
  }

  /**
   * Check if language code is supported
   */
  isSupportedLanguage(code: string): boolean {
    return code in LANGUAGE_NAMES;
  }

  /**
   * Translate tutor response to user's preferred language
   */
  async translateResponse(
    response: string,
    targetLanguage: SupportedLanguage,
  ): Promise<string> {
    if (targetLanguage === 'en') {
      return response; // No translation needed
    }

    return this.translate(response, targetLanguage, 'en');
  }

  /**
   * Translate user message to English for processing
   */
  async translateToEnglish(
    message: string,
    sourceLanguage?: SupportedLanguage,
  ): Promise<string> {
    // Detect language if not provided
    const lang = sourceLanguage || await this.detectLanguage(message);
    
    if (lang === 'en') {
      return message; // Already in English
    }

    return this.translate(message, 'en', lang);
  }
}
