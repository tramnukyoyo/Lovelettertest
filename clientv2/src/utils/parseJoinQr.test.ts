import { describe, it, expect } from 'vitest';
import { parseJoinQr } from './parseJoinQr';

const HOST = 'primesuspect.example.com';

describe('parseJoinQr', () => {
  it('accepts a bare room code and uppercases it', () => {
    expect(parseJoinQr('ab12', HOST)).toEqual({ type: 'room', roomCode: 'AB12' });
    expect(parseJoinQr('  XYZ123  ', HOST)).toEqual({ type: 'room', roomCode: 'XYZ123' });
  });

  it('rejects strings that are not codes or URLs', () => {
    expect(parseJoinQr('', HOST)).toEqual({ type: 'reject' });
    expect(parseJoinQr('hello world', HOST)).toEqual({ type: 'reject' });
    expect(parseJoinQr('abc', HOST)).toEqual({ type: 'reject' }); // too short
    expect(parseJoinQr('abcdefghi', HOST)).toEqual({ type: 'reject' }); // too long
  });

  it('accepts same-origin big-screen QR URLs (?room=)', () => {
    expect(parseJoinQr(`https://${HOST}/primesuspect/?room=AB12&via=qr`, HOST))
      .toEqual({ type: 'room', roomCode: 'AB12' });
  });

  it('accepts gamebuddies.io URLs with ?join= and subdomains', () => {
    expect(parseJoinQr('https://gamebuddies.io/?join=xy99', HOST))
      .toEqual({ type: 'room', roomCode: 'XY99' });
    expect(parseJoinQr('https://www.gamebuddies.io/?room=xy99', HOST))
      .toEqual({ type: 'room', roomCode: 'XY99' });
  });

  it('treats >10 char values as invite tokens', () => {
    const token = 'abcdefghijklmnop';
    expect(parseJoinQr(`https://gamebuddies.io/?invite=${token}`, HOST))
      .toEqual({ type: 'invite', token });
  });

  it('rejects foreign origins even with a room param', () => {
    expect(parseJoinQr('https://evil.example.org/?room=AB12', HOST)).toEqual({ type: 'reject' });
    expect(parseJoinQr('https://gamebuddies.io.evil.org/?room=AB12', HOST)).toEqual({ type: 'reject' });
  });

  it('rejects non-http(s) schemes', () => {
    expect(parseJoinQr('javascript:alert(1)', HOST)).toEqual({ type: 'reject' });
    expect(parseJoinQr('ftp://gamebuddies.io/?room=AB12', HOST)).toEqual({ type: 'reject' });
  });

  it('rejects trusted URLs without a join param', () => {
    expect(parseJoinQr('https://gamebuddies.io/games', HOST)).toEqual({ type: 'reject' });
  });
});
