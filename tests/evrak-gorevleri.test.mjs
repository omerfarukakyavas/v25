import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';
import { evrakGoreviGecerliTarih, evrakGorevleriniListele } from '../src/app/evrak-gorevleri.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
const task = (extra = {}) => ({ id: 3, metin: 'İstinafa başvur', ...extra });
const doc = (extra = {}) => ({ id: 2, isim: 'Ara karar', url: 'https://example.invalid/evrak', tarih: '', gorevler: [task()], ...extra });
const file = (extra = {}) => ({ id: 1, dosyaNo: '2026/123', muvekkil: 'Çağrı Şen', karsiTaraf: 'Ece Işık', mahkeme: 'Örnek mahkeme', durum: 'Derdest', konu: '', evraklar: [doc()], ...extra });
function app() {
  const a = runInInjectionContext(injector, () => new AppComponent());
  a.bildirimGoster = () => {};
  a.geriAlinabilirBasariBildirimiGoster = () => {};
  for (const [method, list, selected] of [
    ['davaKaydetCloud', 'davalar', 'seciliDava'],
    ['icraKaydetCloud', 'icralar', 'seciliIcra'],
    ['arabuluculukKaydetCloud', 'arabuluculukDosyalar', 'seciliArabuluculuk']
  ]) a[method] = async record => {
    const copy = structuredClone(record);
    a[list] = a[list].map(d => d.id === copy.id ? copy : d);
    if (a[selected]?.id === copy.id) a[selected] = copy;
    return true;
  };
  return a;
}
function openFile(a, d = file()) {
  a.davalar = [d]; a.seciliDava = d; a.aktifSayfa = 'detay';
  return d;
}

