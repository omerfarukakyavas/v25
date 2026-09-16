import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';
import { dosyaTakvimKronolojisi, sonrakiOturumHatasi } from '../src/app/takvim-oturumlari.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
function fixture(kaynak) {
  const a = runInInjectionContext(injector, () => new AppComponent());
  const dava = kaynak === 'dava';
  const dosya = { id: 1, durum: dava ? 'Derdest' : 'Müzakere', dosyaNo: '2026/1', arabuluculukNo: '2026/2', mahkeme: 'Örnek Mahkeme', taraflar: [],
    durusmaTarihi: '2026-09-16', durusmaSaati: '10:00', toplantiTarihi: '2026-09-16', toplantiSaati: '10:00',
    notlar: 'Korunacak not', finansalIslemler: [{ id: 7, tutar: 123 }], evraklar: [{ id: 8, isim: 'Evrak' }] };
  a.davalar = dava ? [dosya] : [];
  a.arabuluculukDosyalar = dava ? [] : [dosya];
  a.aktifSayfa = dava ? 'detay' : 'arabuluculukDetay';
  if (dava) a.seciliDava = dosya; else a.seciliArabuluculuk = dosya;
  a.bildirimGoster = () => {};
  a.geriAlinabilirBasariBildirimiGoster = () => {};
  const writes = [];
  const save = async d => { writes.push(structuredClone(d)); return true; };
  a.davaKaydetCloud = save; a.arabuluculukKaydetCloud = save;
  const open = () => dava ? a.durusmaTamamlandiIsaretle(a.davalar[0]) : a.toplantiTamamlandiIsaretle(a.arabuluculukDosyalar[0]);
  const current = () => dava ? a.davalar[0] : a.arabuluculukDosyalar[0];
  return { a, dosya, writes, open, current, date: dava ? 'durusmaTarihi' : 'toplantiTarihi', done: dava ? 'durusmaTamamlandiMi' : 'toplantiTamamlandiMi' };
}

for (const kaynak of ['dava', 'arabuluculuk']) {
  test(`${kaynak}: opening and cancelling confirmation never writes or changes the record`, () => {
    const { a, dosya, writes, open, current } = fixture(kaynak);
    const original = structuredClone(dosya);
    open(); assert.equal(a.takvimTamamlamaIstegi.dosyaId, dosya.id);
    assert.deepEqual(current(), original); assert.equal(writes.length, 0);
    a.takvimTamamlamaIptal(); assert.equal(a.takvimTamamlamaIstegi, null);
    assert.deepEqual(current(), original);
  });
  test(`${kaynak}: completing without a new date archives it and removes only that appointment from agenda`, async () => {
    const { a, writes, open, current, done, date } = fixture(kaynak);
    open(); assert.equal(await a.takvimTamamlamayiKaydet(null), true);
    assert.equal(writes.length, 1); assert.equal(current()[done], true);
    assert.equal(current()[date], '2026-09-16');
    assert.equal(a.ajandaKayitlari.length, 0);
    assert.equal(a.aktifDosyaTakvimKronolojisi[0].durum, 'Gerçekleşti');
    assert.equal(a.takvimTamamlamaIstegi, null);
    open(); assert.equal(a.takvimTamamlamaIstegi, null);
  });
  test(`${kaynak}: new appointment and completion save atomically, repeat sessions retain all completed dates`, async () => {
    const { a, dosya, writes, open, current, done, date } = fixture(kaynak);
    open(); assert.equal(await a.takvimTamamlamayiKaydet({ tarih: '2026-10-01', saat: '14:30' }), true);
    assert.equal(writes.length, 1); assert.equal(current()[done], false);
    assert.equal(current()[date], '2026-10-01');
    assert.deepEqual(current().finansalIslemler, dosya.finansalIslemler);
    assert.deepEqual(current().evraklar, dosya.evraklar); assert.equal(current().durum, dosya.durum);
    assert.equal(current().notlar, dosya.notlar);
    assert.deepEqual(a.aktifDosyaTakvimKronolojisi.map(x => [x.tarih, x.durum]), [['2026-10-01', 'Planlandı'], ['2026-09-16', 'Gerçekleşti']]);
    assert.equal(a.ajandaKayitlari.length, 1); assert.equal(a.ajandaKayitlari[0].tarih, '2026-10-01T14:30:00');
    open(); await a.takvimTamamlamayiKaydet({ tarih: '2026-11-01', saat: '' });
    assert.equal(a.aktifDosyaTakvimKronolojisi.length, 3);
    assert.equal(current().takvimGecmisi.filter(x => x.durum === 'Gerçekleşti').length, 2);
  });
  test(`${kaynak}: failed save keeps the dialog and original file, retry cannot duplicate history`, async () => {
    const { a, dosya, open, current } = fixture(kaynak);
    const method = kaynak === 'dava' ? 'davaKaydetCloud' : 'arabuluculukKaydetCloud';
    const original = structuredClone(dosya); const save = a[method];
    a[method] = async () => false;
    open(); assert.equal(await a.takvimTamamlamayiKaydet({ tarih: '2026-10-01', saat: '' }), false);
    assert.ok(a.takvimTamamlamaIstegi); assert.ok(a.takvimTamamlamaHatasi);
    assert.deepEqual(current(), original);
    a[method] = save; await a.takvimTamamlamayiKaydet({ tarih: '2026-10-01', saat: '' });
    assert.equal(current().takvimGecmisi.length, 2);
  });
  test(`${kaynak}: stale dialogs cannot overwrite changed, completed or deleted calendar records`, async () => {
    for (const mutation of ['date', 'done', 'delete']) {
      const { a, open, current, writes, date, done } = fixture(kaynak);
      open();
      if (mutation === 'date') current()[date] = '2026-12-01';
      if (mutation === 'done') current()[done] = true;
      if (mutation === 'delete') { a.davalar = []; a.arabuluculukDosyalar = []; }
      assert.equal(await a.takvimTamamlamayiKaydet(null), false); assert.equal(writes.length, 0);
      assert.ok(a.takvimTamamlamaHatasi);
    }
  });
  test(`${kaynak}: double submission is blocked and latest unrelated edits are preserved`, async () => {
    const { a, open, current } = fixture(kaynak);
    const method = kaynak === 'dava' ? 'davaKaydetCloud' : 'arabuluculukKaydetCloud';
    let resolve; let calls = 0;
    a[method] = () => { calls++; return new Promise(r => { resolve = r; }); };
    open(); current().notlar = 'Son düzenleme';
    const pending = a.takvimTamamlamayiKaydet(null);
    assert.equal(await a.takvimTamamlamayiKaydet(null), false);
    a.takvimTamamlamaIptal(); assert.ok(a.takvimTamamlamaIstegi);
    resolve(true); await pending;
    assert.equal(calls, 1); assert.equal(current().notlar, 'Son düzenleme');
  });
  test(`${kaynak}: agenda complete button opens the same confirmation`, () => {
    const { a, writes } = fixture(kaynak);
    a.aktifSayfa = 'ajanda';
    a.ajandaKaydiTamamla(a.ajandaKayitlari[0]);
    assert.equal(a.takvimTamamlamaIstegi.kaynak, kaynak); assert.equal(writes.length, 0);
  });
}

