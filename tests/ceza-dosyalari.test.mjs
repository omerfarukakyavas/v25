import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppComponent } from '../src/app/app.component.ts';
import { cezaDosyasiMi, cezaFormHatasi, cezaTarafAlanlari, cezaTarafRolleri, davaAramaEslesir, davaTurEtiketi, sorusturmadanCezaTaslagi } from '../src/app/ceza-dosyalari.ts';

globalThis.window = { location: { search: '', origin: 'http://localhost', href: 'http://localhost/' }, setTimeout, clearTimeout };
const injector = createEnvironmentInjector([{ provide: ChangeDetectorRef, useValue: { detectChanges() {} } }]);
function app() {
  const instance = runInInjectionContext(injector, () => new AppComponent());
  instance.bildirimGoster = () => {};
  return instance;
}
const taraf = (overrides = {}) => ({ id: 1, isim: 'Çağrı Şen', rol: 'Şüpheli', muvekkilMi: true, ...overrides });
const soru = (overrides = {}) => ({ id: 101, dosyaTuru: 'sorusturma', mahkeme: 'İstanbul Anadolu Cumhuriyet Başsavcılığı',
  dosyaNo: 'SORUŞTURMA: 2026/123', dosyaNumaralari: [{ tur: 'SORUŞTURMA', no: '2026/123' }],
  cezaTaraflari: [taraf()], muvekkil: 'Çağrı Şen', karsiTaraf: '-', konu: 'Test konusu', durum: 'Derdest', ...overrides });

