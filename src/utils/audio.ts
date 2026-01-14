// Audio system for dart sounds and announcements

class AudioSystem {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    this.preloadSounds();
  }

  private async preloadSounds() {
    // Preload commonly used sounds
    this.preloadSound('/sounds/caller/180.mp3');
    this.preloadSound('/sounds/gameshot/legs/1.mp3');
    this.preloadSound('/sounds/effects/get_ready.mp3');
  }

  private preloadSound(path: string) {
    try {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.audioCache.set(path, audio);
    } catch (error) {
      console.warn('Failed to preload sound:', path, error);
    }
  }

  private async loadSound(path: string): Promise<HTMLAudioElement | null> {
    // Check cache first
    if (this.audioCache.has(path)) {
      return this.audioCache.get(path)!;
    }

    try {
      const audio = new Audio(path);
      audio.volume = this.volume;
      this.audioCache.set(path, audio);
      return audio;
    } catch (error) {
      console.warn('Failed to load sound:', path, error);
      return null;
    }
  }

  async playSound(soundPath: string) {
    if (!this.enabled) return;
    
    try {
      const audio = await this.loadSound(soundPath);
      if (!audio) return;
      
      // Stop any currently playing instance of this sound
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn('Failed to play sound:', soundPath, error);
    }
  }

  speak(text: string, language: 'en' | 'de' = 'en') {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = this.volume;
    
    speechSynthesis.speak(utterance);
  }

  announceScore(score: number) {
    // Play only caller sound for the score - no speech synthesis
    this.playSound(`/sounds/caller/${score}.mp3`);
  }

  announceCheckout(score: number, finishType: 'leg' | 'set' | 'match' = 'leg') {
    // Play only checkout sound based on finish type - no speech synthesis
    const soundPath = finishType === 'leg' 
      ? `/sounds/gameshot/legs/${score}.mp3`
      : `/sounds/gameshot/sets/${score}.mp3`;
    
    this.playSound(soundPath);
  }

  announceBust() {
    // Play only caller sound for bust - no speech synthesis
    this.playSound('/sounds/caller/0.mp3');
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume / 100));
    // Update volume for all cached audio elements
    this.audioCache.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  // Additional sound effects
  playGameEffect(effectName: 'get_ready' | 'accepted_invite' | 'declined_invite' | 'incoming_invite') {
    this.playSound(`/sounds/effects/${effectName}.mp3`);
  }

  // Play dart hit sound (using a random number sound for variety)
  playDartHit() {
    const randomScore = Math.floor(Math.random() * 26) + 1; // 1-26 for single hits
    this.playSound(`/sounds/caller/${randomScore}.mp3`);
  }
}

export const audioSystem = new AudioSystem();
export default audioSystem;