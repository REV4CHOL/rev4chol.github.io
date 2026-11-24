import { describe, expect, it } from 'vitest';
import { clearPlayerRecords, playerLine, playerRecords, recordPlayer } from '../src/lib/player-record';

// WHICH PLAYER STANDS, AND WHY (owner, 2026-11-24: "I saw the player on PC for a time, and now it dissapeared, and
// YouTube player is appearing now ... Also right now on iPad I cant even see the new player at all"). Every film
// player the page mounts leaves a record; `?stats=1` shows it as the PLAYER line, so a screen that cannot be tested
// here (the owner's iPad) says for itself which player it got and for what reason.

describe("the player's record", () => {
  it('a page without a film says so', () => {
    clearPlayerRecords();
    expect(playerLine(playerRecords())).toBe('PLAYER     NO FILM PLAYER ON THIS PAGE');
  });

  it("the site's own player: its state, and the frame it stands in", () => {
    clearPlayerRecords();
    const r = recordPlayer('FILM', 'site', 'WAITING FOR ITS FRAME');
    expect(playerLine(playerRecords())).toBe("PLAYER     THE SITE'S · WAITING FOR ITS FRAME");
    r.why = 'ANSWERED 37 MS AFTER ITS LOAD';
    r.frame = 'FRAME 2589 × 1456 AT 0.52';
    expect(playerLine(playerRecords())).toBe("PLAYER     THE SITE'S · ANSWERED 37 MS AFTER ITS LOAD · FRAME 2589 × 1456 AT 0.52");
  });

  it("the platform's own player: the reason it stands", () => {
    clearPlayerRecords();
    recordPlayer('FILM', 'platform', 'NO ELEMENT FULLSCREEN HERE (FULLSCREEN UNDEFINED, WEBKIT FALSE)');
    expect(playerLine(playerRecords())).toBe("PLAYER     THE PLATFORM'S OWN · NO ELEMENT FULLSCREEN HERE (FULLSCREEN UNDEFINED, WEBKIT FALSE)");
  });

  it('a film in parts names each part', () => {
    clearPlayerRecords();
    recordPlayer('PART 1', 'site', 'ANSWERED 40 MS AFTER ITS LOAD');
    const two = recordPlayer('PART 2', 'site', 'WAITING FOR ITS FRAME');
    two.kind = 'platform';
    two.why = "ITS PLAYER STAYED SILENT 15 S AFTER ITS LOAD · YOUTUBE'S OWN PLAYER TOOK ITS PLACE";
    expect(playerLine(playerRecords())).toBe(
      "PLAYER     PART 1: THE SITE'S · ANSWERED 40 MS AFTER ITS LOAD | " +
      "PART 2: THE PLATFORM'S OWN · ITS PLAYER STAYED SILENT 15 S AFTER ITS LOAD · YOUTUBE'S OWN PLAYER TOOK ITS PLACE",
    );
  });
});
