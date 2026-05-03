import type { DefinitionSource, VocabDefinition } from '../types';
import { t } from './i18n';

export function sourceLabel(source: DefinitionSource | undefined): string {
  switch (source) {
    case 'ai':
      return t('source.ai');
    case 'free-translation':
      return t('source.freeTranslation');
    case 'dictionary':
    default:
      return t('source.dictionary');
  }
}

export function getDefinitionSourceLabels(definition: VocabDefinition): string[] {
  const definitionSource = definition.source || 'dictionary';
  const labels = [`${t('source.definition')}: ${sourceLabel(definitionSource)}`];
  if (definition.meaningZh) {
    const translationSource = definition.translationSource || (definitionSource === 'ai' ? 'ai' : 'free-translation');
    labels.push(`${t('source.translation')}: ${sourceLabel(translationSource)}`);
  }
  return labels;
}
