// Pronunciation service: Google Translate TTS (primary) → Dictionary API audio → Web Speech API fallback

// Google Translate TTS provides clear, high-quality pronunciation
function getGoogleTTSUrl(word: string, accent: 'us' | 'uk' = 'us'): string {
  const tl = accent === 'uk' ? 'en-GB' : 'en-US';
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=${tl}&client=tw-ob`;
}

export function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Audio playback failed'));
    audio.play().catch(reject);
  });
}

export function speakWord(word: string, accent: 'us' | 'uk' = 'us'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a high-quality matching voice
    const voices = window.speechSynthesis.getVoices();
    const targetLang = accent === 'uk' ? 'en-GB' : 'en-US';

    // Prefer premium/enhanced voices
    const premiumVoice = voices.find(
      (v) => v.lang === targetLang && (v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural'))
    );
    const exactVoice = voices.find((v) => v.lang === targetLang);
    const anyEnVoice = voices.find((v) => v.lang.startsWith('en'));
    const voice = premiumVoice || exactVoice || anyEnVoice;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}

