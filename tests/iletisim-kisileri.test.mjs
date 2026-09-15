import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { iletisimKisileriniOlustur } from '../src/app/iletisim-kisileri.ts';
import { IletisimKisiSeciciComponent } from '../src/app/iletisim-kisi-secici.component.ts';
import { AppComponent } from '../src/app/app.component.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
const app = () => {
  const a = runInInjectionContext(injector, () => new AppComponent());
  a.bildirimGoster = () => {};
  return a;
};
const kisiler = [
  { id: 1, adSoyad: 'Çağrı Şen', telefon: '0500 000 00 01', eposta: 'cagri@example.invalid', tcKimlik: '11111111111' },
  { id: 2, adSoyad: 'Av. Ece Işık', telefon: '0500 000 00 02', eposta: 'ece@example.invalid', tcKimlik: '22222222222' },
  { id: 3, adSoyad: 'Örnek Şirket', telefon: '0212 000 00 03', eposta: 'ofis@example.invalid', tcKimlik: '3333333333' },
  { id: 4, adSoyad: 'Dosya dışındaki kişi', telefon: '0500 000 00 04', eposta: 'disarida@example.invalid' }
];
const arb = () => ({ id: 10, durum: 'Müzakere', taraflar: [
  { id: 1, tip: 'Başvurucu', isim: 'Çağrı Şen', muvekkilId: 1, telefon: '05000000009', vekilMuvekkilId: 2, vekil: 'Av. Ece Işık' },
  { id: 2, tip: 'Diğer Taraf', isim: 'Örnek Şirket', muvekkilId: 3 },
  { id: 3, tip: 'Diğer Taraf', isim: 'İletişimi eksik kişi' }
] });

test('mediation limits contacts to file parties and lawyers, prioritizes file values and does not mutate data', () => {
  const d = arb(); const before = structuredClone({ d, kisiler });
  const result = iletisimKisileriniOlustur('arabuluculuk', d, kisiler);
  assert.equal(result.length, 4);
  assert.deepEqual(result[0].telefonlar, ['05000000009', '0500 000 00 01']);
  assert.equal(result[1].kisi, 'Av. Ece Işık');
  assert.match(result[1].rol, /Başvurucu vekili · Çağrı Şen/);
  assert.deepEqual(result[1].epostalar, ['ece@example.invalid']);
  assert.deepEqual(result[3].telefonlar, []);
  assert.deepEqual({ d, kisiler }, before);
  assert.deepEqual(iletisimKisileriniOlustur('arabuluculuk', d, kisiler), result);
});

test('ambiguous names, stale IDs and unmatched identity numbers never borrow another contact', () => {
  const registry = [...kisiler, { ...kisiler[0], id: 5, telefon: 'WRONG' }];
  const d = { id: 1, taraflar: [
    { isim: 'Çağrı Şen' }, { isim: 'Çağrı Şen', muvekkilId: 99 },
    { isim: 'Örnek Şirket', tcVergiNo: '9999999999' },
    { isim: 'Çağrı Şen', muvekkilId: 1 },
    { isim: 'Av. Ece Işık', tcVergiNo: '22222222222' }
  ] };
  const result = iletisimKisileriniOlustur('arabuluculuk', d, registry);
  assert.deepEqual(result.slice(0, 3).map(k => k.telefonlar), [[], [], []]);
  assert.equal(result[3].telefonlar[0], kisiler[0].telefon);
  assert.equal(result[4].telefonlar[0], kisiler[1].telefon);
});

test('unique Turkish names resolve and duplicate contact formatting is removed', () => {
  const d = { id: 1, taraflar: [{ isim: '  ÖRNEK ŞİRKET ', telefon: '02120000003', eposta: 'OFIS@example.invalid' }] };
  const [result] = iletisimKisileriniOlustur('arabuluculuk', d, kisiler);
  assert.deepEqual(result.telefonlar, ['02120000003']);
  assert.deepEqual(result.epostalar, ['OFIS@example.invalid']);
});

