import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
const app = () => {
  const a = runInInjectionContext(injector, () => new AppComponent());
  const date = '2026-09-15';
  a.aktifSayfa = 'dashboard'; a.ajandaTakvimOdakTarihi = date; a.ajandaTakvimSeciliTarih = date;
  a.davalar = [{ id: 1, mahkeme: 'Örnek Mahkeme', muvekkil: 'Örnek kişi', durum: 'Derdest', durusmaTarihi: date, durusmaSaati: '10:00',
    evraklar: [{ id: 2, isim: 'Ara karar', sonEylemTarihi: date, gorevler: [{ id: 3, metin: 'Tarihli evrak görevi', tarih: date }] },
      { id: 4, isim: 'Diğer evrak', gorevler: [{ id: 5, metin: 'Tarihsiz görev' }] }] }];
  a.arabuluculukDosyalar = [{ id: 6, arabuluculukNo: '2026/1', taraflar: [], durum: 'Müzakere', toplantiTarihi: date, toplantiSaati: '14:00' }];
  a.icralar = [{ id: 7, icraDairesi: 'Örnek İcra', dosyaNo: '2026/2', alacakli: 'Alacaklı', borclu: 'Borçlu', durum: 'Açık', takipTarihi: date,
    evraklar: [{ id: 8, isim: 'İcra evrakı', gorevler: [{ id: 9, metin: 'İcra görevi', tarih: date }] }] }];
  a.ofisGorevleri = [{ id: 10, baslik: 'Ofis görevi', tarih: date, oncelik: 'Normal' }];
  return a;
};

test('overview month and week use the same agenda records without duplicate start dates or undated tasks', () => {
  const a = app();
  assert.equal(a.aktifTakvimGorunumu, 'ay');
  assert.equal(a.ajandaTakvimDonemKayitSayisi, 6);
  const overview = a.ajandaTakvimSeciliGunKayitlari.map(k => k.id);
  assert.equal(new Set(overview).size, 6);
  assert.equal(a.ajandaAyTakvimGunleri.length, 42);
  assert.equal(a.ajandaHaftaTakvimGunleri.length, 7);
  a.aktifSayfa = 'ajanda';
  assert.deepEqual(a.ajandaTakvimSeciliGunKayitlari.map(k => k.id), overview);
});

test('hidden agenda filters never hide overview appointments and are not reset by overview', () => {
  const a = app();
  a.ajandaArama = 'no match'; a.ajandaTurFiltresi = 'toplanti'; a.ajandaZamanFiltresi = 'overdue';
  a.aktifSayfa = 'ajanda';
  assert.equal(a.ajandaTakvimDonemKayitSayisi, 0);
  a.aktifSayfa = 'dashboard';
  assert.equal(a.ajandaTakvimDonemKayitSayisi, 6);
  assert.equal(a.ajandaTakvimSeciliGunKayitlari.length, 6);
  a.aktifSayfa = 'ajanda';
  assert.equal(a.ajandaTakvimDonemKayitSayisi, 0);
  assert.equal(a.ajandaArama, 'no match');
  assert.equal(a.ajandaTurFiltresi, 'toplanti');
});

test('overview view choice is independent of agenda list, with correct month/week navigation', () => {
  const a = app(); a.ajandaGorunum = 'liste';
  assert.equal(a.aktifTakvimGorunumu, 'ay');
  assert.match(a.ajandaTakvimDonemBasligi, /Eylül 2026/);
  a.ajandaTakvimGorunumunuDegistir('hafta');
  a.ajandaTakvimDonemDegistir(1);
  assert.equal(a.ajandaTakvimOdakTarihi, '2026-09-22');
  assert.equal(a.ajandaGorunum, 'liste');
  a.ajandaTakvimDonemDegistir(-1);
  a.ajandaTakvimGorunumunuDegistir('ay');
  a.ajandaTakvimDonemDegistir(1);
  assert.equal(a.ajandaTakvimOdakTarihi, '2026-10-01');
  a.ajandaTakvimTarihSec('2026-09-15');
  assert.equal(a.ajandaTakvimSeciliGunKayitlari.length, 6);
  a.ajandaTakvimTarihSec('bad');
  assert.equal(a.ajandaTakvimSeciliTarih, '2026-09-15');
  a.ajandaTakvimBuguneGit();
  assert.equal(a.ajandaTakvimOdakTarihi, a.gunBazliIsoTarih(new Date()));
});

test('overview updates when source tasks complete or meeting dates move', () => {
  const a = app();
  a.davalar[0].evraklar[0].gorevler[0].tamamlandiMi = true;
  a.arabuluculukDosyalar[0].toplantiTarihi = '2026-09-16';
  assert.equal(a.ajandaTakvimSeciliGunKayitlari.length, 4);
  assert.equal(a.ajandaTakvimDonemKayitSayisi, 5);
  a.ajandaTakvimTarihSec('2026-09-16');
  assert.equal(a.ajandaTakvimSeciliGunKayitlari[0].tur, 'toplanti');
});

test('overview events navigate to the correct file/tab or office agenda', () => {
  const a = app(); let destination;
  a.detayaGit = d => { destination = ['dava', d.id]; };
  a.icraDetayinaGit = d => { destination = ['icra', d.id]; };
  a.arabuluculukDetayinaGit = d => { destination = ['arabuluculuk', d.id]; };
  a.sayfaDegistir = page => { destination = [page]; };
  for (const k of a.ajandaTakvimSeciliGunKayitlari) {
    a.ajandaKaydinaGit(k);
    assert.deepEqual(destination, k.kaynak === 'ofis' ? ['ajanda'] : [k.kaynak, k.dosya.id]);
    if (k.tur === 'evrakGorevi') assert.equal(a.aktifDetaySekmesi, 'evraklar');
    if (k.tur === 'sureliIs') assert.equal(a.aktifDetaySekmesi, 'sureliIsler');
  }
});