test('old records without tasks or dates remain valid and unmodified', () => {
  assert.deepEqual(evrakGorevleriniListele(), []);
  const d = doc(); const before = structuredClone(d);
  assert.equal(evrakGorevleriniListele([d])[0].tarih, '');
  assert.deepEqual(d, before);
});
test('own date overrides document date, nearest ancestor is inherited by nested attachments', () => {
  const d = doc({ sonEylemTarihi: '2026-09-15', gorevler: [task({ tarih: '2026-09-12' })],
    ekler: [doc({ id: 4, ekler: [doc({ id: 5, sonEylemTarihi: '2026-09-20' })] })] });
  const rows = evrakGorevleriniListele([d]);
  assert.deepEqual(rows.map(r => r.tarih), ['2026-09-12', '2026-09-15', '2026-09-20']);
  assert.equal(rows[2].anaEvrakIsmi, 'Ara karar / Ara karar');
});
test('invalid dates do not create invalid calendar entries', () => {
  for (const d of ['', 'nonsense', '2026-02-30', '2026-13-01']) assert.equal(evrakGoreviGecerliTarih(d), '');
  assert.equal(evrakGoreviGecerliTarih('2028-02-29'), '2028-02-29');
});
test('all file types project tasks with collision-free ids, including closed and investigation files', () => {
  const a = app();
  a.davalar = [file({ durum: 'Kapalı', dosyaTuru: 'sorusturma' })];
  a.icralar = [file({ durum: 'Kapalı' })];
  a.arabuluculukDosyalar = [file({ durum: 'Kapalı', taraflar: [{ isim: 'Çağrı Şen' }] })];
  assert.equal(a.evrakGoreviAjandaKayitlari.length, 3);
  assert.equal(new Set(a.evrakGoreviAjandaKayitlari.map(k => k.id)).size, 3);
  assert.equal(a.tarihsizEvrakGorevleri.length, 3);
  assert.equal(a.ajandaKayitlari.length, 0);
  assert.equal(a.ajandaOzet.toplam, 3);
});
test('completed tasks excluded, parent completion does not hide unfinished child tasks', () => {
  const a = app(); a.davalar = [file({ evraklar: [doc({ tamamlandiMi: true,
    gorevler: [task({ tamamlandiMi: true }), task({ id: 4 })] })] })];
  assert.deepEqual(a.tarihsizEvrakGorevleri.map(k => k.gorevId), [4]);
});
test('date, type and Turkish text filters apply; undated tasks stay separate', () => {
  const a = app(); const today = a.gunBazliIsoTarih(new Date());
  a.davalar = [file({ evraklar: [doc({ gorevler: [task(), task({ id: 4, tarih: today })] })] })];
  a.ajandaTurFiltresi = 'evrakGorevi'; a.ajandaZamanFiltresi = 'today'; a.ajandaArama = 'İSTİNAFA';
  assert.equal(a.filtrelenmisAjandaKayitlari.length, 1);
  assert.equal(a.tarihsizEvrakGorevleri.length, 1);
  a.ajandaArama = '2026/123';
  assert.equal(a.filtrelenmisAjandaKayitlari.length, 1);
  a.ajandaTurFiltresi = 'durusma';
  assert.equal(a.filtrelenmisAjandaKayitlari.length, 0);
  assert.equal(a.tarihsizEvrakGorevleri.length, 0);
});
test('dated tasks appear in both month and week calendars, undated ones do not', () => {
  const a = app();
  a.davalar = [file({ evraklar: [doc({ gorevler: [task(), task({ id: 4, tarih: '2026-09-10' })] })] })];
  a.ajandaTakvimOdakTarihi = '2026-09-10'; a.ajandaTakvimSeciliTarih = '2026-09-10';
  for (const days of [a.ajandaAyTakvimGunleri, a.ajandaHaftaTakvimGunleri]) {
    assert.equal(days.find(d => d.tarih === '2026-09-10').kayitlar[0].gorevId, 4);
    assert.equal(days.reduce((sum, d) => sum + d.kayitlar.length, 0), 1);
  }
});
test('agenda completion updates only the exact source task, never parent or unrelated file', async () => {
  const a = app(); const original = file();
  a.davalar = [original]; a.icralar = [file()]; a.aktifSayfa = 'ajanda';
  const selected = a.evrakGoreviAjandaKayitlari.find(k => k.kaynak === 'icra');
  await a.ajandaKaydiTamamla(selected);
  assert.equal(a.icralar[0].evraklar[0].gorevler[0].tamamlandiMi, true);
  assert.equal(a.icralar[0].evraklar[0].tamamlandiMi, undefined);
  assert.equal(a.davalar[0], original);
  assert.equal(a.evrakGoreviAjandaKayitlari.length, 1);
});
test('reopening a task restores agenda entry and leaves its record in place', async () => {
  const a = app(); openFile(a);
  await a.evrakGoreviDurumDegistir(2, 3, true);
  assert.equal(a.tarihsizEvrakGorevleri.length, 0);
  assert.equal(a.seciliDava.evraklar[0].gorevler.length, 1);
  await a.evrakGoreviDurumDegistir(2, 3, false);
  assert.equal(a.tarihsizEvrakGorevleri.length, 1);
  assert.equal(a.seciliDava.evraklar[0].gorevler[0].tamamlanmaTarihi, '');
});
test('stale agenda objects use latest source record, missing tasks and files are not recreated', async () => {
  const a = app(); openFile(a);
  const entry = a.tarihsizEvrakGorevleri[0];
  a.davalar[0] = { ...a.davalar[0], konu: 'Daha yeni bilgi' };
  await a.ajandaKaydiTamamla(entry);
  assert.equal(a.davalar[0].konu, 'Daha yeni bilgi');
  assert.equal(await a.evrakGoreviDurumDegistir(2, 999, true), false);
  a.davalar = [];
  assert.equal(await a.ajandaKaydiTamamla(entry), false);
});
test('failed writes leave original task and agenda intact', async () => {
  const a = app(); const original = openFile(a);
  a.davaKaydetCloud = async () => false;
  assert.equal(await a.ajandaKaydiTamamla(a.tarihsizEvrakGorevleri[0]), false);
  assert.equal(a.davalar[0], original);
  assert.equal(a.tarihsizEvrakGorevleri.length, 1);
});
test('nested task completion preserves sibling tasks, document deadlines and finance', async () => {
  const a = app();
  openFile(a, file({ finansalIslemler: [{ id: 10, tutar: 500 }], evraklar: [
    doc({ sonEylemTarihi: '2026-09-20', ekler: [doc({ id: 5 })] })
  ] }));
  await a.ajandaKaydiTamamla(a.evrakGoreviAjandaKayitlari.find(k => k.evrakId === 5));
  const saved = a.davalar[0];
  assert.equal(saved.evraklar[0].ekler[0].gorevler[0].tamamlandiMi, true);
  assert.equal(saved.evraklar[0].gorevler[0].tamamlandiMi, undefined);
  assert.equal(saved.evraklar[0].sonEylemTarihi, '2026-09-20');
  assert.deepEqual(saved.finansalIslemler, [{ id: 10, tutar: 500 }]);
});
test('repeated completion while saving does not issue competing file writes', async () => {
  const a = app(); openFile(a);
  let finish; let writes = 0;
  a.davaKaydetCloud = () => { writes++; return new Promise(resolve => { finish = resolve; }); };
  const entry = a.tarihsizEvrakGorevleri[0];
  const first = a.ajandaKaydiTamamla(entry);
  assert.equal(await a.ajandaKaydiTamamla(entry), false);
  assert.equal(writes, 1);
  finish(false); await first;
  const retry = a.ajandaKaydiTamamla(entry);
  assert.equal(writes, 2); finish(false); await retry;
});
test('creation, editing date, clearing date, deletion all reflect in agenda', async () => {
  const a = app(); openFile(a, file({ evraklar: [doc({ gorevler: [] })] }));
  a.yeniEvrakGorevMetinleri[2] = 'Yeni görev'; a.yeniEvrakGorevTarihleri[2] = '2026-09-12';
  await a.evrakGoreviEkle(2);
  const g = a.seciliDava.evraklar[0].gorevler[0];
  assert.equal(a.ajandaKayitlari[0].tarih, '2026-09-12');
  a.evrakGoreviDuzenleBaslat(2, g);
  a.duzenlenenEvrakGorevi.tarih = '2026-09-14'; a.duzenlenenEvrakGorevi.metin = 'Düzeltilmiş görev';
  await a.evrakGoreviDuzenlemeKaydet();
  assert.equal(a.ajandaKayitlari[0].tarih, '2026-09-14');
  assert.equal(a.ajandaKayitlari[0].baslik, 'Düzeltilmiş görev');
  a.evrakGoreviDuzenleBaslat(2, a.seciliDava.evraklar[0].gorevler[0]);
  a.duzenlenenEvrakGorevi.tarih = '';
  await a.evrakGoreviDuzenlemeKaydet();
  assert.equal(a.ajandaKayitlari.length, 0); assert.equal(a.tarihsizEvrakGorevleri.length, 1);
  await a.evrakGoreviSil(2, g.id);
  assert.equal(a.tarihsizEvrakGorevleri.length, 0);
});
test('navigation and exported calendar link target source document tab', () => {
  const a = app(); openFile(a);
  a.detayGecisiIcinArayuzuHazirla = () => {};
  a.gezinmeGecmisineEkle = () => {};
  const entry = a.tarihsizEvrakGorevleri[0];
  a.ajandaKaydinaGit(entry);
  assert.equal(a.aktifSayfa, 'detay'); assert.equal(a.aktifDetaySekmesi, 'evraklar');
  const url = new URL(a.googleCalendarDosyaBaglantisi(entry));
  assert.equal(url.searchParams.get('detaySekmesi'), 'evraklar');
  assert.equal(url.searchParams.get('dosyaId'), '1');
});
