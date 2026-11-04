import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
function fixture() {
  const a = runInInjectionContext(injector, () => new AppComponent());
  a.davalar = [];
  a.icralar = [];
  a.muvekkiller = [];
  a.arabuluculukDosyalar = [
    { id: 1, arabuluculukNo: '2026/1', vekaletUcreti: 1200, hizmetUcretiStopajli: true, taraflar: [{ isim: 'Birinci Firma' }] },
    { id: 2, arabuluculukNo: '2026/2', vekaletUcreti: 2400, hizmetUcretiStopajli: false, taraflar: [{ isim: 'Kaya' }] }
  ];
  return a;
}
test('summary uses gross minus VAT, including receipts without withholding', () => {
  const a = fixture();
  assert.equal(a.filtrelenmisMuhasebeOzet.toplam, 3000);
  assert.equal(a.filtrelenmisMuhasebeOzet.netKar, 2400);
  assert.equal(a.muhasebeOzet.toplam, 3400);
  assert.equal(a.muhasebeListesi.find(i => i.id === 1).netHizmetUcreti, 800);
  assert.equal(a.muhasebeListesi.find(i => i.id === 2).netHizmetUcreti, 1600);
});
test('search and type filter affect cards without changing global overview', () => {
  const a = fixture();
  a.muhasebeArama = '  BİRİNCİ  ';
  assert.equal(a.filtrelenmisMuhasebeOzet.toplam, 1000);
  assert.equal(a.filtrelenmisMuhasebeOzet.netKar, 800);
  assert.equal(a.muhasebeOzet.toplam, 3400);
  a.muhasebeFiltre = 'İcra';
  assert.equal(a.filtrelenmisMuhasebeOzet.toplam, 0);
});
test('partial payments reduce gross and VAT proportionally; paid files stay excluded', () => {
  const a = fixture();
  a.arabuluculukDosyalar[0].finansalIslemler = [{ tur: 'Ödeme', tutar: 600, makbuzStopajli: true }];
  a.arabuluculukDosyalar[1].finansalIslemler = [{ tur: 'Ödeme', tutar: 2400, makbuzStopajli: false }];
  assert.equal(a.filtrelenmisMuhasebeOzet.toplam, 500);
  assert.equal(a.filtrelenmisMuhasebeOzet.netKar, 400);
  assert.equal(a.muhasebeListesi.length, 1);
  assert.equal(a.muhasebeListesi[0].netHizmetUcreti, 800);
});

test('civil and enforcement rows retain the existing twenty percent net fee convention', () => {
  const a = fixture();
  a.davalar = [{ id: 3, dosyaNo: '2026/3', vekaletUcreti: 1000 }];
  a.icralar = [{ id: 4, icraDairesi: 'Ornek', dosyaNo: '2026/4' }];
  a.getDosyaFinans = () => ({ anlasilanUcret: 2000, toplamTahsilat: 500, kalanVekalet: 1500 });
  assert.equal(a.muhasebeListesi.find(i => i.tip === 'Avukatlık').netHizmetUcreti, 800);
  assert.equal(a.muhasebeListesi.find(i => i.tip === 'İcra').netHizmetUcreti, 1600);
});
