// Shared application models extracted from the legacy single-file component.

export interface FinansalIslem { id: number; tarih: string; tur: string; tutar: number; aciklama: string; makbuzUrl?: string; }
export interface EvrakBaglantisi { id: number; isim: string; url: string; tarih: string; tebligTarihi?: string; sonEylemTarihi?: string; tamamlandiMi?: boolean; tamamlanmaTarihi?: string; yaziRengi?: string; ekler?: EvrakBaglantisi[]; } 
export interface DosyaNumarasi { tur: string; no: string; }
export interface ArabuluculukTaraf {
  id: number;
  tip: 'Başvurucu' | 'Diğer Taraf';
  isim: string;
  tcVergiNo?: string;
  vergiDairesi?: string;
  adres?: string;
  telefon?: string;
  eposta?: string;
  vekil?: string;
  vekilTelefon?: string;
  vekilEposta?: string;
  vekilBaroBilgisi?: string;
}

export interface DavaTarafKaydi { id: number; isim: string; muvekkilId?: number; }

export interface DavaDosyasi { 
  id: number; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil: string; muvekkilId?: number; muvekkiller?: DavaTarafKaydi[]; karsiTaraf: string; mahkeme: string; konu: string; durum: string; istinafMahkemesi?: string; durusmaTarihi?: string; durusmaSaati?: string; durusmaTamamlandiMi?: boolean; durusmaTamamlanmaTarihi?: string; notlar?: string; muvekkilGorusmeNotlari?: MuvekkilGorusmeNotu[]; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; baglantiliIcraId?: number; baglantiliIcraIds?: number[]; baglantiliArabuluculukIds?: number[]; baglantiliTedbirDosyalari?: string[]; baglantiliDelilTespitiDosyalari?: string[]; baglantiliNoterlikDosyalari?: string[]; muvekkilPozisyonu?: string; arsivYeri?: string; islemGecmisi?: DosyaIslemKaydi[]; takvimGecmisi?: TakvimGecmisKaydi[]; davacilar?: DavaTarafKaydi[]; davalilar?: DavaTarafKaydi[];
  icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; basvuruKonusu?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: string;
}

export interface IcraDosyasi {
  id: number; icraDairesi: string; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkilId?: number; muvekkil: string; alacakli: string; borclu: string; takipTipi?: string; takipTarihi: string; durum: string; baglantiliDavaId?: number; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; arsivYeri?: string; islemGecmisi?: DosyaIslemKaydi[]; takvimGecmisi?: TakvimGecmisKaydi[];
  karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; durusmaSaati?: string; durusmaTamamlandiMi?: boolean; durusmaTamamlanmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; basvuruKonusu?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: string;
}

export interface ArabuluculukDosyasi {
  id: number; buroNo: string; arabuluculukNo: string; buro: string; basvuruTuru: 'Dava Şartı' | 'İhtiyari'; uyusmazlikTuru: 'Kira' | 'İşçi İşveren' | 'Ticari' | 'Boşanma' | 'Ortaklığın Giderilmesi' | 'Tüketici'; basvuruKonusu?: string; taraflar: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: 'Yüzyüze' | 'Videokonferans' | 'Telekonferans'; durum: string; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; muvekkilId?: number; arsivYeri?: string;
  islemGecmisi?: DosyaIslemKaydi[]; takvimGecmisi?: TakvimGecmisKaydi[];
  dosyaNo?: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil?: string; karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string; icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
}

export interface Muvekkil { id: number; tip?: 'Müvekkil' | 'Şirketler' | 'Borçlular' | 'Diğer'; _isNewDiger?: boolean; adSoyad: string; tcKimlik: string; telefon: string; eposta: string; adres: string; bankaBilgileri: string; vergiDairesi?: string; vekaletnameUrl?: string; yetkililer?: { id: number; adSoyad: string; telefon: string; eposta?: string; pozisyon: string; }[]; }

export interface MuvekkilGorusmeNotu {
  id: number;
  tarih: string;
  saat?: string;
  yontem?: string;
  notlar: string;
  kayitTarihi?: string;
}

export type DosyaIslemKategori = 'dosya' | 'durum' | 'takvim' | 'evrak' | 'finans' | 'gorusme';
export type TakvimGecmisiDurumu = 'Planlandı' | 'Güncellendi' | 'Gerçekleşti' | 'Ajandaya Geri Alındı' | 'Kaldırıldı';

export interface DosyaIslemKaydi {
  id: number;
  tarih: string;
  kategori: DosyaIslemKategori;
  baslik: string;
  aciklama: string;
  kullanici?: string;
}

export interface TakvimGecmisKaydi {
  id: number;
  tur: 'Duruşma' | 'Toplantı';
  durum: TakvimGecmisiDurumu;
  kayitTarihi: string;
  planlananTarih?: string;
  planlananSaat?: string;
  gerceklesmeTarihi?: string;
  aciklama?: string;
}

export type AjandaKaynak = 'dava' | 'icra' | 'arabuluculuk';
export type AjandaTur = 'durusma' | 'toplanti' | 'sureliIs';

export interface AjandaKaydi {
  id: string;
  tarih: string;
  saat?: string;
  tur: AjandaTur;
  kaynak: AjandaKaynak;
  dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi;
  baslik: string;
  altBaslik: string;
  taraflar: string;
  evrakId?: number;
  evrakIsmi?: string;
  anaEvrakIsmi?: string;
}

export type BildirimTur = 'success' | 'error' | 'info';

export interface UygulamaBildirimi {
  id: number;
  tur: BildirimTur;
  baslik: string;
  mesaj?: string;
}

export interface IliskiDosyaKaydi {
  id: string;
  tur: 'dava' | 'icra' | 'arabuluculuk';
  baslik: string;
  altBaslik: string;
  durum: string;
  referans: string;
  dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi;
}

export type SayfaTipi = 'dashboard' | 'davalar' | 'icralar' | 'arabuluculuk' | 'sablonlar' | 'muhasebe' | 'iliskiler' | 'ajanda' | 'detay' | 'icraDetay' | 'arabuluculukDetay';
export type DetaySekmesi = 'notlar' | 'muvekkilGorusmeleri' | 'evraklar' | 'sureliIsler' | 'gecmis';
