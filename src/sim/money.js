// Bank account, rent on the lease, fines and bills.
// Cash is an item on your body; the bank balance survives anything.

import { DAY, dayOf, tod, hm, clock12, weekday } from './util.js';
import { cashOnBody, spendCash, addCash } from './items.js';

export const WEEKLY_DEPOSIT_CAP = 1000;
export const RENT = { apt_2b: 175 };

const weekOf = (t) => Math.floor((dayOf(t) - 1) / 7);
// End of Sunday of the week containing t.
export const weekEnd = (t) => (weekOf(t) * 7 + 8) * DAY - 1;

export class Money {
  constructor(sim) {
    this.sim = sim;
  }

  get p() {
    return this.sim.s.actors.p;
  }

  depositRoom() {
    const p = this.p;
    if (p.weekKey !== weekOf(this.sim.s.t)) {
      p.weekKey = weekOf(this.sim.s.t);
      p.weekDeposits = 0;
    }
    return Math.max(0, WEEKLY_DEPOSIT_CAP - p.weekDeposits);
  }

  logBank(kind, amt, where) {
    const p = this.p;
    p.bankLog.push({ t: this.sim.s.t, kind, amt, bal: p.bank, where });
    if (p.bankLog.length > 60) p.bankLog.splice(0, p.bankLog.length - 60);
  }

  deposit(amt, where) {
    const sim = this.sim;
    amt = Math.floor(amt);
    if (amt <= 0) return { ok: false, text: 'Enter an amount.' };
    const room = this.depositRoom();
    if (room <= 0) return { ok: false, text: `Weekly deposit limit reached ($${WEEKLY_DEPOSIT_CAP}). Resets Monday.` };
    amt = Math.min(amt, room, cashOnBody(sim, this.p));
    if (amt <= 0) return { ok: false, text: "You don't have that much cash on you." };
    spendCash(sim, this.p, amt);
    this.p.bank += amt;
    this.p.weekDeposits += amt;
    this.logBank('deposit', amt, where);
    sim.sfx('cash');
    sim.log(`Deposited $${amt}. Balance $${this.p.bank}.`);
    sim.wantSave = true;
    return { ok: true, text: `Deposited $${amt}.` };
  }

  withdraw(amt, where) {
    const sim = this.sim;
    amt = Math.floor(amt);
    if (amt <= 0) return { ok: false, text: 'Enter an amount.' };
    amt = Math.min(amt, this.p.bank);
    if (amt <= 0) return { ok: false, text: 'Insufficient funds.' };
    this.p.bank -= amt;
    addCash(sim, this.p, amt);
    this.logBank('withdraw', amt, where);
    sim.sfx('cash');
    sim.log(`Withdrew $${amt}. Balance $${this.p.bank}.`);
    sim.wantSave = true;
    return { ok: true, text: `Withdrew $${amt}.` };
  }

  // ---------------------------------------------------------------- rent
  lease(id) {
    const s = this.sim.s;
    if (!s.leases) s.leases = {};
    if (!s.leases[id] && RENT[id] !== undefined) s.leases[id] = { rent: RENT[id], due: weekEnd(s.t), overdue: false, warned: -1 };
    return s.leases[id];
  }

  leaseOk(id) {
    const L = this.lease(id);
    return !L || !L.overdue;
  }

  payRent(id) {
    const sim = this.sim;
    const L = this.lease(id);
    if (!L) return { ok: false, text: 'No lease.' };
    if (L.due - sim.s.t > DAY * 14) return { ok: false, text: "You're paid up two weeks ahead. Boudreaux won't take more." };
    if (!spendCash(sim, this.p, L.rent)) return { ok: false, text: `Rent is $${L.rent}. You don't have it on you.` };
    L.due += DAY * 7;
    const wasOver = L.overdue;
    L.overdue = sim.s.t > L.due;
    const boss = sim.s.actors.boudreaux;
    if (boss) {
      boss.cash += L.rent;
      if (boss.rel.p) boss.rel.p.v = Math.min(100, boss.rel.p.v + (wasOver ? 1 : 3));
    }
    sim.sfx('cash');
    sim.log(`Paid $${L.rent} rent. Paid through ${weekday(L.due)} ${clock12(L.due)}${L.overdue ? ' — still behind.' : '.'}`, 'good');
    if (wasOver && !L.overdue) sim.toast('Rent caught up. The door works again.', 'good');
    sim.wantSave = true;
    return { ok: true, text: 'Rent paid.' };
  }