test('civil files use structured parties without duplicating the linked client', () => {
  const result = iletisimKisileriniOlustur('dava', {
    id: 1, muvekkil: 'Çağrı Şen', muvekkilId: 1,
    davacilar: [{ id: 1, isim: 'Çağrı Şen', muvekkilId: 1 }],
    davalilar: [{ id: 2, isim: 'Örnek Şirket', muvekkilId: 3 }]
  }, kisiler);
  assert.deepEqual(result.map(k => k.rol), ['Davacı', 'Davalı']);
  assert.equal(result[1].epostalar[0], kisiler[2].eposta);
});

for (const dosyaTuru of ['ceza', 'sorusturma']) {
  test(`${dosyaTuru} contacts keep criminal roles and legacy files still work`, () => {
    const result = iletisimKisileriniOlustur('dava', {
      id: 1, dosyaTuru, muvekkilId: 1, muvekkil: 'Çağrı Şen',
      cezaTaraflari: [{ isim: 'Çağrı Şen', muvekkilId: 1, rol: 'Şüpheli', muvekkilMi: true }, { isim: 'Diğer kişi', rol: 'Şikâyetçi' }]
    }, kisiler);
    assert.deepEqual(result.map(k => k.rol), ['Şüpheli · Müvekkil', 'Şikâyetçi']);
    const legacy = iletisimKisileriniOlustur('dava', { id: 2, muvekkil: 'Çağrı Şen', karsiTaraf: 'Şirket, A.Ş.;İkinci kişi' }, kisiler);
    assert.deepEqual(legacy.map(k => k.kisi), ['Çağrı Şen', 'Şirket, A.Ş.', 'İkinci kişi']);
  });
}

test('enforcement debtor client does not supply the creditor phone and account-only contacts are selectable', () => {
  const result = iletisimKisileriniOlustur('icra', {
    id: 1, muvekkilRolu: 'Borçlu', muvekkilId: 1, muvekkil: 'Çağrı Şen', alacakli: 'Örnek Şirket', borclu: 'Çağrı Şen'
  }, kisiler);
  assert.deepEqual(result.map(k => k.rol), ['Alacaklı', 'Borçlu']);
  assert.equal(result[0].telefonlar[0], kisiler[2].telefon);
  assert.equal(result[1].telefonlar[0], kisiler[0].telefon);
  const [account] = iletisimKisileriniOlustur('arabuluculuk', { id: 2, taraflar: [], muvekkilId: 3 }, kisiler);
  assert.equal(account.rol, 'Hesap muhatabı');
  assert.equal(account.kisi, kisiler[2].adSoyad);
  assert.deepEqual(iletisimKisileriniOlustur('icra', { id: 3 }, kisiler), []);
});

test('picker searches and auto-fills both methods, clears stale contacts and retains manual edits', () => {
  const a = app(); const picker = new IletisimKisiSeciciComponent();
  picker.secenekler = iletisimKisileriniOlustur('arabuluculuk', arb(), kisiler);
  const form = { kisi: '', notlar: 'Not değişmesin', tarih: '2026-09-15', saat: '10:30', yontem: 'Telefon Araması', baglantiUrl: 'https://example.invalid/not' };
  picker.kisiSecildi.subscribe(value => a.iletisimNotuKisiSecildi(value, form));
  picker.arama = 'ECE IŞIK';
  assert.equal(picker.filtrelenmisSecenekler.length, 1);
  picker.sec(picker.filtrelenmisSecenekler[0].anahtar);
  assert.equal(form.kisi, kisiler[1].adSoyad);
  assert.equal(form.eposta, kisiler[1].eposta);
  form.yontem = 'E-posta';
  assert.equal(a.iletisimNotuEpostaAlaniGoster(form.yontem), true);
  assert.equal(form.telefon, kisiler[1].telefon);
  picker.sec(picker.secenekler[3].anahtar);
  assert.equal(form.telefon, ''); assert.equal(form.eposta, '');
  picker.modDegistir('manuel'); form.telefon = 'Elle girilen';
  picker.modDegistir('dosya');
  assert.equal(form.telefon, 'Elle girilen');
  assert.equal(form.notlar, 'Not değişmesin');
  assert.equal(form.baglantiUrl, 'https://example.invalid/not');
  picker.sec(picker.secenekler[0].anahtar);
  picker.iletisimSec('telefon', kisiler[0].telefon);
  assert.equal(form.telefon, kisiler[0].telefon);
});

