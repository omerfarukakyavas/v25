export type UyapTopluKayitTuru = 'dava' | 'icra' | 'arabuluculuk';

export type UyapTopluAktarimDurumu = 'hazir' | 'kontrol' | 'mukerrer' | 'hata' | 'aktarildi';

export interface UyapTopluAktarimSatiri {
  id: number;
  sira: number;
  secili: boolean;
  acik: boolean;
  tur: UyapTopluKayitTuru;
  dosyaNo: string;
  buroNo: string;
  kurum: string;
  muvekkil: string;
  karsiTaraf: string;
  muvekkilRolu: 'Davacı' | 'Davalı' | 'Alacaklı' | 'Borçlu';
  konu: string;
  durum: string;
  basvuruTuru: 'Dava Şartı' | 'İhtiyari';
  uyusmazlikTuru: string;
  kayitTarihi: string;
  gorevlendirmeTarihi: string;
  sonrakiTarih: string;
  saat: string;
  aktarimDurumu: UyapTopluAktarimDurumu;
  uyarilar: string[];
  kaynakOzeti: string;
}

export interface UyapTopluMatrisSonucu {
  satirlar: UyapTopluAktarimSatiri[];
  basliklar: string[];
  baslikSatiri: number;
  atlananSatirSayisi: number;
}

export const UYAP_TOPLU_AKTARIM_SABLON_BASLIKLARI = [
  'Tür',
  'Dosya No / Arabuluculuk No',
  'Büro No',
  'Mahkeme / İcra Dairesi / Büro',
  'Müvekkil / Başvurucu',
  'Karşı Taraf',
  'Müvekkil Rolü',
  'Konu / Takip Tipi',
  'Durum',
  'Başvuru Türü',
  'Uyuşmazlık Türü',
  'Kayıt / Başvuru Tarihi',
  'Arabulucu Görevlendirme Tarihi',
  'Duruşma / Toplantı Tarihi',
  'Saat'
] as const;

type UyapAlanAnahtari =
  | 'tur'
  | 'dosyaNo'
  | 'buroNo'
  | 'kurum'
  | 'muvekkil'
  | 'karsiTaraf'
  | 'muvekkilRolu'
  | 'konu'
  | 'durum'
  | 'basvuruTuru'
  | 'uyusmazlikTuru'
  | 'kayitTarihi'
  | 'gorevlendirmeTarihi'
  | 'sonrakiTarih'
  | 'saat'
  | 'davaci'
  | 'davali'
  | 'alacakli'
  | 'borclu'
  | 'basvurucu'
  | 'digerTaraf'
  | 'taraflar';

const ALAN_ESLESMELERI: Record<UyapAlanAnahtari, string[]> = {
  tur: ['tur', 'dosya turu', 'dosya tipi', 'birim turu', 'yargi turu', 'kayit turu'],
  dosyaNo: [
    'dosya no arabuluculuk no', 'dosya numarasi', 'dosya no', 'esas no', 'esas numarasi',
    'takip no', 'takip numarasi', 'arabuluculuk no', 'arabuluculuk numarasi', 'dosya esas no'
  ],
  buroNo: ['buro dosya no', 'buro no', 'basvuru no', 'arabuluculuk buro no'],
  kurum: [
    'mahkeme icra dairesi buro', 'mahkeme icra dairesi arabuluculuk burosu', 'mahkeme',
    'icra dairesi', 'arabuluculuk burosu', 'buro', 'birim adi', 'birim', 'kurum adi', 'kurum'
  ],
  muvekkil: ['muvekkil basvurucu', 'muvekkil taraf', 'muvekkil', 'vekil olunan taraf', 'temsil edilen taraf'],
  karsiTaraf: ['karsi taraf', 'diger taraf', 'hasim', 'muhatap'],
  muvekkilRolu: ['muvekkil rolu', 'taraf rolu', 'rol', 'sifat'],
  konu: ['konu takip tipi', 'dava konusu', 'basvuru konusu', 'takip tipi', 'dosya konusu', 'konu'],
  durum: ['dosya durumu', 'takip durumu', 'durum', 'asama'],
  basvuruTuru: ['arabuluculuk basvuru turu', 'basvuru turu', 'arabuluculuk turu'],
  uyusmazlikTuru: ['uyusmazlik turu', 'uyusmazlik konusu', 'arabuluculuk konusu'],
  kayitTarihi: [
    'kayit basvuru tarihi', 'buroya basvuru tarihi', 'basvuru tarihi', 'takip tarihi',
    'acilis tarihi', 'dosya acilis tarihi', 'kayit tarihi'
  ],
  gorevlendirmeTarihi: ['arabulucu gorevlendirme tarihi', 'gorevlendirme tarihi'],
  sonrakiTarih: [
    'durusma toplanti tarihi', 'sonraki durusma tarihi', 'durusma tarihi', 'durusma gunu',
    'toplanti tarihi', 'sonraki islem tarihi'
  ],
  saat: ['durusma saati', 'toplanti saati', 'saat'],
  davaci: ['davaci taraf', 'davaci'],
  davali: ['davali taraf', 'davali'],
  alacakli: ['alacakli taraf', 'alacakli'],
  borclu: ['borclu taraf', 'borclu'],
  basvurucu: ['basvurucu taraf', 'basvurucu', 'basvuran'],
  digerTaraf: ['arabuluculuk diger taraf', 'diger taraflar'],
  taraflar: ['dosya taraflari', 'taraf bilgileri', 'taraflar']
};

