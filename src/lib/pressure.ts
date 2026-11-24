/** PROCESSOR PRESSURE (spec 2026-11-24-work-wall-video-design, §4.9). A machine out of memory starts swapping, and
 *  swapping shows as load. Where the browser has a PressureObserver, it reports the whole machine's processor state:
 *  `nominal`, `fair`, `serious`, `critical`. The reading is the machine's, not the page's.
 *
 *  SHIP A SHOWS IT on the readout (`?stats=1`) and nothing acts on it; the observer is started only when the readout
 *  is. An observer may deliver nothing at all (it did not in the spec's check, §2.7), which the readout says in
 *  plain words. */
export type PressureState = 'nominal' | 'fair' | 'serious' | 'critical' | 'no reading' | 'not offered';

type Observer = new (cb: (records: Array<{ state?: unknown }>) => void) => {
  observe(source: string, options?: { sampleInterval?: number }): Promise<void> | void;
};

const STATES: PressureState[] = ['nominal', 'fair', 'serious', 'critical'];

/** Start watching `cpu`, one reading a second. Returns the reader of the latest state: `not offered` without the
 *  observer, `no reading` until one arrives (or for good, where the browser refuses the source). */
export function watchPressure(): () => PressureState {
  const Ctor = (globalThis as { PressureObserver?: Observer }).PressureObserver;
  if (typeof Ctor !== 'function') return () => 'not offered';
  let state: PressureState = 'no reading';
  try {
    const observer = new Ctor((records) => {
      const s = records[records.length - 1]?.state;
      if (STATES.includes(s as PressureState)) state = s as PressureState;
    });
    void Promise.resolve(observer.observe('cpu', { sampleInterval: 1000 })).catch(() => { /* refused: no reading */ });
  } catch { /* refused: no reading */ }
  return () => state;
}
