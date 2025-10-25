/**
 * AudioManager class
 * Manages audio playback using HTMLAudioElement with event handling
 * and integration with the platform's audio caching system
 */

/**
 * Event handler type for audio events
 */
type AudioEventHandler = (event?: Event) => void;

/**
 * AudioManager class
 * Wraps HTMLAudioElement to provide a clean interface for audio playback
 */
export class AudioManager {
  private audio: HTMLAudioElement;
  private currentTrackUrl: string | null = null;
  private eventHandlers: Map<string, AudioEventHandler[]> = new Map();
  private pendingPlayPromise: Promise<void> | null = null;
  private isLoadingTrack: boolean = false;

  constructor() {
    this.audio = new Audio();
    this.setupEventListeners();
  }

  /**
   * Set up internal event listeners on the audio element
   */
  private setupEventListeners(): void {
    // Track ended event
    this.audio.addEventListener('ended', this.handleEnded);
    
    // Time update event for progress tracking
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    
    // Error event for playback errors
    this.audio.addEventListener('error', this.handleError);
    
    // Loaded metadata event for duration
    this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);
  }

  /**
   * Handle track end event
   */
  private handleEnded = (event: Event): void => {
    this.emit('ended', event);
  };

  /**
   * Handle time update event
   */
  private handleTimeUpdate = (event: Event): void => {
    this.emit('timeupdate', event);
  };

  /**
   * Handle error event
   */
  private handleError = (event: Event): void => {
    this.emit('error', event);
  };

  /**
   * Handle loaded metadata event
   */
  private handleLoadedMetadata = (event: Event): void => {
    this.emit('loadedmetadata', event);
  };

  /**
   * Register an event handler
   * @param event - The event name
   * @param handler - The handler function
   */
  public on(event: string, handler: AudioEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister an event handler
   * @param event - The event name
   * @param handler - The handler function to remove
   */
  public off(event: string, handler: AudioEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   * @param event - The event name
   * @param eventData - Optional event data
   */
  private emit(event: string, eventData?: Event): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(eventData));
    }
  }

  /**
   * Load a track for playback
   * Note: In the future, this will integrate with getCachedAudioUrl
   * For now, it directly uses the provided URL
   * @param audioUrl - The audio URL to load
   */
  public async loadTrack(audioUrl: string): Promise<void> {
    try {
      // Wait for any pending play promise to resolve/reject before loading new track
      if (this.pendingPlayPromise) {
        try {
          await this.pendingPlayPromise;
        } catch {
          // Ignore errors from previous play attempt
        }
        this.pendingPlayPromise = null;
      }
      
      // Pause current playback to prevent interruption errors
      this.audio.pause();
      
      // Set loading flag
      this.isLoadingTrack = true;
      
      // TODO: Integrate with getCachedAudioUrl when available
      // const cachedUrl = await getCachedAudioUrl(audioUrl);
      // this.audio.src = cachedUrl;
      
      // For now, use the URL directly
      this.audio.src = audioUrl;
      this.currentTrackUrl = audioUrl;
      
      // Preload the audio
      this.audio.load();
      
      // Wait for the audio to be ready to play
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = (): void => {
          this.audio.removeEventListener('canplay', handleCanPlay);
          this.audio.removeEventListener('error', handleError);
          this.isLoadingTrack = false;
          resolve();
        };
        
        const handleError = (event: Event): void => {
          this.audio.removeEventListener('canplay', handleCanPlay);
          this.audio.removeEventListener('error', handleError);
          this.isLoadingTrack = false;
          reject(event);
        };
        
        this.audio.addEventListener('canplay', handleCanPlay, { once: true });
        this.audio.addEventListener('error', handleError, { once: true });
      });
    } catch (error) {
      this.isLoadingTrack = false;
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  /**
   * Play the loaded audio
   * @returns Promise that resolves when playback starts
   */
  public async play(): Promise<void> {
    try {
      // Wait for any pending load to complete
      if (this.isLoadingTrack) {
        console.log('Waiting for track to finish loading...');
        // Wait a bit for the load to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Store the play promise so we can wait for it in loadTrack
      this.pendingPlayPromise = this.audio.play();
      await this.pendingPlayPromise;
      this.pendingPlayPromise = null;
    } catch (error) {
      this.pendingPlayPromise = null;
      // Only log non-abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to play audio:', error);
      }
      throw error;
    }
  }

  /**
   * Pause the audio playback
   */
  public pause(): void {
    this.audio.pause();
  }

  /**
   * Seek to a specific position in the audio
   * @param position - The position in seconds
   */
  public seek(position: number): void {
    if (position >= 0 && position <= this.audio.duration) {
      this.audio.currentTime = position;
    }
  }

  /**
   * Get the current playback position
   * @returns The current time in seconds
   */
  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * Get the total duration of the audio
   * @returns The duration in seconds
   */
  public getDuration(): number {
    return this.audio.duration || 0;
  }

  /**
   * Get the current track URL
   * @returns The current track URL or null
   */
  public getCurrentTrackUrl(): string | null {
    return this.currentTrackUrl;
  }

  /**
   * Check if audio is currently playing
   * @returns True if playing, false otherwise
   */
  public isPlaying(): boolean {
    return !this.audio.paused;
  }

  /**
   * Check if a track is currently loading
   * @returns True if loading, false otherwise
   */
  public isLoading(): boolean {
    return this.isLoadingTrack;
  }

  /**
   * Set the volume
   * @param volume - Volume level between 0 and 1
   */
  public setVolume(volume: number): void {
    if (volume >= 0 && volume <= 1) {
      this.audio.volume = volume;
    }
  }

  /**
   * Get the current volume
   * @returns Volume level between 0 and 1
   */
  public getVolume(): number {
    return this.audio.volume;
  }

  /**
   * Clean up resources and remove event listeners
   */
  public destroy(): void {
    // Pause and clear the audio
    this.audio.pause();
    this.audio.src = '';
    
    // Remove event listeners
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.removeEventListener('error', this.handleError);
    this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    // Clear current track URL
    this.currentTrackUrl = null;
  }
}
