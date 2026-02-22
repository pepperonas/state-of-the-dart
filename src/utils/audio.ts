// Audio system for dart sounds and announcements

class AudioSystem {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7; // Master volume (deprecated, kept for backward compatibility)
  private callerVolume: number = 0.7;
  private effectsVolume: number = 0.7;
  private audioContext: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private soundQueue: string[] = [];
  private isPlaying: boolean = false;

  constructor() {
    this.preloadSounds();
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window === 'undefined') return;
    
    try {
      // Create AudioContext (for iOS/Safari compatibility)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Unlock audio on first user interaction
      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            this.isUnlocked = true;
            console.log('✅ Audio system unlocked');
          });
        }
        
        // Remove listeners after first interaction
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('click', unlockAudio);
      };
      
      document.addEventListener('touchstart', unlockAudio, false);
      document.addEventListener('touchend', unlockAudio, false);
      document.addEventListener('click', unlockAudio, false);
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }
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

  private async playSoundImmediate(soundPath: string): Promise<void> {
    if (!this.enabled) {
      console.log('🔇 Audio disabled, skipping:', soundPath);
      return;
    }
    
    // Resume AudioContext if suspended (iOS/Safari fix)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
    
    try {
      const audio = await this.loadSound(soundPath);
      if (!audio) {
        console.warn('❌ Audio element not loaded:', soundPath);
        return;
      }
      
      // Stop any currently playing instance of this sound
      audio.currentTime = 0;
      audio.volume = this.getVolumeForSound(soundPath);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('✅ Finished playing:', soundPath);
          resolve();
        };
        
        audio.onerror = () => {
          console.warn('❌ Error playing:', soundPath);
          reject();
        };
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🔊 Playing sound:', soundPath);
            })
            .catch((error) => {
              // Handle autoplay restrictions
              if (error.name === 'NotAllowedError') {
                console.warn('⚠️ Audio blocked by browser autoplay policy. User interaction required.');
              } else if (error.name === 'NotSupportedError') {
                console.warn('⚠️ Audio format not supported:', soundPath);
              } else {
                console.warn('❌ Failed to play sound:', soundPath, error);
              }
              reject(error);
            });
        }
      });
    } catch (error) {
      console.warn('❌ Error in playSound:', soundPath, error);
      throw error;
    }
  }

  private async processQueue() {
    if (this.isPlaying || this.soundQueue.length === 0) {
      return;
    }
    
    this.isPlaying = true;
    
    while (this.soundQueue.length > 0) {
      const soundPath = this.soundQueue.shift();
      if (soundPath) {
        try {
          await this.playSoundImmediate(soundPath);
          // Small delay between sounds
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('Error playing queued sound:', error);
        }
      }
    }
    
    this.isPlaying = false;
  }

  async playSound(soundPath: string, priority: boolean = false) {
    if (!this.enabled) {
      console.log('🔇 Audio disabled');
      return;
    }
    
    if (priority) {
      // High priority sounds (checkout, bust) - play immediately and clear queue
      this.soundQueue = [];
      this.isPlaying = false;
      try {
        await this.playSoundImmediate(soundPath);
      } catch (error) {
        console.warn('Failed to play priority sound:', error);
      }
    } else {
      // Normal sounds - add to queue
      this.soundQueue.push(soundPath);
      this.processQueue();
    }
  }

  speak(text: string, language: 'en' | 'de' = 'en') {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = this.callerVolume; // Use caller volume for speech
    
    speechSynthesis.speak(utterance);
  }

  announceScore(score: number) {
    // Play only caller sound for the score - no speech synthesis
    // Check if file exists, fallback to 0 if not
    const soundPath = `/sounds/caller/${score}.mp3`;
    this.playSound(soundPath, false);
  }

  announceRemaining(remaining: number, isCurrentPlayer: boolean = true) {
    // Announce remaining score
    // "You require X" for current player, "Requires X" for opponent
    if (remaining <= 0 || remaining > 170) return; // Only announce checkout ranges

    // Skip bogey numbers (impossible checkouts) — sound files don't exist
    const bogeyNumbers = [169, 168, 166, 165, 163, 162, 159];
    if (bogeyNumbers.includes(remaining)) return;

    const soundPath = isCurrentPlayer
      ? `/sounds/yourequire/${remaining}.mp3`
      : `/sounds/requires/${remaining}.mp3`;

    this.playSound(soundPath, false);
  }

  async announceCheckout(score: number, finishType: 'leg' | 'set' | 'match' = 'leg') {
    // Clear queue and play checkout sequence
    this.soundQueue = [];
    this.isPlaying = false;
    
    // Play checkout sound based on finish type
    const scorePath = finishType === 'leg' 
      ? `/sounds/gameshot/legs/${score}.mp3`
      : finishType === 'set'
      ? `/sounds/gameshot/sets/${score}.mp3`
      : `/sounds/gameshot/legs/${score}.mp3`; // Fallback to legs sound
    
    // Determine finish announcement
    const finishPath = finishType === 'match'
      ? '/sounds/texts/gameshotandthematch.mp3'
      : finishType === 'set'
      ? '/sounds/texts/gameshot.mp3'
      : '/sounds/texts/gameshot.mp3';
    
    try {
      // Play score first (e.g. "Forty", "One Hundred and Twenty")
      await this.playSoundImmediate(scorePath);
      // Small delay between sounds
      await new Promise(resolve => setTimeout(resolve, 400));
      // Then play "Game Shot" announcement
      await this.playSoundImmediate(finishPath);
    } catch (error) {
      console.warn('Failed to play checkout announcement:', error);
    }
  }

  announceBust() {
    // Play bust sound - HIGH PRIORITY
    this.playSound('/sounds/caller/0.mp3', true); // Priority sound!
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume / 100));
    // Set both caller and effects to the same volume (for backward compatibility)
    this.callerVolume = this.volume;
    this.effectsVolume = this.volume;
    // Update volume for all cached audio elements
    this.audioCache.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  setCallerVolume(volume: number) {
    this.callerVolume = Math.max(0, Math.min(1, volume / 100));
  }

  setEffectsVolume(volume: number) {
    this.effectsVolume = Math.max(0, Math.min(1, volume / 100));
  }

  getCallerVolume(): number {
    return this.callerVolume * 100;
  }

  getEffectsVolume(): number {
    return this.effectsVolume * 100;
  }

  private getVolumeForSound(path: string): number {
    // Determine if this is a caller sound or an effect
    if (path.includes('/caller/') || path.includes('/gameshot/') || path.includes('/yourequire/') || path.includes('/requires/')) {
      return this.callerVolume;
    } else if (path.includes('/effects/') || path.includes('/OMNI/')) {
      return this.effectsVolume;
    }
    // Default to effects volume
    return this.effectsVolume;
  }

  // Test method to verify audio is working
  async testSound() {
    console.log('🎵 Testing audio system...');
    console.log('  - Enabled:', this.enabled);
    console.log('  - Volume:', this.volume);
    console.log('  - AudioContext state:', this.audioContext?.state);
    console.log('  - Unlocked:', this.isUnlocked);
    
    await this.playSound('/sounds/caller/100.mp3');
  }

  // Check if audio system is ready
  isReady(): boolean {
    return this.enabled && (this.audioContext?.state === 'running' || this.audioContext === null);
  }

  // Additional sound effects
  playGameEffect(effectName: 'get_ready' | 'accepted_invite' | 'declined_invite' | 'incoming_invite') {
    this.playSound(`/sounds/effects/${effectName}.mp3`);
  }

  // Play achievement unlock sound based on tier
  playAchievementSound(tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond') {
    if (!this.enabled) return;
    // Use pop-success for all tiers (higher tiers play at slightly higher volume)
    const tierVolumes: Record<string, number> = {
      bronze: 0.5,
      silver: 0.6,
      gold: 0.7,
      platinum: 0.8,
      diamond: 0.9,
    };
    // Play the sound effect
    this.playSound('/sounds/OMNI/pop-success.mp3', tier === 'diamond' || tier === 'platinum');
  }

  // Play dart hit sound (using a random number sound for variety)
  playDartHit() {
    const randomScore = Math.floor(Math.random() * 26) + 1; // 1-26 for single hits
    this.playSound(`/sounds/caller/${randomScore}.mp3`);
  }
}

export const audioSystem = new AudioSystem();
export default audioSystem;