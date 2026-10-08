import { detectAttack, findRegion, layerFor, parseManifest, velocityGain, type SampleManifest, type SampleRegion } from "./regions";

const BASE = `${import.meta.env.BASE_URL}samples/kw/`;
const RELEASE_SECONDS = 0.12;

interface LoadedSample {
  readonly buffer: AudioBuffer;
  readonly attack: number;
}

/** ピアノの多重サンプル音源。曲に必要な音域だけを読み込み、音高はサンプルの再生速度で合わせる。 */
export class Sampler {
  private manifest: SampleManifest | null = null;
  private readonly samples = new Map<string, LoadedSample>();

  constructor(private readonly ctx: BaseAudioContext) {}

  async load(notes: Iterable<readonly [number, number]>, onProgress?: (done: number, total: number) => void): Promise<void> {
    if (!this.manifest) {
      const response = await fetch(`${BASE}manifest.json`);
      if (!response.ok) throw new Error(`音源の目録を読み込めませんでした（HTTP ${response.status}）`);
      this.manifest = parseManifest(await response.json());
    }
    const manifest = this.manifest;
    const needed = new Map<string, SampleRegion>();
    for (const [pitch, velocity] of notes) {
      const region = findRegion(manifest.regions, pitch, layerFor(velocity, manifest.velocitySplit));
      if (region && !this.samples.has(region.file)) needed.set(region.file, region);
    }
    let done = 0;
    onProgress?.(done, needed.size);
    await Promise.all(
      [...needed.keys()].map(async (file) => {
        const response = await fetch(`${BASE}${file}`);
        if (!response.ok) throw new Error(`音源 ${file} を読み込めませんでした（HTTP ${response.status}）`);
        const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        this.samples.set(file, { buffer, attack: detectAttack(buffer.getChannelData(0), buffer.sampleRate) });
        done += 1;
        onProgress?.(done, needed.size);
      }),
    );
  }

  /** when（AudioContext の時刻）に音を鳴らし、duration 秒後に離す。 */
  play(destination: AudioNode, pitch: number, velocity: number, when: number, duration: number): void {
    const manifest = this.manifest;
    if (!manifest) return;
    const region = findRegion(manifest.regions, pitch, layerFor(velocity, manifest.velocitySplit));
    const sample = region && this.samples.get(region.file);
    if (!region || !sample) return;
    const source = this.ctx.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = 2 ** ((pitch - region.key) / 12);
    const gain = this.ctx.createGain();
    const level = velocityGain(velocity);
    const release = when + Math.max(duration, 0.05);
    gain.gain.setValueAtTime(level, when);
    gain.gain.setValueAtTime(level, release);
    gain.gain.setTargetAtTime(0, release, RELEASE_SECONDS / 3);
    source.connect(gain).connect(destination);
    source.start(when, sample.attack);
    source.stop(release + RELEASE_SECONDS * 2);
  }
}
