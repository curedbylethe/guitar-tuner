import { describe, expect, it, vi } from "vitest";
import {
  Microphone,
  type MicrophonePlatform,
} from "../../src/audio/microphone";
import { ReferenceTone } from "../../src/audio/tone";
function fixture() {
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const node = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    fftSize: 4096,
  };
  const context = {
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    sampleRate: 48000,
    createAnalyser: () => node,
    createMediaStreamSource: () => node,
    state: "running",
    onstatechange: null,
  };
  const platform: MicrophonePlatform = {
    getUserMedia: vi.fn().mockResolvedValue(stream),
    createContext: () => context as unknown as AudioContext,
  };
  const changed = vi.fn(),
    failed = vi.fn();
  return {
    track,
    stream,
    node,
    context,
    platform,
    changed,
    failed,
    mic: new Microphone(changed, failed, platform),
  };
}
describe("microphone ownership", () => {
  it("deduplicates start and releases all resources on repeated stop", async () => {
    const f = fixture();
    const pending = f.mic.start();
    await f.mic.start();
    await pending;
    expect(f.platform.getUserMedia).toHaveBeenCalledTimes(1);
    expect(f.mic.status).toBe("listening");
    f.mic.stop();
    f.mic.stop();
    expect(f.track.stop).toHaveBeenCalledTimes(1);
    expect(f.context.close).toHaveBeenCalledTimes(1);
    expect(f.mic.sample()).toBeNull();
  });
  it("stops a stream arriving after cancellation", async () => {
    const f = fixture();
    let resolve!: (stream: MediaStream) => void;
    f.platform.getUserMedia = () =>
      new Promise((r) => {
        resolve = r;
      });
    const pending = f.mic.start();
    await Promise.resolve();
    f.mic.stop();
    resolve(f.stream);
    await pending;
    expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.mic.status).toBe("off");
  });
  it("handles permission denial and permits retry", async () => {
    const f = fixture();
    vi.mocked(f.platform.getUserMedia).mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    await f.mic.start();
    expect(f.failed).toHaveBeenCalledWith(expect.stringContaining("denied"));
    expect(f.context.close).toHaveBeenCalledOnce();
    await f.mic.start();
    expect(f.mic.status).toBe("listening");
    f.mic.stop();
  });
  it("releases the stream if graph creation fails", async () => {
    const f = fixture();
    f.context.createAnalyser = () => {
      throw Error();
    };
    await f.mic.start();
    expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.context.close).toHaveBeenCalledOnce();
  });
});
describe("tone ownership", () => {
  it("cancels while context resume is pending", async () => {
    let resume!: () => void;
    const context = {
      resume: () =>
        new Promise<void>((r) => {
          resume = r;
        }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const tone = new ReferenceTone(
      () => {},
      () => {},
      () => context as unknown as AudioContext,
    );
    const pending = tone.play(82);
    expect(tone.active).toBe(true);
    tone.stop();
    resume();
    await pending;
    expect(tone.active).toBe(false);
    expect(context.close).toHaveBeenCalledOnce();
  });
});

it("releases input after an AudioContext interruption", async () => {
  const f = fixture();
  await f.mic.start();
  f.context.state = "suspended";
  const context = f.context as unknown as AudioContext;
  context.onstatechange?.(new Event("statechange"));
  expect(f.mic.status).toBe("off");
  expect(f.track.stop).toHaveBeenCalledOnce();
  expect(f.failed).toHaveBeenCalledWith(expect.stringContaining("interrupted"));
});
