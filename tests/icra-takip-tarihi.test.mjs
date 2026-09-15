import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
const app = () => runInInjectionContext(injector, () => new AppComponent());
const icra = (overrides = {}) => ({
  id: 1, icraDairesi: 'Örnek İcra Dairesi', dosyaNo: '2026/123', muvekkil: 'Örnek kişi',
  alacakli: 'Alacaklı', borclu: 'Borçlu', takipTarihi: '2026-01-15', durum: 'Açık', ...overrides
});

test('past, today and future enforcement start dates do not generate calendar entries or alerts', () => {
  const a = app();
  const today = a.gunBazliIsoTarih(new Date());
  a.icralar = [-10, 0, 1, 7, 30].map((offset, i) => icra({ id: i + 1, takipTarihi: a.gunBazliTarihEkle(today, offset) }));
  const before = structuredClone(a.icralar);
  assert.deepEqual(a.ajandaKayitlari, []);
  assert.deepEqual(a.ajandaKayitlariLegacy, []);
  assert.deepEqual(a.filtrelenmisAjandaKayitlari, []);
  assert.deepEqual(a.yaklasanAjandaKayitlari, []);
  assert.deepEqual(a.bildirimMerkeziKayitlari, []);
  for (const key of ['toplam', 'bugun', 'yakin', 'gecmis']) assert.equal(a.ajandaOzet[key], 0);
  for (const key of ['bugun', 'gecmis', 'yediGun', 'otuzGun']) assert.equal(a.dashboardUyariOzet[key], 0);
  a.ajandaTakvimOdakTarihi = today;
  for (const days of [a.ajandaAyTakvimGunleri, a.ajandaHaftaTakvimGunleri]) {
    assert.equal(days.reduce((count, day) => count + day.kayitlar.length, 0), 0);
  }
  assert.deepEqual(a.icralar, before);
});

test('real enforcement document deadlines and tasks continue producing reminders', () => {
  const a = app();
  const today = a.gunBazliIsoTarih(new Date());
  a.icralar = [icra({ evraklar: [{
    id: 2, isim: 'İtiraz süresi', url: '', tarih: '', sonEylemTarihi: today,
    gorevler: [{ id: 3, metin: 'İtiraz dilekçesini hazırla', tarih: today }]
  }] })];
  assert.deepEqual(a.ajandaKayitlari.map(k => k.tur).sort(), ['evrakGorevi', 'sureliIs']);
  assert.equal(a.bildirimMerkeziKayitlari.length, 2);
  const deadline = a.ajandaKayitlari.find(k => k.tur === 'sureliIs');
  assert.equal(a.getAjandaDurumMetni(deadline), 'Bugün son gün');
  assert.match(a.getAjandaDurumClass(deadline), /critical-pulse/);
  assert.equal(a.ajandaOzet.bugun, 2);
});

test('detail page and optional manual calendar export retain the start date without a countdown', () => {
  const a = app();
  const source = icra();
  a.icralar = [source]; a.seciliIcra = source; a.aktifSayfa = 'icraDetay';
  assert.equal(a.getAktifDosyaKritikTarih(), source.takipTarihi);
  assert.equal(a.getAktifDosyaKritikTarihDurumu(), 'Takip açılış tarihi');
  assert.match(a.getAktifDosyaKritikTarihMetni(), /2026/);
  const entry = a.getAktifIcraTakipAjandaKaydi();
  assert.equal(entry.tarih, source.takipTarihi);
  assert.equal(a.getAjandaDurumMetni(entry), 'Takip başlangıç tarihi');
  assert.doesNotMatch(a.getAjandaDurumClass(entry), /pulse|rose|amber|red/);
  assert.deepEqual(a.ajandaKayitlari, []);
});

test('hearing and mediation meeting dates remain in the agenda', () => {
  const a = app();
  const today = a.gunBazliIsoTarih(new Date());
  a.icralar = [icra({ takipTarihi: today })];
  a.davalar = [{ id: 2, durum: 'Derdest', durusmaTarihi: today, mahkeme: 'Örnek Mahkeme', muvekkil: 'Örnek kişi' }];
  a.arabuluculukDosyalar = [{ id: 3, durum: 'Müzakere', toplantiTarihi: today, arabuluculukNo: '2026/3', taraflar: [] }];
  assert.deepEqual(a.ajandaKayitlari.map(k => k.tur).sort(), ['durusma', 'toplanti']);
  assert.equal(a.ajandaOzet.bugun, 2);
});