test('legacy records are not inferred to be civil or criminal', () => {
  const legacy = { mahkeme: 'Ceza Mahkemesi', dosyaNo: '2020/1' };
  assert.equal(cezaDosyasiMi(legacy), false);
  assert.match(davaTurEtiketi(legacy), /belirtilmemiş/);
  assert.equal(legacy.dosyaTuru, undefined);
});
test('investigation can be saved without decision or opposing party', () => assert.equal(cezaFormHatasi(soru(), []), ''));
test('decision number cannot replace investigation number', () => {
  assert.match(cezaFormHatasi(soru({ dosyaNumaralari: [{ tur: 'KARAR', no: '2026/9' }] }), []), /Soruşturma numarasını/);
});
test('criminal case requires an esas number and court', () => {
  assert.match(cezaFormHatasi(soru({ dosyaTuru: 'ceza' }), []), /Esas numarasını/);
  assert.match(cezaFormHatasi(soru({ mahkeme: '' }), []), /Başsavcılık/);
});
test('registered contact is not implicitly a represented client', () => {
  assert.match(cezaFormHatasi(soru({ cezaTaraflari: [taraf({ muvekkilMi: false, muvekkilId: 90 })] }), []), /müvekkiliniz/);
});
test('every named party must have a valid role', () => {
  assert.match(cezaFormHatasi(soru({ cezaTaraflari: [taraf({ rol: 'Sanık' })] }), []), /rol seçin/);
  assert.equal(cezaTarafRolleri('ceza').includes('Katılan'), true);
});
test('partially filled unnamed parties are not silently discarded', () => {
  assert.match(cezaFormHatasi(soru({ cezaTaraflari: [taraf(), taraf({ id: 2, isim: '', rol: '', muvekkilMi: false, telefon: '555' })] }), []), /adını da/);
});
test('multiple roles and represented parties survive normalization', () => {
  const result = cezaTarafAlanlari([taraf(), taraf({ id: 2, rol: 'Şikâyetçi' }), taraf({ id: 3, isim: 'Ece Işık', muvekkilMi: false, rol: 'Mağdur' })]);
  assert.equal(result.cezaTaraflari.length, 3);
  assert.equal(result.muvekkil, 'Çağrı Şen');
  assert.equal(result.muvekkilPozisyonu, 'Şüpheli, Şikâyetçi');
  assert.equal(result.karsiTaraf, 'Mağdur: Ece Işık');
});
test('search includes Turkish names, all case numbers, institution and decision', () => {
  const d = soru({ kararTuru: 'Karar açıklaması', dosyaNumaralari: [{ tur: 'SORUŞTURMA', no: '2026/123' }, { tur: 'KARAR', no: '2026/9' }] });
  for (const query of ['ÇAĞRI ŞEN', 'İSTANBUL 2026/9', 'karar açıklaması']) assert.equal(davaAramaEslesir(d, query), true);
  assert.equal(davaAramaEslesir(d, 'olmayan kişi'), false);
});
test('linked draft copies identity only and leaves source untouched', () => {
  const source = soru({ vekaletUcreti: 5000, finansalIslemler: [{ id: 2, tutar: 900 }], portalMuvekkilIdleri: [3], evraklar: [{ url: 'private' }], notlar: 'private', kararTuru: 'Eski karar' });
  const before = structuredClone(source);
  const draft = sorusturmadanCezaTaslagi(source);
  assert.equal(draft.cezaTaraflari[0].rol, 'Sanık');
  assert.equal(draft.baglantiliSorusturmaId, 101);
  assert.equal(draft.vekaletUcreti, 0);
  for (const key of ['finansalIslemler', 'portalMuvekkilIdleri', 'evraklar', 'notlar', 'kararTuru']) assert.equal(draft[key], undefined);
  draft.cezaTaraflari[0].isim = 'Değişti';
  assert.deepEqual(source, before);
});
test('invalid or self-linked investigation is rejected', () => {
  const draft = { ...sorusturmadanCezaTaslagi(soru()), mahkeme: 'Test Ceza Mahkemesi', dosyaNumaralari: [{ tur: 'ESAS', no: '2026/88' }] };
  assert.match(cezaFormHatasi(draft, []), /bulunamadı/);
  assert.equal(cezaFormHatasi(draft, [soru()]), '');
  assert.match(cezaFormHatasi({ ...draft, id: 101 }, [soru()]), /bulunamadı/);
});
test('real component saves and reopens investigation without changing civil records', async () => {
  const a = app();
  const legacy = { id: 42, dosyaNo: '2020/1', muvekkil: 'Eski', karsiTaraf: 'Diğer', mahkeme: 'Hukuk', durum: 'Kapalı', konu: '-' };
  a.davalar = [legacy];
  a.dosyaFormunuAc();
  a.davaTuruDegisti('sorusturma');
  Object.assign(a.islemGorenDava, soru({ id: undefined }));
  let stored;
  a.davaKaydetCloud = async d => { stored = structuredClone(d); return true; };
  await a.davaKaydet();
  assert.equal(stored.cezaTaraflari[0].rol, 'Şüpheli');
  assert.equal(stored.muvekkil, 'Çağrı Şen');
  assert.equal(stored.portalMuvekkilIdleri, undefined);
  assert.equal(a.davaFormAcik, false);
  a.dosyaFormunuAc(stored);
  a.islemGorenDava.cezaTaraflari[0].isim = 'Taslak değişikliği';
  a.davaFormKapat();
  assert.equal(stored.cezaTaraflari[0].isim, 'Çağrı Şen');
  assert.equal(legacy.dosyaTuru, undefined);
});
test('failed saves keep form open with user data', async () => {
  const a = app();
  a.dosyaFormunuAc();
  Object.assign(a.islemGorenDava, soru());
  a.davaKaydetCloud = async () => false;
  await a.davaKaydet();
  assert.equal(a.davaFormAcik, true);
  assert.match(a.formHata, /tamamlanamadı/);
  assert.equal(a.davaKaydediliyor, false);
});
test('filtering distinguishes legacy, civil, criminal and investigation', () => {
  const a = app();
  a.davalar = [soru(), soru({ id: 102, dosyaTuru: 'ceza' }), soru({ id: 103, dosyaTuru: 'hukuk' }), soru({ id: 104, dosyaTuru: undefined })];
  for (const [filter, id] of [['sorusturma', 101], ['ceza', 102], ['hukuk', 103], ['belirtilmemis', 104]]) {
    a.davaTuruFiltresi = filter;
    assert.deepEqual(a.filtrelenmisDavalar.map(d => d.id), [id]);
  }
});
test('investigation parties appear in contact relationships and task selector', () => {
  const a = app();
  a.davalar = [soru({ cezaTaraflari: [taraf(), taraf({ id: 2, isim: 'Ece Işık', rol: 'Şikâyetçi', muvekkilMi: false, muvekkilId: 9 })] })];
  assert.equal(a.getMuvekkilBaglantiliDosyalari({ id: 9, adSoyad: 'Ece Işık' }).length, 1);
  assert.match(a.ofisGoreviDosyaSecenekleri[0].taraflar, /Şikâyetçi: Ece Işık/);
});
test('investigation dates do not create a fake hearing; criminal hearing is scheduled', () => {
  const a = app();
  a.davalar = [soru({ durusmaTarihi: '2030-10-10' }), soru({ id: 102, dosyaTuru: 'ceza', durusmaTarihi: '2030-10-10' })];
  assert.equal(a.ajandaKayitlari.filter(k => k.tur === 'durusma').length, 1);
});
test('portal projection preserves roles and excludes unshared finance and documents', () => {
  const a = app();
  const d = soru({ notlar: 'private note', evraklar: [{ id: 1, isim: 'Private document', url: 'https://example.com/private' }], finansalIslemler: [] });
  const projected = a.portalDosyaKaydiniOlustur(9, 'dava', d);
  assert.equal(projected.dosyaTuru, 'sorusturma');
  assert.deepEqual(projected.taraflar, ['Şüpheli: Çağrı Şen']);
  assert.deepEqual(projected.evraklar, []);
  assert.equal(projected.finansOzeti, undefined);
  assert.equal(projected.notlar, undefined);
});

