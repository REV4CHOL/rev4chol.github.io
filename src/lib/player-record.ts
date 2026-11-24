/** WHICH PLAYER STANDS, AND WHY (owner, 2026-11-24: "I saw the player on PC for a time, and now it dissapeared, and
 *  YouTube player is appearing now ... Also right now on iPad I cant even see the new player at all"). Every film
 *  player the page mounts leaves a record here: the site's own (the big frame and the bar: project/player-bar.ts) or
 *  the platform's own, with its state or the reason, in the readout's capitals. `?stats=1` shows them as the PLAYER
 *  line (shell/stats.ts) and `rvlPlayer.state()` hands them to a check, so a screen that cannot be tested here says
 *  for itself which player it got. Nothing is sent anywhere. */

export interface PlayerRecord {
  /** FILM, or PART 1, PART 2 … of a film in parts */
  name: string;
  /** the site's own player, or the platform's own (YouTube's with its controls, Facebook's, the owner's own file) */
  kind: 'site' | 'platform';
  /** its state, or the reason it stands */
  why: string;
  /** the big frame's layout as it stands; null for a platform's own player */
  frame: string | null;
  /** the hold at the film's first start (project/hold.ts): where it runs, then how it went; null where there is none */
  hold: string | null;
}

const records: PlayerRecord[] = [];

/** A player mounts: its record, which its owner keeps writing (`why`, `frame`, `kind` when the platform's takes over). */
export function recordPlayer(name: string, kind: PlayerRecord['kind'], why: string): PlayerRecord {
  const r: PlayerRecord = { name, kind, why, frame: null, hold: null };
  records.push(r);
  return r;
}

export function playerRecords(): readonly PlayerRecord[] {
  return records;
}

export function clearPlayerRecords(): void {
  records.length = 0;
}

/** The readout's PLAYER line. */
export function playerLine(list: readonly PlayerRecord[]): string {
  if (!list.length) return 'PLAYER     NO FILM PLAYER ON THIS PAGE';
  const one = (r: PlayerRecord) =>
    `${list.length > 1 ? `${r.name}: ` : ''}${r.kind === 'site' ? "THE SITE'S" : "THE PLATFORM'S OWN"} · ${r.why}${r.frame ? ` · ${r.frame}` : ''}${r.hold ? ` · ${r.hold}` : ''}`;
  return `PLAYER     ${list.map(one).join(' | ')}`;
}
