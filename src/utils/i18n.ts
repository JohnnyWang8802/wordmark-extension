// Bilingual text: English + Simplified Chinese

const translations: Record<string, Record<string, string>> = {
  // Header
  'app.title': { en: 'WordMark', zh: 'WordMark' },
  'app.subtitle': { en: 'Daily Vocabulary', zh: '每日生词本' },
  'nav.today': { en: 'Today', zh: '今天' },
  'nav.history': { en: 'History', zh: '历史' },
  'nav.review': { en: 'Review', zh: '复习' },
  'nav.settings': { en: 'Settings', zh: '设置' },

  // Stats
  'stats.total': { en: 'Total', zh: '总计' },
  'stats.thisWeek': { en: 'This Week', zh: '本周' },
  'stats.mastered': { en: 'Mastered', zh: '已掌握' },
  'stats.reviewDue': { en: 'Due Review', zh: '待复习' },

  // Word Card
  'card.context': { en: 'Context', zh: '上下文' },
  'card.source': { en: 'Source', zh: '来源' },
  'card.mastered': { en: 'Mastered', zh: '已掌握' },
  'card.markMastered': { en: 'Mark Mastered', zh: '标记已掌握' },
  'card.unmaster': { en: 'Unmaster', zh: '取消掌握' },
  'card.delete': { en: 'Delete', zh: '删除' },
  'card.confirmDelete': { en: 'Confirm delete', zh: '确认删除' },
  'card.tags': { en: 'Tags', zh: '标签' },
  'card.addTag': { en: 'Add tag...', zh: '添加标签...' },

  // Today
  'today.empty': { en: 'No words saved today. Start reading!', zh: '今天还没有保存单词，开始阅读吧！' },
  'today.tip': { en: 'Double-click any word on a webpage to look it up.', zh: '在网页上双击任意单词即可查询。' },
  'today.words': { en: "Today's Words", zh: '今日单词' },

  // History
  'history.empty': { en: 'No saved words yet.', zh: '还没有保存的单词。' },
  'history.words': { en: 'words', zh: '个单词' },

  // Review
  'review.empty': { en: 'No words due for review today!', zh: '今天没有需要复习的单词！' },
  'review.gotIt': { en: 'Got it', zh: '记住' },
  'review.again': { en: 'Forgot', zh: '忘记' },
  'review.hard': { en: 'Hard', zh: '模糊' },
  'review.front': { en: 'Click to reveal', zh: '点击显示' },
  'review.rhythm': { en: 'then rate: Forgot · Hard · Got it', zh: '然后评估：忘记 · 模糊 · 记住' },
  'review.complete': { en: 'Review complete!', zh: '复习完成！' },
  'review.progress': { en: 'of', zh: '/' },
  'review.title': { en: 'Review Mode', zh: '复习模式' },

  // Settings
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.reminder': { en: 'Daily Review Reminder', zh: '每日复习提醒' },
  'settings.accent': { en: 'Default Pronunciation', zh: '默认发音' },
  'settings.accentUS': { en: 'American English', zh: '美式英语' },
  'settings.accentUK': { en: 'British English', zh: '英式英语' },
  'settings.highlight': { en: 'Highlight saved words on pages', zh: '在网页上标记已保存的单词' },
  'settings.language': { en: 'Interface Language', zh: '界面语言' },
  'settings.theme': { en: 'Theme', zh: '主题' },
  'settings.themeSystem': { en: 'System', zh: '跟随系统' },
  'settings.themeLight': { en: 'Light', zh: '浅色' },
  'settings.themeDark': { en: 'Dark', zh: '深色' },
  'settings.data': { en: 'Data Management', zh: '数据管理' },
  'settings.export': { en: 'Export', zh: '导出' },
  'settings.import': { en: 'Import', zh: '导入' },
  'settings.clearAll': { en: 'Clear All Data', zh: '清除所有数据' },
  'settings.saved': { en: 'Settings saved', zh: '设置已保存' },

  // Export
  'export.title': { en: 'Export Vocabulary', zh: '导出词汇' },
  'export.json': { en: 'JSON (Full backup)', zh: 'JSON（完整备份）' },
  'export.csv': { en: 'CSV (Spreadsheet)', zh: 'CSV（表格）' },
  'export.anki': { en: 'Anki (Flashcards)', zh: 'Anki（闪卡）' },
  'export.download': { en: 'Download', zh: '下载' },

  // Data management
  'data.importFailed': { en: 'Import failed: invalid file format', zh: '导入失败：文件格式无效' },
  'data.importInvalidWords': { en: 'Import failed: word entries are incomplete', zh: '导入失败：单词条目不完整' },
  'data.importing': { en: 'Importing...', zh: '导入中...' },
  'data.imported': { en: 'Imported {0} new words!', zh: '已导入 {0} 个新单词！' },
  'data.jsonExported': { en: 'JSON exported!', zh: 'JSON 已导出！' },
  'data.csvExported': { en: 'CSV exported!', zh: 'CSV 已导出！' },
  'data.ankiExported': { en: 'Anki file exported!', zh: 'Anki 文件已导出！' },
  'data.cleared': { en: 'All data cleared.', zh: '所有数据已清除。' },
  'data.clearConfirm': { en: 'Are you sure? This will delete ALL saved words and settings.', zh: '确定吗？这将删除所有已保存的单词和设置。' },

  // Search
  'search.placeholder': { en: 'Search words...', zh: '搜索单词...' },

  // Manual add
  'add.button': { en: 'Add word', zh: '手动添加' },
  'add.placeholder': { en: 'Type a word and press Enter...', zh: '输入单词后按回车...' },
  'add.looking': { en: 'Looking up...', zh: '查询中...' },
  'add.notFound': { en: 'Word not found in dictionary.', zh: '未在词典中找到该单词。' },
  'add.failed': { en: 'Failed to add word.', zh: '添加失败。' },
  'add.duplicate': { en: 'Word already saved today.', zh: '今日已保存该单词。' },

  // Common
  'common.save': { en: 'Save', zh: '保存' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.close': { en: 'Close', zh: '关闭' },
  'common.clear': { en: 'Clear', zh: '清除' },
  'common.loading': { en: 'Loading...', zh: '加载中...' },
};

let currentLang: 'en' | 'zh' = 'zh';

export function setLanguage(lang: 'en' | 'zh') {
  currentLang = lang;
}

export function getLanguage(): 'en' | 'zh' {
  return currentLang;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry['en'] || key;
}
