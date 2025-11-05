export class AudioCues {
  private static audioContext: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private static playTone(frequency: number, duration: number, volume: number = 0.3): void {
    try {
      const context = this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.error('Error playing audio cue:', error);
    }
  }

  static playListeningStart(): void {
    this.playTone(800, 0.1);
    setTimeout(() => this.playTone(1000, 0.1), 100);
  }

  static playListeningStop(): void {
    this.playTone(1000, 0.1);
    setTimeout(() => this.playTone(800, 0.1), 100);
  }

  static playProcessing(): void {
    this.playTone(600, 0.15);
  }

  static playSuccess(): void {
    this.playTone(523.25, 0.1);
    setTimeout(() => this.playTone(659.25, 0.1), 100);
    setTimeout(() => this.playTone(783.99, 0.15), 200);
  }

  static playError(): void {
    this.playTone(400, 0.2);
    setTimeout(() => this.playTone(300, 0.3), 150);
  }

  static playNotification(): void {
    this.playTone(880, 0.1);
    setTimeout(() => this.playTone(1046.5, 0.15), 100);
  }
}