test('editing a criminal file retains finance, notes, documents and sharing permissions', async () => {
  const a = app();
  const stored = soru({ vekaletUcreti: 5000, finansalIslemler: [{ id: 1, tutar: 1000, tur: 'Vekalet Ücreti' }],
    evraklar: [{ id: 2, isim: 'Belge', url: 'https://example.com/test' }], notlar: '<p>Not</p>',
    iletisimNotlari: [{ id: 3, not: 'Not' }], portalMuvekkilIdleri: [9] });
  a.davalar = [stored];
  a.dosyaFormunuAc(stored);
  a.islemGorenDava.kararTuru = 'Örnek karar';
  let saved;
  a.davaKaydetCloud = async d => { saved = structuredClone(d); return true; };
  await a.davaKaydet();
  for (const key of ['vekaletUcreti', 'finansalIslemler', 'evraklar', 'notlar', 'iletisimNotlari', 'portalMuvekkilIdleri']) assert.deepEqual(saved[key], stored[key]);
  assert.equal(saved.kararTuru, 'Örnek karar');
  assert.equal(stored.kararTuru, undefined);
});
test('saving a linked criminal draft does not close investigation or duplicate office receivable', async () => {
  const a = app();
  const source = soru({ vekaletUcreti: 10000 });
  a.davalar = [source];
  a.sorusturmadanCezaOlustur(source);
  a.islemGorenDava.dosyaNumaralari[0].no = '2026/88';
  a.islemGorenDava.mahkeme = 'Örnek Ceza Mahkemesi';
  a.davaKaydetCloud = async d => { a.davalar.push(structuredClone(d)); return true; };
  await a.davaKaydet();
  assert.equal(a.davalar.length, 2);
  assert.equal(source.durum, 'Derdest');
  assert.equal(a.davalar[1].vekaletUcreti, 0);
  assert.equal(a.getBaglantiliCezaDosyalari(source).length, 1);
  assert.equal(a.getBaglantiliCezaDosyalari(a.davalar[1])[0].id, source.id);
});
test('retry after uncertain save uses the same record ID', async () => {
  const a = app();
  a.dosyaFormunuAc();
  Object.assign(a.islemGorenDava, soru({ id: undefined }));
  const ids = [];
  a.davaKaydetCloud = async d => { ids.push(d.id); return ids.length > 1; };
  await a.davaKaydet();
  await new Promise(resolve => setTimeout(resolve, 10));
  await a.davaKaydet();
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]);
});
test('new investigation form starts with investigation and optional decision, not a blank esas', () => {
  const a = app();
  a.dosyaFormunuAc();
  a.davaTuruDegisti('sorusturma');
  assert.deepEqual(a.islemGorenDava.dosyaNumaralari.map(n => n.tur), ['SORUŞTURMA', 'KARAR']);
});

test('switching to civil requires a civil client role without deleting criminal party data', async () => {
  const a = app();
  const stored = soru({ muvekkilPozisyonu: 'Şüpheli' });
  a.dosyaFormunuAc(stored);
  a.davaTuruDegisti('hukuk');
  assert.equal(a.islemGorenDava.muvekkilPozisyonu, undefined);
  a.davaKaydetCloud = async () => { assert.fail('invalid role must not be saved'); };
  await a.davaKaydet();
  assert.match(a.formHata, /pozisyonunu seçin/);
  a.davaTuruDegisti('sorusturma');
  assert.deepEqual(a.islemGorenDava.cezaTaraflari, stored.cezaTaraflari);
});
test('legacy civil files retain existing parties when edited', async () => {
  const a = app();
  const legacy = { id: 9, dosyaNo: '2020/1', mahkeme: 'Örnek Hukuk Mahkemesi', konu: 'Test', durum: 'Kapalı',
    muvekkil: 'Davacı Örnek', muvekkilPozisyonu: 'Davacı', karsiTaraf: 'Davalı Örnek',
    davacilar: [{ id: 1, isim: 'Davacı Örnek' }], davalilar: [{ id: 2, isim: 'Davalı Örnek' }] };
  a.davalar = [legacy];
  a.dosyaFormunuAc(legacy);
  let saved;
  a.davaKaydetCloud = async d => { saved = d; return true; };
  await a.davaKaydet();
  assert.equal(saved.dosyaTuru, undefined);
  assert.equal(saved.davacilar[0].isim, 'Davacı Örnek');
  assert.equal(saved.davalilar[0].isim, 'Davalı Örnek');
  assert.equal(saved.durum, 'Kapalı');
});