const DUZ_ALAN_ESLESMELERI = Object.entries(ALAN_ESLESMELERI)
  .flatMap(([alan, basliklar]) => basliklar.map(baslik => ({ alan: alan as UyapAlanAnahtari, baslik })))
  .sort((a, b) => b.baslik.length - a.baslik.length);

export function uyapMetniniNormalizeEt(metin: unknown) {
  return String(metin ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function uyapDosyaNumarasiniNormalizeEt(metin: unknown) {
  const ham = String(metin ?? '').trim();
  const esasEslesmesi = ham.match(/\b((?:19|20)\d{2})\s*[\/\\-]\s*(\d+)\b/);
  if (esasEslesmesi) return `${esasEslesmesi[1]}/${String(Number(esasEslesmesi[2]))}`;
  return uyapMetniniNormalizeEt(ham).replace(/\s+/g, '');
}

export function uyapKurumunuNormalizeEt(metin: unknown) {
  return uyapMetniniNormalizeEt(metin)
    .replace(/\bmahkemesi\b/g, 'mahkeme')
    .replace(/\b mudurlugu\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uyapTarihMetniniNormalizeEt(metin: unknown) {
  const ham = String(metin ?? '').trim();
  if (!ham) return '';
  const iso = ham.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso && tarihGecerliMi(Number(iso[1]), Number(iso[2]), Number(iso[3]))) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const yerel = ham.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (!yerel) return '';
  const gun = Number(yerel[1]);
  const ay = Number(yerel[2]);
  const yil = Number(yerel[3]);
  if (!tarihGecerliMi(yil, ay, gun)) return '';
  return `${yil.toString().padStart(4, '0')}-${ay.toString().padStart(2, '0')}-${gun.toString().padStart(2, '0')}`;
}

export function uyapTabloMetniniMatriseDonustur(metin: string) {
  const temiz = (metin || '').replace(/^\uFEFF/, '').trim();
  if (!temiz) return [];
  const ilkSatir = temiz.split(/\r?\n/).find(satir => satir.trim()) || '';
  const ayiricilar = ['\t', ';', ','];
  const ayirici = ayiricilar
    .map(deger => ({ deger, adet: ayiriciSay(ilkSatir, deger) }))
    .sort((a, b) => b.adet - a.adet)[0];
  if (!ayirici || ayirici.adet === 0) {
    return temiz.split(/\r?\n/).map(satir => [satir.trim()]).filter(satir => satir[0]);
  }
  return ayrilmisMetniCozumle(temiz, ayirici.deger);
}

export function uyapMatrisiniAktarimSatirlarinaDonustur(
  matris: unknown[][],
  baslangicId = Date.now()
): UyapTopluMatrisSonucu {
  const temizMatris = (matris || [])
    .map(satir => (satir || []).map(hucre => String(hucre ?? '').trim()))
    .filter(satir => satir.some(Boolean));
  if (!temizMatris.length) throw new Error('Aktarılabilecek bir tablo satırı bulunamadı.');

  const baslikAdaylari = temizMatris.slice(0, 20).map((satir, index) => {
    const eslesmeler = satir.map(basliktanAlanBul).filter(Boolean) as UyapAlanAnahtari[];
    const benzersiz = new Set(eslesmeler);
    const temelAlanVar = benzersiz.has('dosyaNo') || benzersiz.has('kurum') || benzersiz.has('tur');
    return { index, puan: benzersiz.size + (temelAlanVar ? 2 : 0), eslesmeler };
  });
  const enIyi = baslikAdaylari.sort((a, b) => b.puan - a.puan)[0];
  if (!enIyi || enIyi.puan < 4) {
    throw new Error('Tablo başlıkları tanınamadı. Örnek Excel şablonunu kullanabilir veya UYAP listesini başlıklarıyla birlikte yapıştırabilirsiniz.');
  }

  const basliklar = temizMatris[enIyi.index];
  const alanlar = basliklar.map(basliktanAlanBul);
  const veriSatirlari = temizMatris.slice(enIyi.index + 1);
  const satirlar = veriSatirlari
    .map((satir, index) => hamSatiriDonustur(satir, alanlar, baslangicId + index, enIyi.index + index + 2))
    .filter((satir): satir is UyapTopluAktarimSatiri => !!satir);

  if (!satirlar.length) throw new Error('Başlık satırı bulundu ancak altında aktarılabilecek dosya kaydı yok.');
  return {
    satirlar,
    basliklar,
    baslikSatiri: enIyi.index + 1,
    atlananSatirSayisi: veriSatirlari.length - satirlar.length
  };
}

function hamSatiriDonustur(
  hucreler: string[],
  alanlar: Array<UyapAlanAnahtari | null>,
  id: number,
  sira: number
): UyapTopluAktarimSatiri | null {
  const degerler = {} as Record<UyapAlanAnahtari, string>;
  alanlar.forEach((alan, index) => {
    const deger = (hucreler[index] || '').trim();
    if (alan && deger && !degerler[alan]) degerler[alan] = deger;
  });
  const kaynakOzeti = hucreler.filter(Boolean).slice(0, 5).join(' • ');
  if (!Object.values(degerler).some(Boolean)) return null;

  const tarafMetni = degerler.taraflar || '';
  const davaci = degerler.davaci || etiketliTarafBul(tarafMetni, ['davacı', 'davaci']);
  const davali = degerler.davali || etiketliTarafBul(tarafMetni, ['davalı', 'davali']);
  const alacakli = degerler.alacakli || etiketliTarafBul(tarafMetni, ['alacaklı', 'alacakli']);
  const borclu = degerler.borclu || etiketliTarafBul(tarafMetni, ['borçlu', 'borclu']);
  const basvurucu = degerler.basvurucu || etiketliTarafBul(tarafMetni, ['başvurucu', 'basvurucu', 'başvuran', 'basvuran']);
  const digerTaraf = degerler.digerTaraf || etiketliTarafBul(tarafMetni, ['diğer taraf', 'diger taraf']);
  const tur = kayitTurunuBelirle(degerler, { davaci, davali, alacakli, borclu, basvurucu, digerTaraf });
  const rol = rolBelirle(tur, degerler.muvekkilRolu);
  const muvekkil = degerler.muvekkil || (tur === 'icra' ? (rol === 'Borçlu' ? borclu : alacakli) : tur === 'arabuluculuk' ? basvurucu : (rol === 'Davalı' ? davali : davaci));
  const karsiTaraf = degerler.karsiTaraf || (tur === 'icra' ? (rol === 'Borçlu' ? alacakli : borclu) : tur === 'arabuluculuk' ? digerTaraf : (rol === 'Davalı' ? davaci : davali));

  return {
    id,
    sira,
    secili: false,
    acik: false,
    tur,
    dosyaNo: degerler.dosyaNo || '',
    buroNo: degerler.buroNo || '',
    kurum: degerler.kurum || '',
    muvekkil: muvekkil || '',
    karsiTaraf: karsiTaraf || '',
    muvekkilRolu: rol,
    konu: degerler.konu || '',
    durum: degerler.durum || '',
    basvuruTuru: basvuruTurunuBelirle(degerler.basvuruTuru),
    uyusmazlikTuru: degerler.uyusmazlikTuru || '',
    kayitTarihi: uyapTarihMetniniNormalizeEt(degerler.kayitTarihi),
    gorevlendirmeTarihi: uyapTarihMetniniNormalizeEt(degerler.gorevlendirmeTarihi),
    sonrakiTarih: uyapTarihMetniniNormalizeEt(degerler.sonrakiTarih),
    saat: saatMetniniNormalizeEt(degerler.saat),
    aktarimDurumu: 'kontrol',
    uyarilar: [],
    kaynakOzeti
  };
}

function basliktanAlanBul(baslik: string): UyapAlanAnahtari | null {
  const normal = uyapMetniniNormalizeEt(baslik);
  if (!normal) return null;
  const tam = DUZ_ALAN_ESLESMELERI.find(eslesme => normal === eslesme.baslik);
  if (tam) return tam.alan;
  const iceren = DUZ_ALAN_ESLESMELERI.find(eslesme => eslesme.baslik.length >= 5 && normal.includes(eslesme.baslik));
  return iceren?.alan || null;
}

function kayitTurunuBelirle(
  degerler: Partial<Record<UyapAlanAnahtari, string>>,
  taraflar: { davaci: string; davali: string; alacakli: string; borclu: string; basvurucu: string; digerTaraf: string }
): UyapTopluKayitTuru {
  const arama = uyapMetniniNormalizeEt([degerler.tur, degerler.kurum, degerler.basvuruTuru].filter(Boolean).join(' '));
  if (arama.includes('arabuluc') || degerler.buroNo || taraflar.basvurucu || taraflar.digerTaraf) return 'arabuluculuk';
  if (arama.includes('icra') || arama.includes('takip') || taraflar.alacakli || taraflar.borclu) return 'icra';
  return 'dava';
}

function rolBelirle(tur: UyapTopluKayitTuru, rolMetni?: string): UyapTopluAktarimSatiri['muvekkilRolu'] {
  const normal = uyapMetniniNormalizeEt(rolMetni);
  if (tur === 'icra') return normal.includes('borclu') ? 'Borçlu' : 'Alacaklı';
  return normal.includes('davali') ? 'Davalı' : 'Davacı';
}

function basvuruTurunuBelirle(metin?: string): UyapTopluAktarimSatiri['basvuruTuru'] {
  const normal = uyapMetniniNormalizeEt(metin);
  return normal.includes('ihtiyari') ? 'İhtiyari' : 'Dava Şartı';
}

function etiketliTarafBul(metin: string, etiketler: string[]) {
  const parcalar = (metin || '').split(/\r?\n|;|\|/).map(parca => parca.trim()).filter(Boolean);
  for (const parca of parcalar) {
    const normal = uyapMetniniNormalizeEt(parca);
    const etiket = etiketler.find(ad => normal.startsWith(uyapMetniniNormalizeEt(ad)));
    if (!etiket) continue;
    const ayiriciKonumu = parca.search(/[:\-]/);
    if (ayiriciKonumu >= 0) return parca.slice(ayiriciKonumu + 1).trim();

    const etiketKelimeSayisi = etiket.trim().split(/\s+/).length;
    return parca.split(/\s+/).slice(etiketKelimeSayisi).join(' ').trim();
  }
  return '';
}

function saatMetniniNormalizeEt(metin?: string) {
  const eslesme = String(metin || '').match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  return eslesme ? `${eslesme[1].padStart(2, '0')}:${eslesme[2]}` : '';
}

function tarihGecerliMi(yil: number, ay: number, gun: number) {
  const tarih = new Date(Date.UTC(yil, ay - 1, gun));
  return tarih.getUTCFullYear() === yil && tarih.getUTCMonth() === ay - 1 && tarih.getUTCDate() === gun;
}

function ayiriciSay(metin: string, ayirici: string) {
  let adet = 0;
  let tirnakIcinde = false;
  for (let index = 0; index < metin.length; index += 1) {
    if (metin[index] === '"') tirnakIcinde = !tirnakIcinde;
    else if (!tirnakIcinde && metin[index] === ayirici) adet += 1;
  }
  return adet;
}

function ayrilmisMetniCozumle(metin: string, ayirici: string) {
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let hucre = '';
  let tirnakIcinde = false;
  for (let index = 0; index < metin.length; index += 1) {
    const karakter = metin[index];
    if (karakter === '"') {
      if (tirnakIcinde && metin[index + 1] === '"') {
        hucre += '"';
        index += 1;
      } else {
        tirnakIcinde = !tirnakIcinde;
      }
      continue;
    }
    if (!tirnakIcinde && karakter === ayirici) {
      satir.push(hucre.trim());
      hucre = '';
      continue;
    }
    if (!tirnakIcinde && (karakter === '\n' || karakter === '\r')) {
      if (karakter === '\r' && metin[index + 1] === '\n') index += 1;
      satir.push(hucre.trim());
      if (satir.some(Boolean)) satirlar.push(satir);
      satir = [];
      hucre = '';
      continue;
    }
    hucre += karakter;
  }
  satir.push(hucre.trim());
  if (satir.some(Boolean)) satirlar.push(satir);
  return satirlar;
}