  // ---------------------------------------------------------------- fines and bills
  fine(amt, why) {
    const sim = this.sim;
    const p = this.p;
    const paid = Math.min(amt, cashOnBody(sim, p));
    if (paid > 0) spendCash(sim, p, paid);
    const owed = amt - paid;
    if (owed > 0) p.fines = (p.fines || 0) + owed;
    sim.log(`Fined $${amt} for ${why}.${owed > 0 ? ` $${owed} still owed at the precinct.` : ''}`, 'bad');
    return { paid, owed };
  }

  payFines() {
    const sim = this.sim;
    const p = this.p;
    const owed = p.fines || 0;
    if (owed <= 0) return { ok: false, text: 'You don\'t owe anything.' };
    const amt = Math.min(owed, cashOnBody(sim, p));
    if (amt <= 0) return { ok: false, text: `You owe $${owed}. Come back with cash.` };
    spendCash(sim, p, amt);
    p.fines -= amt;
    if (p.fines <= 0) p.heat = Math.max(0, p.heat - 10);
    sim.sfx('cash');
    sim.log(`Paid $${amt} in fines.${p.fines > 0 ? ` $${p.fines} left.` : ' All square.'}`, 'good');
    return { ok: true, text: p.fines > 0 ? `Paid $${amt}. Still owe $${p.fines}.` : 'Paid in full.' };
  }

  bill(amt, why) {
    const sim = this.sim;
    const p = this.p;
    const fromBank = Math.min(p.bank, amt);
    if (fromBank > 0) {
      p.bank -= fromBank;
      this.logBank('bill', fromBank, why);
    }
    const left = amt - fromBank;
    if (left > 0) p.bills = (p.bills || 0) + left;
    return { fromBank, left };
  }

  payBills() {
    const sim = this.sim;
    const p = this.p;
    const owed = p.bills || 0;
    const amt = Math.min(owed, cashOnBody(sim, p));
    if (owed <= 0) return { ok: false, text: 'No balance on your account.' };
    if (amt <= 0) return { ok: false, text: `You owe $${owed}.` };
    spendCash(sim, p, amt);
    p.bills -= amt;
    sim.sfx('cash');
    sim.log(`Paid $${amt} toward your hospital bill.`, 'good');
    return { ok: true, text: p.bills > 0 ? `Paid $${amt}. $${p.bills} left.` : 'Bill paid off.' };
  }

  update() {
    const sim = this.sim;
    const s = sim.s;
    for (const id in RENT) {
      const L = this.lease(id);
      if (!L.overdue && s.t > L.due) {
        L.overdue = true;
        sim.log(`Rent on ${sim.world.room(id).name} is overdue. The door won't open until you pay ($${L.rent}).`, 'bad');
        sim.toast('Rent overdue — you\'re locked out until you pay.', 'bad');
        const b = s.actors.boudreaux;
        if (b && b.rel.p) b.rel.p.v = Math.max(-100, b.rel.p.v - 6);
      }
      // a heads-up the morning before
      const d = dayOf(s.t);
      if (!L.overdue && L.due - s.t < DAY * 1.6 && L.warned !== d && tod(s.t) > hm('08:00')) {
        L.warned = d;
        sim.toast(`Rent ($${L.rent}) is due ${weekday(L.due)} night. Drop box in the Bayou Arms hallway.`, 'warn');
      }
    }
    // unpaid fines keep you on police radar
    const p = s.actors.p;
    if ((p.fines || 0) > 0) p.heat = Math.min(100, Math.max(p.heat, 12));
  }
}