test('picker edit initialization and resets never emit or overwrite a historical note', () => {
  const picker = new IletisimKisiSeciciComponent();
  let count = 0; picker.kisiSecildi.subscribe(() => count++);
  picker.secenekler = iletisimKisileriniOlustur('arabuluculuk', arb(), kisiler);
  picker.manuelBasla = true;
  picker.ngOnChanges({ manuelBasla: { firstChange: true } });
  assert.equal(picker.mod, 'manuel'); assert.equal(count, 0);
  picker.manuelBasla = false;
  picker.sec(picker.secenekler[0].anahtar);
  picker.arama = 'test';
  picker.ngOnChanges({ sifirlamaAnahtari: { firstChange: false } });
  assert.equal(picker.seciliAnahtar, ''); assert.equal(picker.arama, ''); assert.equal(count, 1);
});

for (const [page, selected, save] of [
  ['detay', 'seciliDava', 'davaKaydetCloud'],
  ['icraDetay', 'seciliIcra', 'icraKaydetCloud'],
  ['arabuluculukDetay', 'seciliArabuluculuk', 'arabuluculukKaydetCloud']
]) {
  test(`${page}: contact snapshots save, update, and survive failed writes without changing the source party`, async () => {
    const a = app(); a.aktifSayfa = page; a[selected] = { ...arb(), iletisimNotlari: [] }; a.muvekkiller = structuredClone(kisiler);
    const original = structuredClone(a[selected].taraflar);
    a.yeniIletisimNotu = { kisi: 'Av. Ece Işık', telefon: '05000000002', eposta: 'ece@example.invalid', tarih: '2026-09-15', yontem: 'SMS', notlar: 'Örnek not' };
    const draft = structuredClone(a.yeniIletisimNotu);
    a[save] = async () => false;
    await a.iletisimNotuKaydet();
    assert.deepEqual(a.yeniIletisimNotu, draft);
    assert.equal(a[selected].iletisimNotlari.length, 0);
    let saved;
    a[save] = async d => { saved = structuredClone(d); return true; };
    await a.iletisimNotuKaydet();
    assert.equal(saved.iletisimNotlari[0].telefon, draft.telefon);
    assert.equal(a.yeniIletisimNotu.kisi, '');
    assert.equal(a.iletisimKisiSecimiSurumu, 1);
    const note = a[selected].iletisimNotlari[0];
    a.iletisimNotuDuzenlemeBaslat(note);
    a.iletisimNotuKisiSecildi({ kisi: 'Manuel kişi', telefon: '', eposta: '' }, a.duzenlenenIletisimNotu);
    assert.equal(note.kisi, draft.kisi);
    a[save] = async () => false;
    await a.iletisimNotuGuncelleKaydet();
    assert.equal(a.duzenlenenIletisimNotu.kisi, 'Manuel kişi');
    assert.equal(a[selected].iletisimNotlari[0].kisi, draft.kisi);
    a[save] = async d => { saved = structuredClone(d); return true; };
    await a.iletisimNotuGuncelleKaydet();
    assert.equal(saved.iletisimNotlari[0].kisi, 'Manuel kişi');
    assert.equal(a.duzenlenenIletisimNotuId, null);
    assert.deepEqual(a[selected].taraflar, original);
    assert.deepEqual(a.muvekkiller, kisiler);
  });
}

test('finishing a save after navigation never replaces the new active file or its draft', async () => {
  const a = app(); a.aktifSayfa = 'detay'; a.seciliDava = { id: 1 };
  a.yeniIletisimNotu = { kisi: 'Örnek kişi', tarih: '2026-09-15', notlar: 'Not' };
  let finish;
  a.davaKaydetCloud = () => new Promise(resolve => { finish = resolve; });
  const saving = a.iletisimNotuKaydet();
  a.aktifSayfa = 'icraDetay'; a.seciliIcra = { id: 1, muvekkil: 'Başka kişi' };
  a.iletisimNotuFormunuSifirla(); a.yeniIletisimNotu.kisi = 'Başka taslak';
  finish(true); await saving;
  assert.deepEqual(a.seciliIcra, { id: 1, muvekkil: 'Başka kişi' });
  assert.equal(a.yeniIletisimNotu.kisi, 'Başka taslak');
});
