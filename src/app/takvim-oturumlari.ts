import type { ArabuluculukDosyasi, DavaDosyasi } from '../app.models';

export type SonrakiOturum = { tarih: string; saat: string };
export type TakvimTamamlamaIstegi = {
  kaynak: 'dava' | 'arabuluculuk';
  dosyaId: number;
  tur: 'Duruşma' | 'Toplantı';
  dosyaOzeti: string;
  tarih: string;
  saat: string;
};

export function sonrakiOturumHatasi(onceki: SonrakiOturum, yeni: SonrakiOturum): string {
  const tarih = new Date(`${yeni.tarih}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yeni.tarih) || !Number.isFinite(tarih.getTime()) || tarih.toISOString().slice(0, 10) !== yeni.tarih) {
    return 'Geçerli bir yeni tarih seçin.';
  }
  if (yeni.saat && !/^([01]\d|2[0-3]):[0-5]\d$/.test(yeni.saat)) return 'Geçerli bir saat girin.';
  if (yeni.tarih < onceki.tarih || (yeni.tarih === onceki.tarih && (!yeni.saat || !onceki.saat || yeni.saat <= onceki.saat))) {
    return 'Yeni tarih ve saat, tamamlanan duruşma veya toplantıdan sonra olmalıdır.';
  }
  return '';
}

export function dosyaTakvimKronolojisi(dosya: DavaDosyasi | ArabuluculukDosyasi, tur: 'Duruşma' | 'Toplantı') {
  const tarih = tur === 'Duruşma' ? dosya.durusmaTarihi : (dosya as ArabuluculukDosyasi).toplantiTarihi;
  const saat = (tur === 'Duruşma' ? (dosya as DavaDosyasi).durusmaSaati : (dosya as ArabuluculukDosyasi).toplantiSaati) || '';
  const tamamlandi = tur === 'Duruşma' ? (dosya as DavaDosyasi).durusmaTamamlandiMi : ((dosya as ArabuluculukDosyasi).toplantiTamamlandiMi || dosya.durum === 'Kapalı');
  const satirlar = new Map<string, { anahtar: string; tarih: string; saat: string; durum: string; guncel: boolean }>();
  // Collapse audit entries for the same appointment; an undo supersedes its completion.
  const gecmis = [...(dosya.takvimGecmisi || [])].sort((a, b) => b.kayitTarihi.localeCompare(a.kayitTarihi) || b.id - a.id);
  for (const kayit of gecmis) {
    if (kayit.tur !== tur || !kayit.planlananTarih) continue;
    const anahtar = `${kayit.planlananTarih}|${kayit.planlananSaat || ''}`;
    if (satirlar.has(anahtar)) continue;
    satirlar.set(anahtar, {
      anahtar, tarih: kayit.planlananTarih, saat: kayit.planlananSaat || '', guncel: false,
      durum: kayit.durum === 'Gerçekleşti' || kayit.durum === 'Kaldırıldı' ? kayit.durum : 'Önceki plan'
    });
  }
  if (tarih) {
    const anahtar = `${tarih}|${saat}`;
    satirlar.set(anahtar, { anahtar, tarih, saat, durum: tamamlandi ? 'Gerçekleşti' : 'Planlandı', guncel: true });
  }
  return [...satirlar.values()].sort((a, b) => b.tarih.localeCompare(a.tarih) || b.saat.localeCompare(a.saat));
}
