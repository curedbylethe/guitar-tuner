import { YinDetector } from './yin';
export type MicrophoneStatus = 'off' | 'requesting' | 'listening';
export interface MicrophonePlatform {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createContext(): AudioContext;
}
export function microphoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : 'error';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone access was denied. Allow the microphone for this site in browser settings, then press Start microphone.';
  if (name === 'NotFoundError') return 'No microphone was found. Connect one and try again.';
  return `No microphone could be opened (${name}). Check the device and try again.`;
}
/** Each start owns its context, nodes and stream. A generation invalidates pending permission requests. */
export class Microphone {
  status: MicrophoneStatus = 'off';
  private generation = 0;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private detector: YinDetector | null = null;
  constructor(private readonly changed: () => void, private readonly failed: (message: string) => void,
    private readonly platform: MicrophonePlatform = {
      getUserMedia: constraints => {
        if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error('Microphone requires HTTPS or localhost in a supported browser'));
        return navigator.mediaDevices.getUserMedia(constraints);
      }, createContext: () => new AudioContext(),
    }) {}
  async start(): Promise<void> {
    if (this.status !== 'off') return;
    const generation = ++this.generation;
    this.status = 'requesting'; this.changed();
    try {
      // Resume during the user gesture, before waiting on microphone permission (Safari).
      const context = this.platform.createContext(); this.context = context;
      await context.resume();
      if (generation !== this.generation) return;
      const stream = await this.platform.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.detector = new YinDetector(context.sampleRate);
      this.source = context.createMediaStreamSource(stream);
      this.analyser = context.createAnalyser(); this.analyser.fftSize = this.detector.bufferSize;
      this.buffer = new Float32Array(this.analyser.fftSize);
      this.source.connect(this.analyser);
      this.status = 'listening'; this.changed();
      for (const track of stream.getTracks()) track.addEventListener('ended', () => {
        if (generation === this.generation) { this.stop(); this.failed('Microphone disconnected. Reconnect it and press Start microphone.'); }
      });
      context.onstatechange = () => {
        if (generation === this.generation && context.state !== 'running') {
          this.stop(); this.failed('Audio was interrupted. Press Start microphone to resume.');
        }
      };
    } catch (error) {
      if (generation === this.generation) { this.stop(); this.failed(microphoneError(error)); }
    }
  }
  sample(): number | null {
    if (this.status !== 'listening' || !this.analyser || !this.buffer || !this.detector) return null;
    this.analyser.getFloatTimeDomainData(this.buffer);
    return this.detector.detect(this.buffer);
  }
  stop(): void {
    ++this.generation;
    this.source?.disconnect(); this.analyser?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    const context = this.context;
    if (context) { context.onstatechange = null; void context.close().catch(() => {}); }
    this.context = null; this.source = null; this.analyser = null; this.stream = null; this.buffer = null; this.detector = null;
    this.status = 'off'; this.changed();
  }
}
