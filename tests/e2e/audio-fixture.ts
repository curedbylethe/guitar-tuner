import type { Page } from "@playwright/test";
export interface MockAudio {
  frequency: number;
  amplitude: number;
  /** Amplitude of the second harmonic, added to the fundamental. */
  secondPartial: number;
  denied: boolean;
  pending: boolean;
  requests: number;
  stops: number;
  closes: number;
  resolvePermission: (() => void) | null;
}
declare global {
  interface Window {
    testAudio: MockAudio;
  }
}
/** Fake the browser boundary, not the detector: generated samples pass through production YIN. */
export function installMockAudio(): void {
  window.testAudio = {
    frequency: 82.4069,
    amplitude: 0.3,
    secondPartial: 0,
    denied: false,
    pending: false,
    requests: 0,
    stops: 0,
    closes: 0,
    resolvePermission: null,
  };
  const state = window.testAudio;
  class Node {
    fftSize = 4096;
    gain = {
      value: 1,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    frequency = { value: 0 };
    type = "sine";
    onended: (() => void) | null = null;
    connect(): void {}
    disconnect(): void {}
    start(): void {}
    stop(when?: number): void {
      if (when) setTimeout(() => this.onended?.(), 2400);
    }
    getFloatTimeDomainData(buffer: Float32Array): void {
      for (let i = 0; i < buffer.length; i++) {
        const phase = (2 * Math.PI * state.frequency * i) / 48000;
        buffer[i] =
          state.amplitude * Math.sin(phase) +
          state.secondPartial * Math.sin(2 * phase);
      }
    }
  }
  class Context {
    sampleRate = 48000;
    currentTime = 0;
    destination = new Node();
    state = "running";
    onstatechange: (() => void) | null = null;
    async resume(): Promise<void> {}
    async close(): Promise<void> {
      state.closes++;
      this.state = "closed";
    }
    createMediaStreamSource(): Node {
      return new Node();
    }
    createAnalyser(): Node {
      return new Node();
    }
    createGain(): Node {
      return new Node();
    }
    createOscillator(): Node {
      return new Node();
    }
  }
  Object.defineProperty(window, "AudioContext", {
    value: Context,
    configurable: true,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: async () => {
        state.requests++;
        if (state.denied) throw new DOMException("Denied", "NotAllowedError");
        if (state.pending)
          await new Promise<void>((resolve) => {
            state.resolvePermission = resolve;
          });
        return {
          getTracks: () => [
            {
              stop: () => {
                state.stops++;
              },
              addEventListener: () => {},
            },
          ],
        };
      },
    },
    configurable: true,
  });
}
export async function mockAudio(page: Page): Promise<void> {
  await page.addInitScript(installMockAudio);
}
export async function openTuning(page: Page): Promise<void> {
  if (
    (await page.locator("#tuning-toggle").isVisible()) &&
    !(await page
      .getByRole("radio", { name: "Custom", exact: true })
      .isVisible())
  )
    await page.locator("#tuning-toggle").click();
}
