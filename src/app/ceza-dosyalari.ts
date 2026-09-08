import type { CezaTarafKaydi, CezaTarafRolu, DavaDosyasi, DavaDosyaTuru } from '../app.models';

export const DAVA_DOSYA_TURLERI: { kod: DavaDosyaTuru; etiket: string }[] = [
  { kod: 'hukuk', etiket: 'Hukuk davası' },
  { kod: 'ceza', etiket: 'Ceza davası' },
  { kod: 'sorusturma', etiket: 'Savcılık soruşturması' }
];

export function cezaDosyasiMi(dosya?: Partial<DavaDosyasi> | null): boolean {
  return dosya?.dosyaTuru === 'ceza' || dosya?.dosyaTuru === 'sorusturma';
}

export function davaTurEtiketi(dosya?: Partial<DavaDosyasi> | null): string {
  return DAVA_DOSYA_TURLERI.find(tur => tur.kod === dosya?.dosyaTuru)?.etiket || 'Dava (tür belirtilmemiş)';
}

export function cezaTarafRolleri(tur?: DavaDosyaTuru): CezaTarafRolu[] {
  return tur === 'sorusturma' ? ['Şüpheli', 'Şikâyetçi', 'Mağdur'] : ['Sanık', 'Şikâyetçi', 'Mağdur', 'Katılan'];
}

export function davaDurumlari(dosya?: Partial<DavaDosyasi> | null): string[] {
  const durumlar = dosya?.dosyaTuru === 'sorusturma' ? ['Derdest', 'Kapalı'] : ['Derdest', 'İstinaf/Temyiz', 'Kapalı'];
  // Keep old/custom statuses selectable when an existing record is edited.
  return dosya?.durum && !durumlar.includes(dosya.durum) ? [...durumlar, dosya.durum] : durumlar;
}

export function cezaTarafOzeti(dosya: Partial<DavaDosyasi>): string {
  return (dosya.cezaTaraflari || []).filter(t => t.isim.trim()).map(t => `${t.rol || 'Rol seçilmemiş'}: ${t.isim}`).join(' | ');
}

export function cezaFormHatasi(dosya: Partial<DavaDosyasi>, dosyalar: DavaDosyasi[]): string {
  if (!cezaDosyasiMi(dosya)) return '';
  const anaNumara = dosya.dosyaTuru === 'sorusturma' ? 'SORUŞTURMA' : 'ESAS';
  if (!(dosya.dosyaNumaralari || []).some(n => n.tur === anaNumara && n.no.trim())) {
    return `${dosya.dosyaTuru === 'sorusturma' ? 'Soruşturma' : 'Esas'} numarasını girin. Karar numarası tek başına yeterli değildir.`;
  }
  if (!dosya.mahkeme?.trim() || dosya.mahkeme.trim() === '-') return dosya.dosyaTuru === 'sorusturma' ? 'Başsavcılık adını girin.' : 'Mahkeme adını girin.';
  const taraflar = dosya.cezaTaraflari || [];
  if (!taraflar.some(t => t.muvekkilMi && t.isim.trim())) return 'En az bir tarafı müvekkiliniz olarak işaretleyin ve adını girin.';
  if (taraflar.some(t => !t.isim.trim() && (t.muvekkilMi || t.muvekkilId || t.rol || t.tcKimlikVergiNo || t.telefon || t.eposta || t.acikAdres || t.il || t.ilce))) return 'Bilgi girdiğiniz tarafın adını da yazın veya boş kartı silin.';
  if (taraflar.some(t => t.isim.trim() && !cezaTarafRolleri(dosya.dosyaTuru).includes(t.rol as CezaTarafRolu))) return 'Her taraf için dosya türüne uygun bir rol seçin.';
  if (dosya.baglantiliSorusturmaId && dosya.dosyaTuru === 'ceza' && !dosyalar.some(d => d.id === dosya.baglantiliSorusturmaId && d.id !== dosya.id && d.dosyaTuru === 'sorusturma')) return 'Bağlantılı soruşturma bulunamadı. Başka bir soruşturma seçin veya bağlantıyı kaldırın.';
  return '';
}

export function cezaTarafAlanlari(taraflar: CezaTarafKaydi[]) {
  const cezaTaraflari = taraflar.filter(t => t.isim.trim()).map(t => ({ ...t, isim: t.isim.trim() }));
  const muvekkiller = cezaTaraflari.filter(t => t.muvekkilMi);
  return {
    cezaTaraflari,
    muvekkiller,
    muvekkilId: muvekkiller[0]?.muvekkilId,
    muvekkil: [...new Set(muvekkiller.map(t => t.isim))].join(', '),
    muvekkilPozisyonu: [...new Set(muvekkiller.map(t => t.rol))].join(', '),
    karsiTaraf: cezaTaraflari.filter(t => !t.muvekkilMi).map(t => `${t.rol}: ${t.isim}`).join(', ') || '-'
  };
}

export function sorusturmadanCezaTaslagi(sorusturma: DavaDosyasi): Partial<DavaDosyasi> {
  // Whitelist copied fields: financial records, sharing permissions and documents never follow the draft.
  return {
    dosyaTuru: 'ceza', durum: 'Derdest', mahkeme: '', konu: sorusturma.konu,
    baglantiliSorusturmaId: sorusturma.id,
    dosyaNumaralari: [{ tur: 'ESAS', no: '' }, { tur: 'KARAR', no: '' }],
    cezaTaraflari: (sorusturma.cezaTaraflari || []).map(t => ({ ...t, rol: t.rol === 'Şüpheli' ? 'Sanık' : t.rol })),
    vekaletUcreti: 0
  };
}

export function davaAramaEslesir(dosya: Partial<DavaDosyasi>, arama: string, tarafOzeti = ''): boolean {
  const metin = [dosya.dosyaNo, ...(dosya.dosyaNumaralari || []).map(n => n.no), dosya.mahkeme,
    dosya.muvekkil, dosya.karsiTaraf, dosya.eskiMahkeme, dosya.eskiEsasNo, dosya.konu,
    dosya.kararTuru, dosya.kararTarihi, cezaTarafOzeti(dosya), tarafOzeti].join(' ').toLocaleLowerCase('tr-TR');
  return arama.trim().toLocaleLowerCase('tr-TR').split(/\s+/).every(parca => metin.includes(parca));
}
