import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const enc = new TextEncoder();
function run(p: Uint8Array, inp: Uint8Array) {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const T = (c: number) => ({ out: out.slice(0, olen), exit: c });
  for (;;) {
    if (steps === 1000000) return T(10);
    if (pc < 0 || pc >= n) return T(9);
    const op = p[pc]; let name = '', imm = 0, pops = 0, pushes = 0;
    switch (op) {
      case 0: name = 'HALT'; break;
      case 1: name = 'PUSH8'; imm = 1; pushes = 1; break;
      case 2: name = 'PUSH32'; imm = 4; pushes = 1; break;
      case 3: name = 'POP'; pops = 1; break;
      case 4: name = 'DUP'; pops = 1; pushes = 2; break;
      case 5: name = 'SWAP'; pops = 2; pushes = 2; break;
      case 6: name = 'OVER'; pops = 2; pushes = 3; break;
      case 7: name = 'ROT'; pops = 3; pushes = 3; break;
      case 16: name = 'ADD'; pops = 2; pushes = 1; break;
      case 17: name = 'SUB'; pops = 2; pushes = 1; break;
      case 18: name = 'MUL'; pops = 2; pushes = 1; break;
      case 19: name = 'DIV'; pops = 2; pushes = 1; break;
      case 20: name = 'MOD'; pops = 2; pushes = 1; break;
      case 21: name = 'DIVU'; pops = 2; pushes = 1; break;
      case 22: name = 'MODU'; pops = 2; pushes = 1; break;
      case 23: name = 'NEG'; pops = 1; pushes = 1; break;
      case 24: name = 'AND'; pops = 2; pushes = 1; break;
      case 25: name = 'OR'; pops = 2; pushes = 1; break;
      case 26: name = 'XOR'; pops = 2; pushes = 1; break;
      case 27: name = 'NOT'; pops = 1; pushes = 1; break;
      case 28: name = 'SHL'; pops = 2; pushes = 1; break;
      case 29: name = 'SHR'; pops = 2; pushes = 1; break;
      case 30: name = 'SHRU'; pops = 2; pushes = 1; break;
      case 32: name = 'EQ'; pops = 2; pushes = 1; break;
      case 33: name = 'LT'; pops = 2; pushes = 1; break;
      case 34: name = 'LTU'; pops = 2; pushes = 1; break;
      case 48: name = 'JMP'; imm = 2; break;
      case 49: name = 'JZ'; imm = 2; pops = 1; break;
      case 50: name = 'JNZ'; imm = 2; pops = 1; break;
      case 51: name = 'CALL'; imm = 2; break;
      case 52: name = 'RET'; break;
      case 64: name = 'LOAD'; pops = 1; pushes = 1; break;
      case 65: name = 'STORE'; pops = 2; break;
      case 80: name = 'PRINT'; pops = 1; break;
      case 81: name = 'PUTC'; pops = 1; break;
      case 82: name = 'IN'; pushes = 1; break;
      case 83: name = 'EXIT'; pops = 1; break;
      default: return T(5);
    }
    if (pc + imm >= n) return T(9);
    steps++;
    const nx = pc + 1 + imm;
    if (sp < pops) return T(2);
    if (sp - pops + pushes > 256) return T(3);
    pc = nx;
    switch (name) {
      case 'HALT': return T(0);
      case 'PUSH8': D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 'PUSH32': D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 'POP': sp--; break;
      case 'DUP': D[sp] = D[sp - 1]; sp++; break;
      case 'SWAP': { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 'OVER': D[sp] = D[sp - 2]; sp++; break;
      case 'ROT': { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 'NEG': D[sp - 1] = -D[sp - 1] | 0; break;
      case 'NOT': D[sp - 1] = ~D[sp - 1]; break;
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD': case 'DIVU': case 'MODU':
      case 'AND': case 'OR': case 'XOR': case 'SHL': case 'SHR': case 'SHRU':
      case 'EQ': case 'LT': case 'LTU': {
        const b = D[sp - 1], a = D[sp - 2]; let r = 0;
        switch (name) {
          case 'ADD': r = (a + b) | 0; break;
          case 'SUB': r = (a - b) | 0; break;
          case 'MUL': r = Math.imul(a, b); break;
          case 'DIV': if (!b) return T(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 'MOD': if (!b) return T(4); r = b === -1 ? 0 : a % b | 0; break;
          case 'DIVU': if (!b) return T(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 'MODU': if (!b) return T(4); r = (a >>> 0) % (b >>> 0) | 0; break;
          case 'AND': r = a & b; break;
          case 'OR': r = a | b; break;
          case 'XOR': r = a ^ b; break;
          case 'SHL': r = a << (b & 31); break;
          case 'SHR': r = a >> (b & 31); break;
          case 'SHRU': r = (a >>> (b & 31)) | 0; break;
          case 'EQ': r = a === b ? 1 : 0; break;
          case 'LT': r = a < b ? 1 : 0; break;
          case 'LTU': r = a >>> 0 < b >>> 0 ? 1 : 0; break;
        }
        sp -= 2; D[sp++] = r; break;
      }
      case 'JMP': case 'JZ': case 'JNZ': {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (name !== 'JMP') { const v = D[--sp]; take = name === 'JZ' ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 'CALL':
        if (csp === 64) return T(7);
        C[csp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); break;
      case 'RET':
        if (!csp) return T(8);
        pc = C[--csp]; break;
      case 'LOAD': {
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return T(6);
        D[sp - 1] = M[a]; break;
      }
      case 'STORE': {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return T(6);
        sp -= 2; M[a] = v; break;
      }
      case 'PRINT': {
        const bytes = enc.encode(String(D[sp - 1]));
        if (olen + bytes.length > 65536) return T(11);
        sp--; out.set(bytes, olen); olen += bytes.length; break;
      }
      case 'PUTC':
        if (olen + 1 > 65536) return T(11);
        out[olen++] = D[--sp] & 255; break;
      case 'IN': D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 'EXIT': return T(D[--sp] & 255);
    }
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), r.exit + '\n');
}