test('invalid or non-increasing dates/times cannot be scheduled; same day later time is allowed', () => {
  const old = { tarih: '2026-09-16', saat: '10:00' };
  for (const next of [{ tarih: '', saat: '' }, { tarih: '2026-02-30', saat: '' }, { tarih: old.tarih, saat: '' }, { tarih: old.tarih, saat: '09:00' }, { tarih: '2026-10-01', saat: '25:00' }]) assert.ok(sonrakiOturumHatasi(old, next));
  assert.equal(sonrakiOturumHatasi(old, { tarih: old.tarih, saat: '11:00' }), '');
  assert.equal(sonrakiOturumHatasi(old, { tarih: '2026-10-01', saat: '' }), '');
});

test('chronology uses session dates not completion timestamps, collapses audit records and honors reopen', () => {
  const dosya = { durusmaTarihi: '2026-11-01', takvimGecmisi: [
    { id: 1, tur: 'Duruşma', durum: 'Planlandı', planlananTarih: '2026-09-16', kayitTarihi: '2026-08-01' },
    { id: 2, tur: 'Duruşma', durum: 'Gerçekleşti', planlananTarih: '2026-09-16', kayitTarihi: '2026-09-16' },
    { id: 3, tur: 'Duruşma', durum: 'Ajandaya Geri Alındı', planlananTarih: '2026-09-16', kayitTarihi: '2026-09-17' },
    { id: 4, tur: 'Duruşma', durum: 'Gerçekleşti', planlananTarih: '2026-08-01', kayitTarihi: '2026-10-01' }
  ] };
  const before = structuredClone(dosya);
  assert.deepEqual(dosyaTakvimKronolojisi(dosya, 'Duruşma').map(x => [x.tarih, x.durum]), [['2026-11-01', 'Planlandı'], ['2026-09-16', 'Önceki plan'], ['2026-08-01', 'Gerçekleşti']]);
  assert.deepEqual(dosya, before);
  assert.deepEqual(dosyaTakvimKronolojisi({}, 'Duruşma'), []);
});

test('calendar history is not truncated at 80 records', async () => {
  const { a, current, open } = fixture('dava');
  current().takvimGecmisi = Array.from({ length: 80 }, (_, id) => ({ id, tur: 'Duruşma', durum: 'Gerçekleşti', planlananTarih: '2025-01-01', kayitTarihi: '2025-01-01' }));
  open(); await a.takvimTamamlamayiKaydet({ tarih: '2026-10-01', saat: '' });
  assert.equal(current().takvimGecmisi.length, 82);
});

test('closed mediation files and investigation files do not open completion prompts', () => {
  const med = fixture('arabuluculuk'); med.current().durum = 'Kapalı'; med.open(); assert.equal(med.a.takvimTamamlamaIstegi, null);
  const court = fixture('dava'); court.current().dosyaTuru = 'sorusturma'; court.open(); assert.equal(court.a.takvimTamamlamaIstegi, null);
});
