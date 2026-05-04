import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElementRef, ViewChild } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

import { appId, getFirebaseConfig } from '../firebase.config';
import { GOOGLE_DOCS_CONFIG } from '../google-docs.config';
import {
  AjandaKaydi,
  AjandaKaynak,
  AjandaTur,
  ArabuluculukDosyasi,
  ArabuluculukSonucu,
  ArabuluculukTaksit,
  ArabuluculukTaraf,
  BildirimTur,
  DavaDosyasi,
  DavaTarafKaydi,
  DetaySekmesi,
  DosyaIslemKaydi,
  DosyaIslemKategori,
  DosyaNumarasi,
  EvrakBaglantisi,
  EvrakGorevi,
  FinansalIslem,
  IcraDosyasi,
  IliskiDosyaKaydi,
  Muvekkil,
  MuvekkilGorusmeNotu,
  OfisGorevi,
  SayfaTipi,
  TakvimGecmisKaydi,
  TakvimGecmisiDurumu,
  UygulamaBildirimi
} from '../app.models';

declare const __initial_auth_token: any;
declare const google: any;

type ArabuluculukSureAsamasi = 'normal' | 'uzatma' | 'asildi' | 'tamamlandi';

type ArabuluculukSureSayaci = {
  dosya: ArabuluculukDosyasi;
  kuralEtiketi: string;
  kuralAciklamasi: string;
  normalSureGun: number;
  uzatmaSureGun: number;
  gorevlendirmeTarihi: string;
  normalSonTarih: string;
  azamiSonTarih: string;
  gecenGun: number;
  normalKalanGun: number;
  azamiKalanGun: number;
  asama: ArabuluculukSureAsamasi;
  tamamlanmaGun?: number;
};

type GeriAlmaSecenegi = {
  islem: () => Promise<boolean | void> | boolean | void;
  sureSaniye?: number;
  etiket?: string;
  basariBaslik?: string;
  basariMesaj?: string;
};

type BildirimGosterSecenekleri = {
  sureMs?: number;
  geriAl?: GeriAlmaSecenegi;
};

type HazirExcelMakbuz = {
  url: string;
  dosyaAdi: string;
  olusturmaTarihi: string;
};

type BelgeCiktiFormu = {
  belgeTuru: string;
  belgeBasligi: string;
  mahkemeKurum: string;
  dosyaNo: string;
  tarafBilgileri: string;
  konu: string;
  aciklamalar: string;
  hukukiSebepler: string;
  deliller: string;
  sonucIstem: string;
  imzaBlogu: string;
};

type BelgeParagrafi = {
  metin: string;
  hizalama?: 'left' | 'center' | 'right' | 'both';
  kalin?: boolean;
  buyukHarf?: boolean;
  boslukSonrasi?: number;
};

type BelgeCiktiKaynakTuru = 'dava' | 'icra' | 'arabuluculuk';

type BelgeCiktiKaynakSecenegi = {
  anahtar: string;
  tur: BelgeCiktiKaynakTuru;
  baslik: string;
  altBaslik: string;
  aramaMetni: string;
  sira: number;
  dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi;
};

type BelgeCiktiSablonAlani = {
  anahtar: string;
  etiket: string;
  tip?: 'input' | 'textarea';
  varsayilan?: string;
};

type BelgeCiktiHazirSablon = {
  id: string;
  baslik: string;
  aciklama: string;
  kaynakTuru?: BelgeCiktiKaynakTuru;
  belgeTuru: string;
  belgeBasligi: string;
  mahkemeKurum: string;
  konu: string;
  aciklamalar: string;
  hukukiSebepler: string;
  deliller: string;
  sonucIstem: string;
  imzaBlogu?: string;
  alanlar: BelgeCiktiSablonAlani[];
};

type AdresliKayit = {
  adres?: string;
  il?: string;
  ilce?: string;
  acikAdres?: string;
};

type GeriAlmaKaydi = {
  islem: () => Promise<boolean | void> | boolean | void;
  basariBaslik: string;
  basariMesaj: string;
  geriSayimTimerId?: ReturnType<typeof setInterval>;
  isleniyor?: boolean;
};

type GunlukOzetTon = 'rose' | 'amber' | 'blue' | 'violet' | 'emerald' | 'slate';

type GunlukOzetKart = {
  etiket: string;
  deger: string;
  aciklama: string;
  ton: GunlukOzetTon;
};

type GunlukOzetKayitOnizleme = {
  baslik: string;
  altBaslik: string;
  meta: string;
  rozet: string;
  ton: GunlukOzetTon;
  eylem?: () => void;
  eylemEtiketi?: string;
};

type GunlukOzetBolum = {
  baslik: string;
  aciklama: string;
  ton: GunlukOzetTon;
  bosMesaji: string;
  kayitlar: GunlukOzetKayitOnizleme[];
};

type ArabuluculukSablonBolumAnahtari = 'ihtiyari' | 'dava_sarti';

type ArabuluculukSablonKategoriAnahtari = 'toplu' | 'anlasma' | 'son_tutanak' | 'belirleme' | 'bilgilendirme' | 'davet';

type ArabuluculukSablonListeKaydi = {
  evrak: EvrakBaglantisi;
  index: number;
  ortakMi: boolean;
};

type ArabuluculukSablonAltBolumGorunumu = {
  key: ArabuluculukSablonKategoriAnahtari;
  baslik: string;
  aciklama: string;
  kayitlar: ArabuluculukSablonListeKaydi[];
};

type ArabuluculukSablonBolumGorunumu = {
  key: ArabuluculukSablonBolumAnahtari;
  baslik: string;
  aciklama: string;
  altBasliklar: ArabuluculukSablonAltBolumGorunumu[];
};

type UygulamaGezinmeDurumu = {
  sayfa: SayfaTipi;
  seciliDavaId: number | null;
  seciliIcraId: number | null;
  seciliArabuluculukId: number | null;
  aktifDetaySekmesi: DetaySekmesi;
  aktifDavaTarafDetayi: { tur: 'davaci' | 'davali'; tarafId: number } | null;
  aramaMetni: string;
  durumFiltresi: string;
  arabuluculukSonucFiltresi: 'Tümü' | 'Girilmedi' | ArabuluculukSonucu;
  muhasebeArama: string;
  muhasebeFiltre: string;
  aktifIliskiSekmesi: 'Müvekkil' | 'Şirketler' | 'Borçlular' | 'Diğer';
  iliskiGorunumModu: 'kart' | 'liste';
  iliskiArama: string;
  iliskiFiltre: string;
  iliskiSiralama: string;
  ajandaArama: string;
  ajandaZamanFiltresi: 'all' | 'today' | '7days' | '30days' | 'overdue';
  ajandaTurFiltresi: 'all' | AjandaTur;
  aktifSablonSekmesi: 'avukatlik' | 'arabuluculuk';
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private dosyaNotEditorRef?: ElementRef<HTMLDivElement>;
  @ViewChild('dosyaNotEditor')
  set dosyaNotEditor(ref: ElementRef<HTMLDivElement> | undefined) {
    this.dosyaNotEditorRef = ref;
    if (ref) window.setTimeout(() => this.aktifDosyaNotEditorunuYukle(), 0);
  }
  
  app: any; auth: any; db: any; user: User | null = null;
  authInitialized = false; yukleniyor = false; islemYapiyor = false; sistemHatasi = '';
  
  emailGiris = ''; sifreGiris = ''; authModu: 'giris' | 'kayit' = 'giris'; authHata = ''; authYukleniyor = false;
  bildirimler: UygulamaBildirimi[] = [];
  bildirimSayaci = 0;
  gecmisKaydiSayaci = 0;

  davalar: DavaDosyasi[] = []; icralar: IcraDosyasi[] = []; arabuluculukDosyalar: ArabuluculukDosyasi[] = []; muvekkiller: Muvekkil[] = []; ofisGorevleri: OfisGorevi[] = [];
  aktifSayfa: SayfaTipi = 'dashboard'; seciliDava: DavaDosyasi | null = null; seciliIcra: IcraDosyasi | null = null; seciliArabuluculuk: ArabuluculukDosyasi | null = null;
  
  sablonlar: { avukatlik: EvrakBaglantisi[], arabuluculuk: EvrakBaglantisi[] } = { avukatlik: [], arabuluculuk: [] };
  aktifSablonSekmesi: 'avukatlik' | 'arabuluculuk' = 'avukatlik';
  sablonArama = '';
  belgeCiktiFormu: BelgeCiktiFormu = this.belgeCiktiVarsayilanFormu();
  belgeCiktiKaynakTuru: BelgeCiktiKaynakTuru = 'dava';
  belgeCiktiSeciliDosyaAnahtari = '';
  belgeCiktiDosyaArama = '';
  belgeCiktiSeciliSablonId = '';
  belgeCiktiSablonDegerleri: Record<string, string> = {};
  readonly belgeCiktiTurleri = [
    'Dava Dilekçesi',
    'Cevap Dilekçesi',
    'Beyan Dilekçesi',
    'İhtarname',
    'Arabuluculuk Tutanağı',
    'Arabuluculuk Ücret Dilekçesi',
    'Müvekkil Bilgilendirme Raporu',
    'Sözleşme Taslağı'
  ];
  readonly belgeCiktiHazirSablonlari: BelgeCiktiHazirSablon[] = [
    {
      id: 'arabuluculuk-mali-isler-ucret-dilekcesi',
      baslik: 'Dava Şartı Arabuluculuk - Mali İşler Ücret Dilekçesi',
      aciklama: 'Dava şartı arabuluculuk faaliyeti tamamlandıktan sonra Mali İşler Müdürlüğüne sunulabilecek sade RTF/DOCX dilekçe taslağı.',
      kaynakTuru: 'arabuluculuk',
      belgeTuru: 'Arabuluculuk Ücret Dilekçesi',
      belgeBasligi: 'DİLEKÇE',
      mahkemeKurum: 'İSTANBUL ANADOLU CUMHURİYET BAŞSAVCILIĞI\nMALİ İŞLER MÜDÜRLÜĞÜNE',
      konu: '{{ARABULUCULUK_DOSYA_NUMARALARI}} sayılı dava şartı arabuluculuk dosyasına ilişkin arabuluculuk ücretinin ödenmesi talebidir.',
      aciklamalar: '1. {{BURO}} Arabuluculuk Bürosunun {{BURO_NO}} büro numaralı ve {{ARABULUCULUK_NO}} arabuluculuk numaralı dosyasında {{TARAFLAR_KISA}} arasında yürütülen dava şartı arabuluculuk süreci tamamlanmıştır.\n\n2. Dosyanın başvuru türü {{BASVURU_TURU}}, uyuşmazlık türü {{UYUSMAZLIK_TURU}} olup başvuru konusu {{BASVURU_KONUSU}} şeklindedir.\n\n3. Dosyada toplam {{TARAF_SAYISI}} taraf bulunmaktadır. Arabuluculuk ücretinin belirlenmesinde taraf sayısının dikkate alınmasını talep ederim.\n\n4. {{ACIKLAMA_EK}}\n\n5. Arabuluculuk ücretinin ödenebilmesi için gerekli işlemlerin yapılmasını talep ederim.\n\n6. Ödeme bilgileri:\nHesap Sahibi: {{HESAP_SAHIBI}}\nBanka Adı: {{BANKA_ADI}}\nŞube Adı: {{SUBE_ADI}}\nIBAN No: {{IBAN_NO}}\nTalep Edilen Tutar: {{ODENECEK_TUTAR}}',
      hukukiSebepler: '6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu, Arabuluculuk Asgari Ücret Tarifesi ve ilgili sair mevzuat.',
      deliller: 'Arabuluculuk son tutanağı, arabuluculuk dosyası, sistem kayıtları ve sair yasal deliller.',
      sonucIstem: 'Yukarıda açıklanan nedenlerle {{ARABULUCULUK_DOSYA_NUMARALARI}} sayılı dava şartı arabuluculuk dosyasına ilişkin, toplam {{TARAF_SAYISI}} taraf üzerinden değerlendirme yapılarak arabuluculuk ücretinin tarafıma ödenmesi hususunda gereğini arz ederim.\n\nEkler: {{EKLER}}',
      imzaBlogu: 'Arb. Av. Ömer Faruk AKYAVAŞ',
      alanlar: [
        {
          anahtar: 'ACIKLAMA_EK',
          etiket: 'Açıklama Ek Metni',
          tip: 'textarea',
          varsayilan: 'Arabuluculuk faaliyeti mevzuata uygun şekilde yürütülmüş ve süreç son tutanakla tamamlanmıştır.'
        },
        { anahtar: 'ODENECEK_TUTAR', etiket: 'Talep Edilen Tutar', varsayilan: '' },
        { anahtar: 'HESAP_SAHIBI', etiket: 'Hesap Sahibi', varsayilan: 'Arb. Av. Ömer Faruk AKYAVAŞ' },
        { anahtar: 'BANKA_ADI', etiket: 'Banka Adı', varsayilan: '' },
        { anahtar: 'SUBE_ADI', etiket: 'Şube Adı', varsayilan: '' },
        { anahtar: 'IBAN_NO', etiket: 'IBAN No', varsayilan: '' },
        { anahtar: 'EKLER', etiket: 'Ekler', tip: 'textarea', varsayilan: 'Son tutanak ve ilgili arabuluculuk evrakları' }
      ]
    }
  ];

  aramaMetni = ''; durumFiltresi = 'Tümü';
  arabuluculukSonucFiltresi: 'Tümü' | 'Girilmedi' | ArabuluculukSonucu = 'Tümü';
  readonly arabuluculukSonucSecenekleri: ArabuluculukSonucu[] = ['Anlaşma', 'Anlaşamama', 'Vazgeçme'];
  muhasebeArama = ''; muhasebeFiltre = 'Tümü';
  
  aktifIliskiSekmesi: 'Müvekkil' | 'Şirketler' | 'Borçlular' | 'Diğer' = 'Müvekkil';
  iliskiGorunumModu: 'kart' | 'liste' = 'liste';
  iliskiArama = '';
  iliskiFiltre = 'Tümü';
  iliskiSiralama = 'a-z';
  seciliIliskiId: number | null = null;
  ajandaArama = '';
  ajandaZamanFiltresi: 'all' | 'today' | '7days' | '30days' | 'overdue' = 'all';
  ajandaTurFiltresi: 'all' | AjandaTur = 'all';
  yeniOfisGorevi: Partial<OfisGorevi> = { tarih: new Date().toISOString().split('T')[0], saat: '', oncelik: 'Normal' };
  duzenlenenOfisGoreviId: number | null = null;
  duzenlenenOfisGorevi: Partial<OfisGorevi> = {};
  
  arabuluculukMuvekkilDropdownAcik = false;
  arabuluculukMuvekkilArama = '';
  icraMuvekkilDropdownAcik = false;
  icraMuvekkilArama = '';
  icraMuvekkilRolu: 'Alacaklı' | 'Borçlu' | null = null;
  arabuluculukTarafAramaMetinleri: Record<number, string> = {};
  arabuluculukTarafVekilAramaMetinleri: Record<number, string> = {};
  hizliMuvekkilFormAcik = false;
  hizliMuvekkilKayitBaglami: 'dava' | 'arabuluculuk' = 'dava';
  hizliMuvekkilKaydi: Partial<Muvekkil> = { tip: 'Müvekkil' };

  yetkiliSecimDropdownAcik = false;
  yetkiliSecimArama = '';

  davaFormAcik = false; icraFormAcik = false; arabuluculukFormAcik = false; muvekkilFormAcik = false; formModu: 'ekle' | 'duzenle' = 'ekle';
  islemGorenDava: Partial<DavaDosyasi> = {}; islemGorenIcra: Partial<IcraDosyasi> = {}; islemGorenArabuluculuk: Partial<ArabuluculukDosyasi> = {}; islemGorenMuvekkil: Partial<Muvekkil> = {};
  
  yeniIslem: Partial<FinansalIslem> = { tur: 'Vekalet Ücreti' }; 
  duzenlenenFinansalIslemId: number | null = null;
  duzenlenenFinansalIslem: Partial<FinansalIslem> = {};
  makbuzExcelSablonYolu = 'assets/templates/makbuz-sablonu.xlsx';
  makbuzExcelOlusturuluyorId: number | null = null;
  hazirExcelMakbuzlar: Record<number, HazirExcelMakbuz> = {};
  seciliBaglantiliIcraId: number | undefined = undefined;
  seciliBaglantiliArabuluculukId: number | undefined = undefined;
  baglantiliIcraArama = '';
  baglantiliArabuluculukArama = '';
  yeniBaglantiliTedbirDosyasi = '';
  yeniBaglantiliDelilTespitiDosyasi = '';
  yeniBaglantiliNoterlikDosyasi = '';
  silinecekDavaId: number | null = null; silinecekIcraId: number | null = null; silinecekArabuluculukId: number | null = null; silinecekMuvekkilId: number | null = null;
  aktifDetaySekmesi: DetaySekmesi = 'notlar'; formHata = '';

  varsayilanEvrakYaziRengi = '#0f172a';
  evrakYaziRenkSecenekleri = [
    { etiket: 'Varsayılan', deger: '#0f172a' },
    { etiket: 'Kırmızı', deger: '#dc2626' },
    { etiket: 'Yeşil', deger: '#16a34a' },
    { etiket: 'Sarı', deger: '#ca8a04' },
    { etiket: 'Mavi', deger: '#2563eb' },
    { etiket: 'Mor', deger: '#7c3aed' }
  ];
  yeniEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi, sablonBolumu: 'ihtiyari', sablonKategori: 'toplu' }; ekEklenenEvrakId: number | null = null;
  yeniEkEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi }; duzenlenenEvrakId: number | null = null;
  duzenlenenEvrakParentId: number | null = null; duzenlenenEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi, sablonBolumu: 'ihtiyari', sablonKategori: 'toplu' };
  duzenlenenEvrakOrijinalSonEylemTarihi = '';
  yeniEvrakGorevMetinleri: Record<number, string> = {};
  acikEvrakGorevFormlari: Record<number, boolean> = {};
  duzenlenenEvrakGorevi: { evrakId: number; gorevId: number; metin: string } | null = null;
  acikKlasorler: Record<number, boolean> = {}; 
  davetMektubuOlusturuluyor = false;
  bilgilendirmeTutanagiOlusturuluyor = false;
  arabuluculukBelirlemeTutanagiOlusturuluyor = false;
  sonTutanakIhtiyariAnlasmaOlusturuluyor = false;
  ihtiyariAnlasmaBelgesiOlusturuluyor = false;
  topluDosyaOlusturuluyor = false;
  topluDosyaOlusturulanTarafSayisi: number | null = null;
  topluDosyaSecenekleriAcik = false;
  arabuluculukBelgeSecenekMenusu: 'belirleme' | 'sonTutanak' | 'anlasmaBelgesi' | null = null;
  googleDocsYetkiIstendi = false;
  gunlukOzetYakinGunSayisi = 30;
  gunlukOzetMetni = '';
  gunlukOzetOlusturulmaTarihi = '';
  gunlukOzetKopyalaniyor = false;
  gunlukOzetKartlari: GunlukOzetKart[] = [];
  gunlukOzetBolumleri: GunlukOzetBolum[] = [];
  yeniMuvekkilGorusmeNotu: Partial<MuvekkilGorusmeNotu> = { tarih: new Date().toISOString().split('T')[0], saat: '', yontem: 'Telefon', notlar: '' };
  readonly arabuluculukSablonBolumTanimlari: Array<{ key: ArabuluculukSablonBolumAnahtari; baslik: string; aciklama: string; }> = [
    {
      key: 'ihtiyari',
      baslik: 'İhtiyari Tutanaklar',
      aciklama: 'İhtiyari arabuluculuk akışına ait şablonları bu başlık altında takip edin.'
    },
    {
      key: 'dava_sarti',
      baslik: 'Dava Şartı Tutanaklar',
      aciklama: 'Dava şartı süreçlerinde kullanılan arabuluculuk şablonları burada gruplanır.'
    }
  ];
  acikArabuluculukSablonBolumu: ArabuluculukSablonBolumAnahtari | 'siniflandirilmamis' | null = null;
  acikArabuluculukSablonAltBolumleri: Partial<Record<ArabuluculukSablonBolumAnahtari, ArabuluculukSablonKategoriAnahtari | null>> = {
    ihtiyari: 'toplu',
    dava_sarti: 'toplu'
  };
  readonly arabuluculukSablonAltBolumTanimlari: Array<{ key: ArabuluculukSablonKategoriAnahtari; baslik: string; aciklama: string; }> = [
    { key: 'toplu', baslik: 'Toplu Belgeler', aciklama: 'Birden çok belgeyi tek akışta oluşturan şablonlar.' },
    { key: 'anlasma', baslik: 'Anlaşma Belgesi', aciklama: 'Tarafların anlaşma hükümlerini içeren belgeler.' },
    { key: 'son_tutanak', baslik: 'Son Tutanak', aciklama: 'Sürecin kapanışına dair tutanaklar.' },
    { key: 'belirleme', baslik: 'Belirleme', aciklama: 'Görevlendirme ve ilk tespit kayıtları.' },
    { key: 'bilgilendirme', baslik: 'Bilgilendirme', aciklama: 'Tarafların bilgilendirilmesine yönelik metinler.' },
    { key: 'davet', baslik: 'Davet Mektubu', aciklama: 'Taraflara gönderilen davet yazıları.' }
  ];
  acikMuvekkilGorusmeNotlari: Record<number, boolean> = {};
  readonly maksimumArabuluculukTaksitSayisi = 12;
  readonly arabuluculukAnlasmaKalemleri: { tutarAlan: keyof ArabuluculukDosyasi; tarihAlan: keyof ArabuluculukDosyasi; etiket: string; yerTutucuOnEki: string; }[] = [
    { tutarAlan: 'kidemTazminatiTutari', tarihAlan: 'kidemTazminatiOdemeTarihi', etiket: 'Kıdem Tazminatı', yerTutucuOnEki: 'KIDEM_TAZMINATI' },
    { tutarAlan: 'ihbarTazminatiTutari', tarihAlan: 'ihbarTazminatiOdemeTarihi', etiket: 'İhbar Tazminatı', yerTutucuOnEki: 'IHBAR_TAZMINATI' },
    { tutarAlan: 'yillikUcretliIzinTutari', tarihAlan: 'yillikUcretliIzinOdemeTarihi', etiket: 'Yıllık Ücretli İzin', yerTutucuOnEki: 'YILLIK_UCRETLI_IZIN' },
    { tutarAlan: 'bakiyeUcretAlacagi', tarihAlan: 'bakiyeUcretAlacagiOdemeTarihi', etiket: 'Bakiye Ücret Alacağı', yerTutucuOnEki: 'BAKIYE_UCRET_ALACAGI' },
    { tutarAlan: 'primAlacagi', tarihAlan: 'primAlacagiOdemeTarihi', etiket: 'Prim Alacağı', yerTutucuOnEki: 'PRIM_ALACAGI' },
    { tutarAlan: 'iseBaslatmamaVeBostaGecenSureAlacagi', tarihAlan: 'iseBaslatmamaVeBostaGecenSureOdemeTarihi', etiket: 'İşe Başlatmama ve Boşta Geçen Süre Alacağı', yerTutucuOnEki: 'ISE_BASLATMAMA_VE_BOSTA_GECEN_SURE_ALACAGI' },
    { tutarAlan: 'ekOdeme', tarihAlan: 'ekOdemeOdemeTarihi', etiket: 'Ek Ödeme', yerTutucuOnEki: 'EK_ODEME' }
  ];
  readonly arabuluculukTopluDosyaSecenekleri = [
    { tarafSayisi: 2, etiket: '2 Taraflı', templateName: GOOGLE_DOCS_CONFIG.topluDosyaIkiTarafliTemplateName },
    { tarafSayisi: 3, etiket: '3 Taraflı', templateName: GOOGLE_DOCS_CONFIG.topluDosyaUcTarafliTemplateName },
    { tarafSayisi: 4, etiket: '4 Taraflı', templateName: GOOGLE_DOCS_CONFIG.topluDosyaDortTarafliTemplateName }
  ];
  mobilAcikKartlar: Record<string, boolean> = {};
  duzenlenenMuvekkilGorusmeNotuId: number | null = null;
  duzenlenenMuvekkilGorusmeNotu: Partial<MuvekkilGorusmeNotu> = {};
  silinecekMuvekkilGorusmeNotuId: number | null = null;
  aktifDavaTarafDetayi: { tur: 'davaci' | 'davali'; tarafId: number } | null = null;
  private readonly geriAlmaSuresiSaniye = 8;
  private bildirimKapatmaTimerlari = new Map<number, ReturnType<typeof setTimeout>>();
  private geriAlmaKayitlari = new Map<number, GeriAlmaKaydi>();
  aktifGeriAlBildirimiId: number | null = null;
  navigasyonGecmisi: UygulamaGezinmeDurumu[] = [];
  private readonly isciIsverenVarsayilanBasvuruKonusu = 'KIDEM TAZMİNATI- İHBAR TAZMİNATI –ÜCRET ALACAĞI – FAZLA MESAİ ÜCRETİ –YILLIK İZİN ÜCRETİ- HAFTA TATİLİ ÜCRETİ – ÜCRET FARKI - İKRAMİYE - PRİM – SENDİKAL TAZMİNAT - İŞ ARAMA İZİN ÜCRETİ - ULUSAL BAYRAM VE GENEL TATİL GÜNLERİ ÜCRETİ – MADDİ VE MANEVİ TAZMİNAT - AYRIMCILIK VE KÖTÜNİYET TAZMİNATI- CEZAİ ŞART ALACAĞI - TOPLU İŞ SÖZLEŞMESİNDEN KAYNAKLI ALACAKLAR - GECE VARDİYASI ZAMMI - TRANSFER ÜCRETİ - YARIM ÜCRET ALACAĞI - EĞİTİM ÖDENEĞİ - KIRTASİYE ÖDENEĞİ - ZAM FARKI ALACAĞI - ŞUA İZNİ ALACAĞI - ELEKTRİK, SU, KİRA, İNTERNET GİDER YARDIMI -  HAKSIZ REKABET-YOL ve YEMEK ÜCRETİ – AGİ (Asgari Geçim İndirimi) - AYNİ YARDIMLAR - ÖLÜM, DOĞUM VE EVLENME YARDIMLARI - GÖREV YOLLUĞU - SEYYAR GÖREV TAZMİNATI - İŞ SONU TAZMİNATI - KEŞİF ÜCRETİ - KASA TAZMİNATI - ÇOCUK VE AİLE YARDIMLARI -  İŞE İADE, BOŞTA GEÇEN SÜRE VE İŞE BAŞLATMAMA TAZMİNATI - MADDİ VE MANEVİ TAZMİNAT - İŞ KAZASI VE BUNDAN DOĞACAK ALACAK KALEMLERİ - MESLEK HASTALIĞI VE BUNDAN DOĞACAK ALACAK KALEMLERİ';
  arabuluculukBasvuruKonusuOtomatikMi = false;

  ngOnInit() { this.initFirebase(); }

  async initFirebase() {
    try {
      this.sistemHatasi = '';
      const config = getFirebaseConfig();
      this.app = initializeApp(config); this.auth = getAuth(this.app); this.db = getFirestore(this.app);
      onAuthStateChanged(this.auth, (user: User | null) => {
        this.user = user; this.authInitialized = true;
        if (user) { this.verileriDinle(); }
        else {
          this.davalar = [];
          this.icralar = [];
          this.arabuluculukDosyalar = [];
          this.muvekkiller = [];
          this.ofisGorevleri = [];
          this.gunlukOzetMetni = '';
          this.gunlukOzetOlusturulmaTarihi = '';
          this.gunlukOzetKartlari = [];
          this.gunlukOzetBolumleri = [];
          this.mobilAcikKartlar = {};
        }
        this.cdr.detectChanges();
      });
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(this.auth, __initial_auth_token);
      }
    } catch (e: any) { this.authInitialized = true; this.sistemHatasi = e.message; }
  }

  authModDegistir() { this.authModu = this.authModu === 'giris' ? 'kayit' : 'giris'; this.authHata = ''; }
  async authIslemi() {
    if (!this.emailGiris || !this.sifreGiris) { this.authHata = "Lütfen alanları doldurun."; return; }
    this.authYukleniyor = true; this.authHata = '';
    try {
      if (this.authModu === 'giris') await signInWithEmailAndPassword(this.auth, this.emailGiris, this.sifreGiris);
      else await createUserWithEmailAndPassword(this.auth, this.emailGiris, this.sifreGiris);
    } catch (e: any) { this.authHata = "İşlem başarısız. Bilgileri kontrol ediniz."; } 
    finally { this.authYukleniyor = false; this.cdr.detectChanges(); }
  }
  async cikisYap() { await signOut(this.auth); this.emailGiris = ''; this.sifreGiris = ''; }

  verileriDinle() {
    if (!this.user) return; this.yukleniyor = true;
    onSnapshot(collection(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar'), (sn: any) => {
      this.davalar = sn.docs.map((d: any) => ({ id: Number(d.id), ...d.data() })).sort((a: any, b: any) => b.id - a.id);
      if (this.seciliDava) this.seciliDava = this.davalar.find((d: any) => d.id === this.seciliDava!.id) || null;
      this.yukleniyor = false; this.cdr.detectChanges();
    });
    onSnapshot(collection(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar'), (sn: any) => {
      this.icralar = sn.docs.map((d: any) => ({ id: Number(d.id), ...d.data() })).sort((a: any, b: any) => b.id - a.id);
      if (this.seciliIcra) this.seciliIcra = this.icralar.find((i: any) => i.id === this.seciliIcra!.id) || null;
      this.cdr.detectChanges();
    });
    onSnapshot(collection(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk'), (sn: any) => {
      this.arabuluculukDosyalar = sn.docs.map((d: any) => ({ id: Number(d.id), ...d.data() })).sort((a: any, b: any) => b.id - a.id);
      if (this.seciliArabuluculuk) this.seciliArabuluculuk = this.arabuluculukDosyalar.find((a: any) => a.id === this.seciliArabuluculuk!.id) || null;
      this.cdr.detectChanges();
    });
    onSnapshot(collection(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller'), (sn: any) => {
      this.muvekkiller = sn.docs.map((d: any) => {
        let data = d.data();
        if (data.tip === 'Diğer' && data._isNewDiger !== true) {
          data.tip = 'Şirketler';
        }
        return { id: Number(d.id), ...data };
      }).sort((a: any, b: any) => b.id - a.id);
      if (this.seciliIliskiId && !this.muvekkiller.some((m: any) => m.id === this.seciliIliskiId)) this.seciliIliskiId = null;
      this.cdr.detectChanges();
    });
    onSnapshot(collection(this.db, 'artifacts', appId, 'users', this.user.uid, 'ofisGorevleri'), (sn: any) => {
      this.ofisGorevleri = sn.docs.map((d: any) => ({ id: Number(d.id), ...d.data() })).sort((a: any, b: any) => this.ofisGoreviZamanDamgasi(a) - this.ofisGoreviZamanDamgasi(b));
      this.cdr.detectChanges();
    });
    onSnapshot(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ayarlar', 'sablonlar'), (ds: any) => {
      if (ds.exists()) { this.sablonlar = ds.data(); } else { this.sablonlar = { avukatlik: [], arabuluculuk: [] }; }
      this.cdr.detectChanges();
    });
  }

  async davaKaydetCloud(d: DavaDosyasi, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', d.id.toString()), JSON.parse(JSON.stringify(d)));
      if (basariMesaji) this.bildirimGoster('success', 'Dava dosyası kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Dava dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    } finally { this.islemYapiyor = false; }
  }
  async davaSilCloud(id: number, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Dava dosyası silindi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Dava dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
      return false;
    }
  }
  async icraKaydetCloud(i: IcraDosyasi, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', i.id.toString()), JSON.parse(JSON.stringify(i)));
      if (basariMesaji) this.bildirimGoster('success', 'İcra dosyası kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'İcra dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    } finally { this.islemYapiyor = false; }
  }
  async icraSilCloud(id: number, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'İcra dosyası silindi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'İcra dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
      return false;
    }
  }
  async arabuluculukKaydetCloud(a: ArabuluculukDosyasi, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', a.id.toString()), JSON.parse(JSON.stringify(a)));
      if (basariMesaji) this.bildirimGoster('success', 'Arabuluculuk dosyası kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    } finally { this.islemYapiyor = false; }
  }
  async arabuluculukSilCloud(id: number, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Arabuluculuk dosyası silindi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
      return false;
    }
  }
  async muvekkilKaydetCloud(m: Muvekkil, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', m.id.toString()), JSON.parse(JSON.stringify(m)));
      if (basariMesaji) this.bildirimGoster('success', 'Kişi kaydı kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      console.error(e);
      this.bildirimGoster('error', 'Kişi kaydı kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    } finally { this.islemYapiyor = false; }
  }
  async muvekkilSilCloud(id: number, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Kişi kaydı silindi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Kişi kaydı silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
      return false;
    }
  }
  async ofisGoreviKaydetCloud(gorev: OfisGorevi, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ofisGorevleri', gorev.id.toString()), JSON.parse(JSON.stringify(gorev)));
      if (basariMesaji) this.bildirimGoster('success', 'Ofis görevi kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Ofis görevi kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    } finally { this.islemYapiyor = false; }
  }
  async ofisGoreviSilCloud(id: number, basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ofisGorevleri', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Ofis görevi silindi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Ofis görevi silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
      return false;
    }
  }
  async sablonlariKaydetCloud(basariMesaji?: string): Promise<boolean> {
    if (!this.user) return false;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ayarlar', 'sablonlar'), JSON.parse(JSON.stringify(this.sablonlar)));
      if (basariMesaji) this.bildirimGoster('success', 'Şablonlar kaydedildi', basariMesaji);
      return true;
    } catch (e: any) {
      this.bildirimGoster('error', 'Şablonlar kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
      return false;
    }
  }

  gunlukOzetGunSayisiniSinirla(deger: any) {
    const sayi = Number(deger);
    if (!Number.isFinite(sayi)) return 30;
    return Math.min(60, Math.max(7, Math.round(sayi)));
  }

  getGunlukOzetAjandaKayitlari(gunSayisi = this.gunlukOzetGunSayisiniSinirla(this.gunlukOzetYakinGunSayisi)) {
    return [...this.ajandaKayitlari]
      .filter(kayit => {
        const fark = this.ajandaGunFarki(kayit.tarih);
        return fark < 0 || fark <= gunSayisi;
      })
      .sort((a, b) => {
        const farkA = this.ajandaGunFarki(a.tarih);
        const farkB = this.ajandaGunFarki(b.tarih);
        const oncelikA = farkA < 0 ? 0 : (farkA === 0 ? 1 : 2);
        const oncelikB = farkB < 0 ? 0 : (farkB === 0 ? 1 : 2);
        if (oncelikA !== oncelikB) return oncelikA - oncelikB;
        return this.ajandaTarihDamgasi(a.tarih) - this.ajandaTarihDamgasi(b.tarih);
      });
  }

  gunlukOzetAjandaSatiri(kayit: AjandaKaydi) {
    const etiket = `${this.getAjandaKaynakEtiketi(kayit.kaynak)} / ${this.getAjandaTurEtiketi(kayit.tur)}`;
    const tarih = this.formatTarihSaatKisa(kayit.tarih, kayit.saat);
    return `- [${etiket}] ${kayit.baslik} | ${kayit.taraflar} | ${tarih} | ${this.getAjandaDurumMetni(kayit)}`;
  }

  gunlukOzetSureSatiri(sure: ArabuluculukSureSayaci) {
    const referans = `${sure.dosya.buroNo ? sure.dosya.buroNo + ' / ' : ''}${sure.dosya.arabuluculukNo}`;
    return `- [${sure.dosya.uyusmazlikTuru}] ${referans} | ${this.getArabuluculukTarafIsimMetni(sure.dosya)} | ${this.getArabuluculukSureKalanMetni(sure)} | Azami son: ${this.formatTarih(sure.azamiSonTarih)}`;
  }

  getGunlukOzetKartClass(ton: GunlukOzetTon) {
    if (ton === 'rose') return 'border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70';
    if (ton === 'amber') return 'border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70';
    if (ton === 'blue') return 'border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-100/70';
    if (ton === 'violet') return 'border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/60';
    if (ton === 'emerald') return 'border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70';
    return 'border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/80';
  }

  getGunlukOzetVurguClass(ton: GunlukOzetTon) {
    if (ton === 'rose') return 'text-rose-700';
    if (ton === 'amber') return 'text-amber-700';
    if (ton === 'blue') return 'text-blue-700';
    if (ton === 'violet') return 'text-violet-700';
    if (ton === 'emerald') return 'text-emerald-700';
    return 'text-slate-700';
  }

  getGunlukOzetRozetClass(ton: GunlukOzetTon) {
    if (ton === 'rose') return 'border border-rose-200 bg-rose-100 text-rose-700';
    if (ton === 'amber') return 'border border-amber-200 bg-amber-100 text-amber-700';
    if (ton === 'blue') return 'border border-blue-200 bg-blue-100 text-blue-700';
    if (ton === 'violet') return 'border border-violet-200 bg-violet-100 text-violet-700';
    if (ton === 'emerald') return 'border border-emerald-200 bg-emerald-100 text-emerald-700';
    return 'border border-slate-200 bg-slate-100 text-slate-700';
  }

  gunlukOzetAjandaOnizlemeKaydi(kayit: AjandaKaydi): GunlukOzetKayitOnizleme {
    const gunFarki = this.ajandaGunFarki(kayit.tarih);
    const ton: GunlukOzetTon = gunFarki < 0 ? 'rose' : (gunFarki === 0 ? 'amber' : 'blue');
    return {
      baslik: kayit.baslik,
      altBaslik: kayit.taraflar || `${this.getAjandaKaynakEtiketi(kayit.kaynak)} kaydı`,
      meta: `${this.getAjandaKaynakEtiketi(kayit.kaynak)} • ${this.getAjandaTurEtiketi(kayit.tur)} • ${this.formatTarihSaatKisa(kayit.tarih, kayit.saat)}`,
      rozet: this.getAjandaDurumMetni(kayit),
      ton,
      eylem: () => this.ajandaKaydinaGit(kayit),
      eylemEtiketi: 'İşleme git'
    };
  }

  gunlukOzetSureOnizlemeKaydi(sure: ArabuluculukSureSayaci): GunlukOzetKayitOnizleme {
    const ton: GunlukOzetTon = sure.asama === 'asildi' ? 'rose' : sure.asama === 'uzatma' ? 'amber' : 'violet';
    return {
      baslik: `${sure.dosya.buroNo ? sure.dosya.buroNo + ' / ' : ''}${sure.dosya.arabuluculukNo}`,
      altBaslik: this.getArabuluculukTarafIsimMetni(sure.dosya),
      meta: `${sure.dosya.uyusmazlikTuru} • Görevlendirme: ${this.formatTarih(sure.gorevlendirmeTarihi)} • Azami son: ${this.formatTarih(sure.azamiSonTarih)}`,
      rozet: this.getArabuluculukSureKalanMetni(sure),
      ton,
      eylem: () => this.arabuluculukDetayinaGit(sure.dosya),
      eylemEtiketi: 'Dosyaya git'
    };
  }

  gunlukOzetiOlustur() {
    this.gunlukOzetYakinGunSayisi = this.gunlukOzetGunSayisiniSinirla(this.gunlukOzetYakinGunSayisi);
    const gecikenKayitlar = this.ajandaKayitlari.filter(kayit => this.ajandaGunFarki(kayit.tarih) < 0);
    const bugunkuKayitlar = this.ajandaKayitlari.filter(kayit => this.ajandaGunFarki(kayit.tarih) === 0);
    const yaklasanKayitlar = this.ajandaKayitlari
      .filter(kayit => {
        const fark = this.ajandaGunFarki(kayit.tarih);
        return fark > 0 && fark <= this.gunlukOzetYakinGunSayisi;
      })
      .sort((a, b) => this.ajandaTarihDamgasi(a.tarih) - this.ajandaTarihDamgasi(b.tarih));
    const sayacKayitlari = this.kritikArabuluculukSureKayitlari;
    const tahsilatDosyaSayisi = this.dashboardUyariOzet.tahsilat;
    const tahsilatTutari = this.dashboardUyariOzet.tahsilatTutari;

    this.gunlukOzetKartlari = [
      { etiket: 'Geciken', deger: `${gecikenKayitlar.length}`, aciklama: 'Süresi geçmiş ajanda ve evrak kaydı', ton: 'rose' },
      { etiket: 'Bugün', deger: `${bugunkuKayitlar.length}`, aciklama: 'Bugün takip edilmesi gereken kayıt', ton: 'amber' },
      { etiket: `Önümüzdeki ${this.gunlukOzetYakinGunSayisi} Gün`, deger: `${yaklasanKayitlar.length}`, aciklama: 'Yaklaşan duruşma, toplantı ve süreli işler', ton: 'blue' },
      { etiket: 'Sayaç Alarmı', deger: `${sayacKayitlari.length}`, aciklama: 'Kritik arabuluculuk süre sayaçları', ton: 'violet' },
      { etiket: 'Tahsilat Önceliği', deger: `${tahsilatDosyaSayisi} dosya`, aciklama: this.formatPara(tahsilatTutari), ton: 'emerald' }
    ];

    this.gunlukOzetBolumleri = [
      {
        baslik: 'Geciken Kayıtlar',
        aciklama: 'Önce kırmızı alanları toparlamak en güvenli başlangıç olur.',
        ton: 'rose',
        bosMesaji: 'Geciken kayıt yok.',
        kayitlar: gecikenKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaOnizlemeKaydi(kayit))
      },
      {
        baslik: 'Bugün',
        aciklama: 'Bugün yapılacak işler amber vurguyla öne çıkarıldı.',
        ton: 'amber',
        bosMesaji: 'Bugüne ait kayıt yok.',
        kayitlar: bugunkuKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaOnizlemeKaydi(kayit))
      },
      {
        baslik: `Önümüzdeki ${this.gunlukOzetYakinGunSayisi} Gün`,
        aciklama: 'Yaklaşan işler tarih sırasına göre listelendi.',
        ton: 'blue',
        bosMesaji: 'Bu aralıkta planlı kayıt yok.',
        kayitlar: yaklasanKayitlar.slice(0, 12).map(kayit => this.gunlukOzetAjandaOnizlemeKaydi(kayit))
      },
      {
        baslik: 'Arabuluculuk Süre Alarmları',
        aciklama: 'Uzatma penceresi ve aşılmış süreler renkli şekilde vurgulanır.',
        ton: 'violet',
        bosMesaji: 'Kritik süre alarmı görünmüyor.',
        kayitlar: sayacKayitlari.slice(0, 8).map(sure => this.gunlukOzetSureOnizlemeKaydi(sure))
      }
    ];

    const satirlar = [
      'Günlük Bildirim Özeti',
      `Oluşturma tarihi: ${this.formatTarihSaatKisa(new Date().toISOString())}`,
      '',
      `Geciken kayıt: ${gecikenKayitlar.length}`,
      `Bugün takip edilecek kayıt: ${bugunkuKayitlar.length}`,
      `Önümüzdeki ${this.gunlukOzetYakinGunSayisi} gün: ${yaklasanKayitlar.length}`,
      `Arabuluculuk süre alarmı: ${sayacKayitlari.length}`,
      `Tahsilat bekleyen dosya: ${this.dashboardUyariOzet.tahsilat} (${this.formatPara(this.dashboardUyariOzet.tahsilatTutari)})`
    ];

    const bolumEkle = (baslik: string, satirListesi: string[], bosMesaji: string) => {
      satirlar.push('', baslik);
      if (satirListesi.length) satirlar.push(...satirListesi);
      else satirlar.push(`- ${bosMesaji}`);
    };

    bolumEkle('GECİKEN KAYITLAR', gecikenKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaSatiri(kayit)), 'Geciken kayıt yok.');
    bolumEkle('BUGÜN', bugunkuKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaSatiri(kayit)), 'Bugüne ait kayıt yok.');
    bolumEkle(
      `ÖNÜMÜZDEKİ ${this.gunlukOzetYakinGunSayisi} GÜN`,
      yaklasanKayitlar.slice(0, 12).map(kayit => this.gunlukOzetAjandaSatiri(kayit)),
      'Bu aralıkta planlı kayıt yok.'
    );
    bolumEkle(
      'ARABULUCULUK SÜRE ALARMLARI',
      sayacKayitlari.slice(0, 8).map(sure => this.gunlukOzetSureSatiri(sure)),
      'Kritik süre alarmı görünmüyor.'
    );

    this.gunlukOzetMetni = satirlar.join('\n');
    this.gunlukOzetOlusturulmaTarihi = new Date().toISOString();
    this.bildirimGoster(
      'success',
      'Günlük özet hazır',
      `${gecikenKayitlar.length} geciken, ${bugunkuKayitlar.length} bugün ve ${yaklasanKayitlar.length} yaklaşan kayıt toparlandı.`
    );
  }

  async gunlukOzetiKopyala() {
    if (this.gunlukOzetKopyalaniyor) return;
    if (!this.gunlukOzetMetni.trim()) this.gunlukOzetiOlustur();
    if (!this.gunlukOzetMetni.trim()) return;

    this.gunlukOzetKopyalaniyor = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.gunlukOzetMetni);
      } else if (typeof document !== 'undefined') {
        const alan = document.createElement('textarea');
        alan.value = this.gunlukOzetMetni;
        alan.setAttribute('readonly', 'true');
        alan.style.position = 'fixed';
        alan.style.opacity = '0';
        document.body.appendChild(alan);
        alan.focus();
        alan.select();
        document.execCommand('copy');
        document.body.removeChild(alan);
      }
      this.bildirimGoster('success', 'Ozet kopyalandi', 'Hazir metni e-posta, WhatsApp veya not uygulamasina yapistirabilirsin.');
    } catch (e: any) {
      this.bildirimGoster('error', 'Ozet kopyalanamadi', e?.message || 'Panoya kopyalama tamamlanamadi.');
    } finally {
      this.gunlukOzetKopyalaniyor = false;
    }
  }

  belgeCiktiVarsayilanFormu(): BelgeCiktiFormu {
    return {
      belgeTuru: 'Dava Dilekçesi',
      belgeBasligi: 'DİLEKÇE',
      mahkemeKurum: '',
      dosyaNo: '',
      tarafBilgileri: '',
      konu: '',
      aciklamalar: '',
      hukukiSebepler: '',
      deliller: '',
      sonucIstem: '',
      imzaBlogu: 'Arb. Av. Ömer Faruk AKYAVAŞ'
    };
  }

  belgeCiktiKaynakTuruDegisti() {
    this.belgeCiktiSeciliDosyaAnahtari = '';
    this.belgeCiktiDosyaArama = '';
  }

  belgeCiktiSeciliHazirSablon() {
    return this.belgeCiktiHazirSablonlari.find(sablon => sablon.id === this.belgeCiktiSeciliSablonId) || null;
  }

  belgeCiktiSablonSecildi() {
    const sablon = this.belgeCiktiSeciliHazirSablon();
    this.belgeCiktiSablonDegerleri = {};
    if (!sablon) return;

    if (sablon.kaynakTuru && this.belgeCiktiKaynakTuru !== sablon.kaynakTuru) {
      this.belgeCiktiKaynakTuru = sablon.kaynakTuru;
      this.belgeCiktiKaynakTuruDegisti();
    }

    sablon.alanlar.forEach(alan => {
      this.belgeCiktiSablonDegerleri[alan.anahtar] = alan.varsayilan || '';
    });
  }

  belgeCiktiSablonYerTutuculari() {
    const secenek = this.belgeCiktiSeciliKaynakSecenegi();
    const yerTutucular: Record<string, string> = {
      BELGE_TARIHI: this.formatTarih(new Date().toISOString()),
      DOSYA_NO: '',
      DOSYA_NUMARALARI: '',
      MAHKEME_KURUM: '',
      KONU: '',
      TARAFLAR_KISA: '',
      TARAFLAR_DETAYLI: '',
      TARAF_SAYISI: '0'
    };

    if (secenek?.tur === 'dava') {
      const dava = secenek.dosya as DavaDosyasi;
      const taraflar = this.getDavaTarafKayitlari(dava);
      yerTutucular['DOSYA_NO'] = this.belgeCiktiDavaDosyaNoMetni(dava);
      yerTutucular['DOSYA_NUMARALARI'] = this.belgeCiktiDavaDosyaNoMetni(dava);
      yerTutucular['MAHKEME_KURUM'] = this.formatMetin(dava.mahkeme) || '';
      yerTutucular['KONU'] = this.formatMetin(dava.konu) || '';
      yerTutucular['DAVACI'] = taraflar.davacilar.map(taraf => this.formatMetin(taraf.isim)).filter(Boolean).join(', ') || dava.muvekkil || '';
      yerTutucular['DAVALI'] = taraflar.davalilar.map(taraf => this.formatMetin(taraf.isim)).filter(Boolean).join(', ') || dava.karsiTaraf || '';
      yerTutucular['TARAFLAR_KISA'] = this.getDavaTarafOzet(dava);
      yerTutucular['TARAFLAR_DETAYLI'] = this.belgeCiktiDavaTarafMetni(dava);
      yerTutucular['TARAF_SAYISI'] = String([...(taraflar.davacilar || []), ...(taraflar.davalilar || [])].length || 2);
    } else if (secenek?.tur === 'icra') {
      const icra = secenek.dosya as IcraDosyasi;
      yerTutucular['DOSYA_NO'] = icra.dosyaNo || '';
      yerTutucular['DOSYA_NUMARALARI'] = icra.dosyaNo || '';
      yerTutucular['MAHKEME_KURUM'] = icra.icraDairesi || '';
      yerTutucular['KONU'] = icra.takipTipi || '';
      yerTutucular['ALACAKLI'] = icra.alacakli || '';
      yerTutucular['BORCLU'] = icra.borclu || '';
      yerTutucular['TARAFLAR_KISA'] = `${icra.alacakli || '-'} - ${icra.borclu || '-'}`;
      yerTutucular['TARAFLAR_DETAYLI'] = this.belgeCiktiIcraTarafMetni(icra);
      yerTutucular['TARAF_SAYISI'] = String([icra.alacakli, icra.borclu].filter(deger => (deger || '').trim() && deger !== '-').length || 2);
    } else if (secenek?.tur === 'arabuluculuk') {
      const arabuluculuk = secenek.dosya as ArabuluculukDosyasi;
      const arabuluculukDosyaNumaralari = this.belgeCiktiArabuluculukDosyaNumaralariMetni(arabuluculuk);
      yerTutucular['DOSYA_NO'] = arabuluculukDosyaNumaralari;
      yerTutucular['DOSYA_NUMARALARI'] = arabuluculukDosyaNumaralari;
      yerTutucular['ARABULUCULUK_DOSYA_NUMARALARI'] = arabuluculukDosyaNumaralari;
      yerTutucular['MAHKEME_KURUM'] = arabuluculuk.buro || '';
      yerTutucular['KONU'] = arabuluculuk.basvuruKonusu || '';
      yerTutucular['ARABULUCULUK_NO'] = arabuluculuk.arabuluculukNo || '';
      yerTutucular['BURO_NO'] = arabuluculuk.buroNo || '';
      yerTutucular['BURO'] = arabuluculuk.buro || '';
      yerTutucular['BASVURU_TURU'] = arabuluculuk.basvuruTuru || '';
      yerTutucular['UYUSMAZLIK_TURU'] = arabuluculuk.uyusmazlikTuru || '';
      yerTutucular['BASVURU_KONUSU'] = arabuluculuk.basvuruKonusu || '';
      yerTutucular['BASVURUCU'] = this.getArabuluculukTaraflari(arabuluculuk, 'Başvurucu');
      yerTutucular['DIGER_TARAFLAR'] = this.getArabuluculukTaraflari(arabuluculuk, 'Diğer Taraf');
      yerTutucular['TARAFLAR_KISA'] = this.getArabuluculukTaraflari(arabuluculuk);
      yerTutucular['TARAFLAR_DETAYLI'] = this.belgeCiktiArabuluculukTarafMetni(arabuluculuk);
      yerTutucular['TARAF_SAYISI'] = String((arabuluculuk.taraflar || []).filter(taraf => (taraf.isim || '').trim()).length || arabuluculuk.taraflar?.length || 0);
      yerTutucular['ODENECEK_TUTAR'] = arabuluculuk.arabulucuUcretiTutari || '';
    }

    this.belgeCiktiSeciliHazirSablon()?.alanlar.forEach(alan => {
      yerTutucular[alan.anahtar] = this.belgeCiktiMetin(
        this.belgeCiktiSablonDegerleri[alan.anahtar],
        yerTutucular[alan.anahtar] || alan.varsayilan || ''
      );
    });

    return yerTutucular;
  }

  belgeCiktiSablonMetniDoldur(metin: string, yerTutucular = this.belgeCiktiSablonYerTutuculari()) {
    return (metin || '').replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_eslesme, anahtar: string) => yerTutucular[anahtar] ?? '');
  }

  belgeCiktiHazirSablonUygula() {
    const sablon = this.belgeCiktiSeciliHazirSablon();
    if (!sablon) {
      this.bildirimGoster('error', 'Şablon seçilmedi', 'Belgeye yerleştirmek için önce hazır metin şablonu seçin.');
      return;
    }

    const yerTutucular = this.belgeCiktiSablonYerTutuculari();
    this.belgeCiktiFormu = {
      ...this.belgeCiktiFormu,
      belgeTuru: sablon.belgeTuru,
      belgeBasligi: sablon.belgeBasligi,
      mahkemeKurum: this.belgeCiktiSablonMetniDoldur(sablon.mahkemeKurum, yerTutucular),
      dosyaNo: this.belgeCiktiMetin(yerTutucular['DOSYA_NO'], this.belgeCiktiFormu.dosyaNo),
      tarafBilgileri: this.belgeCiktiMetin(yerTutucular['TARAFLAR_DETAYLI'], this.belgeCiktiFormu.tarafBilgileri),
      konu: this.belgeCiktiSablonMetniDoldur(sablon.konu, yerTutucular),
      aciklamalar: this.belgeCiktiSablonMetniDoldur(sablon.aciklamalar, yerTutucular),
      hukukiSebepler: this.belgeCiktiSablonMetniDoldur(sablon.hukukiSebepler, yerTutucular),
      deliller: this.belgeCiktiSablonMetniDoldur(sablon.deliller, yerTutucular),
      sonucIstem: this.belgeCiktiSablonMetniDoldur(sablon.sonucIstem, yerTutucular),
      imzaBlogu: this.belgeCiktiSablonMetniDoldur(sablon.imzaBlogu || 'Arb. Av. Ömer Faruk AKYAVAŞ', yerTutucular)
    };

    if (sablon.kaynakTuru && !this.belgeCiktiSeciliKaynakSecenegi()) {
      this.bildirimGoster('info', 'Şablon yerleştirildi', 'Dosya seçerseniz numara ve taraf alanları da otomatik dolar.');
      return;
    }
    this.bildirimGoster('success', 'Şablon belgeye yerleştirildi', 'Metni kontrol edip DOCX veya UYAP’a hazır RTF olarak indirebilirsiniz.');
  }

  belgeCiktiDosyaBasligi(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi, tur: BelgeCiktiKaynakTuru) {
    if (tur === 'dava') {
      const dava = dosya as DavaDosyasi;
      return this.belgeCiktiMetin(this.belgeCiktiDavaDosyaNoMetni(dava), 'Dava dosyası');
    }
    if (tur === 'icra') {
      const icra = dosya as IcraDosyasi;
      return `${this.belgeCiktiMetin(icra.icraDairesi, 'İcra Dairesi')} / ${this.belgeCiktiMetin(icra.dosyaNo, 'Dosya No')}`;
    }
    const arabuluculuk = dosya as ArabuluculukDosyasi;
    return this.belgeCiktiArabuluculukDosyaNumaralariMetni(arabuluculuk) || 'Arabuluculuk Dosyası';
  }

  belgeCiktiArabuluculukDosyaNumaralariMetni(dosya: ArabuluculukDosyasi) {
    const numaralar = [
      dosya.buroNo ? `Büro No: ${dosya.buroNo}` : '',
      dosya.arabuluculukNo ? `Arabuluculuk No: ${dosya.arabuluculukNo}` : ''
    ].filter(Boolean);
    return numaralar.join(' / ');
  }

  belgeCiktiDavaDosyaNoMetni(dava: DavaDosyasi) {
    const numaralar = (dava.dosyaNumaralari || [])
      .map(numara => [this.formatMetin(numara.tur), this.formatMetin(numara.no)].filter(Boolean).join(': '))
      .filter(Boolean)
      .join(' / ');
    return numaralar || this.belgeCiktiMetin(dava.dosyaNo);
  }

  belgeCiktiKaynakAltBasligi(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi, tur: BelgeCiktiKaynakTuru) {
    if (tur === 'dava') {
      const dava = dosya as DavaDosyasi;
      return [this.formatMetin(dava.mahkeme), this.getDavaTarafOzet(dava)].filter(Boolean).join(' • ');
    }
    if (tur === 'icra') {
      const icra = dosya as IcraDosyasi;
      return [`Alacaklı: ${icra.alacakli || '-'}`, `Borçlu: ${icra.borclu || '-'}`].join(' • ');
    }
    const arabuluculuk = dosya as ArabuluculukDosyasi;
    return [this.formatMetin(arabuluculuk.buro), this.getArabuluculukTarafOzet(arabuluculuk)].filter(Boolean).join(' • ');
  }

  belgeCiktiTumKaynakSecenekleri(): BelgeCiktiKaynakSecenegi[] {
    const tur = this.belgeCiktiKaynakTuru;
    const liste = tur === 'dava'
      ? this.davalar
      : tur === 'icra'
      ? this.icralar
      : this.arabuluculukDosyalar;

    return liste
      .map(dosya => {
        const baslik = this.belgeCiktiDosyaBasligi(dosya as any, tur);
        const altBaslik = this.belgeCiktiKaynakAltBasligi(dosya as any, tur);
        return {
          anahtar: `${tur}:${dosya.id}`,
          tur,
          baslik,
          altBaslik,
          aramaMetni: this.sablonAramaMetniHazirla([baslik, altBaslik].filter(Boolean).join(' ')),
          sira: dosya.id || 0,
          dosya: dosya as DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi
        };
      })
      .sort((a, b) => b.sira - a.sira);
  }

  belgeCiktiKaynakSecenekleri() {
    const arama = this.sablonAramaMetniHazirla(this.belgeCiktiDosyaArama);
    return this.belgeCiktiTumKaynakSecenekleri().filter(secenek => !arama || secenek.aramaMetni.includes(arama));
  }

  belgeCiktiSeciliKaynakSecenegi() {
    if (!this.belgeCiktiSeciliDosyaAnahtari) return null;
    return this.belgeCiktiTumKaynakSecenekleri().find(secenek => secenek.anahtar === this.belgeCiktiSeciliDosyaAnahtari) || null;
  }

  belgeCiktiDavaTarafMetni(dava: DavaDosyasi) {
    const taraflar = this.getDavaTarafKayitlari(dava);
    const davacilar = taraflar.davacilar.map(taraf => this.formatMetin(taraf.isim)).filter(Boolean).join(', ') || this.belgeCiktiMetin(dava.muvekkil, '-');
    const davalilar = taraflar.davalilar.map(taraf => this.formatMetin(taraf.isim)).filter(Boolean).join(', ') || this.belgeCiktiMetin(dava.karsiTaraf, '-');
    const muvekkil = this.belgeCiktiMetin(dava.muvekkil);
    return [
      `Davacı: ${davacilar}`,
      `Davalı: ${davalilar}`,
      muvekkil ? `Müvekkil: ${muvekkil}` : ''
    ].filter(Boolean).join('\n');
  }

  belgeCiktiIcraTarafMetni(icra: IcraDosyasi) {
    return [
      `Alacaklı: ${this.belgeCiktiMetin(icra.alacakli, '-')}`,
      `Borçlu: ${this.belgeCiktiMetin(icra.borclu, '-')}`,
      `Müvekkil: ${this.belgeCiktiMetin(icra.muvekkil, '-')}${icra.muvekkilRolu ? ` (${icra.muvekkilRolu})` : ''}`
    ].join('\n');
  }

  belgeCiktiArabuluculukTarafMetni(dosya: ArabuluculukDosyasi) {
    const taraflar = (dosya.taraflar || [])
      .map(taraf => `${this.formatMetin(taraf.tip) || 'Taraf'}: ${this.formatMetin(taraf.isim) || '-'}`)
      .filter(Boolean);
    const muvekkil = this.getArabuluculukMuvekkilAdi(dosya);
    if (muvekkil) taraflar.push(`Müvekkil / Hesap Muhatabı: ${muvekkil}`);
    return taraflar.join('\n') || 'Taraf bilgisi girilmemiş.';
  }

  belgeCiktiDosyadanAktar() {
    const secenek = this.belgeCiktiSeciliKaynakSecenegi();
    if (!secenek) {
      this.bildirimGoster('error', 'Dosya seçilmedi', 'Bilgileri aktarmak için önce listeden bir dosya seçin.');
      return;
    }

    let mahkemeKurum = '';
    let dosyaNo = '';
    let tarafBilgileri = '';
    let konu = '';

    if (secenek.tur === 'dava') {
      const dava = secenek.dosya as DavaDosyasi;
      mahkemeKurum = this.belgeCiktiMetin(dava.mahkeme, 'İLGİLİ MAHKEME');
      dosyaNo = this.belgeCiktiMetin(this.belgeCiktiDavaDosyaNoMetni(dava), '-');
      tarafBilgileri = this.belgeCiktiDavaTarafMetni(dava);
      konu = this.belgeCiktiMetin(dava.konu, 'Dava dosyasına ilişkin beyan ve taleplerimizden ibarettir.');
    } else if (secenek.tur === 'icra') {
      const icra = secenek.dosya as IcraDosyasi;
      mahkemeKurum = this.belgeCiktiMetin(icra.icraDairesi, 'İLGİLİ İCRA DAİRESİ');
      dosyaNo = this.belgeCiktiMetin(icra.dosyaNo, '-');
      tarafBilgileri = this.belgeCiktiIcraTarafMetni(icra);
      konu = this.belgeCiktiMetin(icra.takipTipi ? `${icra.takipTipi} icra takibi` : '', 'İcra dosyasına ilişkin talep ve beyanlarımızdan ibarettir.');
    } else {
      const arabuluculuk = secenek.dosya as ArabuluculukDosyasi;
      mahkemeKurum = this.belgeCiktiMetin(arabuluculuk.buro, 'İLGİLİ ARABULUCULUK BÜROSU');
      dosyaNo = this.belgeCiktiDosyaBasligi(arabuluculuk, 'arabuluculuk');
      tarafBilgileri = this.belgeCiktiArabuluculukTarafMetni(arabuluculuk);
      konu = [
        this.formatMetin(arabuluculuk.basvuruTuru),
        this.formatMetin(arabuluculuk.uyusmazlikTuru),
        this.formatMetin(arabuluculuk.basvuruKonusu)
      ].filter(Boolean).join(' - ') || 'Arabuluculuk dosyasına ilişkin belge düzenlenmesinden ibarettir.';
    }

    const mevcutBaslik = this.belgeCiktiMetin(this.belgeCiktiFormu.belgeBasligi);
    const otomatikBaslik = !mevcutBaslik || mevcutBaslik === 'DİLEKÇE'
      ? this.belgeCiktiMetin(this.belgeCiktiFormu.belgeTuru, 'DİLEKÇE').toLocaleUpperCase('tr-TR')
      : mevcutBaslik;

    this.belgeCiktiFormu = {
      ...this.belgeCiktiFormu,
      belgeBasligi: otomatikBaslik,
      mahkemeKurum,
      dosyaNo,
      tarafBilgileri,
      konu
    };

    this.bildirimGoster('success', 'Dosya bilgileri aktarıldı', 'Kurum, dosya numarası, taraflar ve konu alanları belge formuna yerleştirildi.');
  }

  belgeCiktiOrnekDavaDilekcesiYukle() {
    this.belgeCiktiFormu = {
      belgeTuru: 'Dava Dilekçesi',
      belgeBasligi: 'DAVA DİLEKÇESİ',
      mahkemeKurum: 'İstanbul Nöbetçi Asliye Hukuk Mahkemesi',
      dosyaNo: '2026/...',
      tarafBilgileri: 'Davacı: ...\nDavalı: ...',
      konu: 'Fazlaya ilişkin haklarımız saklı kalmak kaydıyla alacak talebimizden ibarettir.',
      aciklamalar: '1. Müvekkil ile davalı arasındaki hukuki ilişki kapsamında uyuşmazlık doğmuştur.\n2. Davalı tarafın yükümlülüklerini yerine getirmemesi nedeniyle işbu davanın açılması zorunlu olmuştur.',
      hukukiSebepler: 'Türk Borçlar Kanunu, Hukuk Muhakemeleri Kanunu ve ilgili sair mevzuat.',
      deliller: 'Sözleşme, yazışmalar, banka kayıtları, tanık beyanları, bilirkişi incelemesi ve sair yasal deliller.',
      sonucIstem: 'Yukarıda arz ve izah edilen nedenlerle davamızın kabulüne, yargılama giderleri ve vekalet ücretinin karşı tarafa yükletilmesine karar verilmesini saygıyla arz ve talep ederiz.',
      imzaBlogu: 'Arb. Av. Ömer Faruk AKYAVAŞ'
    };
  }

  belgeCiktiOrnekBeyanDilekcesiYukle() {
    this.belgeCiktiFormu = {
      belgeTuru: 'Beyan Dilekçesi',
      belgeBasligi: 'BEYAN DİLEKÇESİ',
      mahkemeKurum: 'İstanbul Anadolu ... Mahkemesi',
      dosyaNo: '2026/...',
      tarafBilgileri: 'Davacı: ...\nDavalı: ...',
      konu: 'Sayın Mahkemeniz dosyasına beyanlarımızın sunulmasından ibarettir.',
      aciklamalar: 'Dosya kapsamındaki beyan ve delillerimiz çerçevesinde aşağıdaki hususların dikkate alınmasını talep ederiz.',
      hukukiSebepler: 'HMK ve ilgili sair mevzuat.',
      deliller: 'Dosya kapsamı, taraf beyanları ve sair yasal deliller.',
      sonucIstem: 'Açıklanan nedenlerle beyanlarımızın dosya kapsamında değerlendirilmesini saygıyla arz ve talep ederiz.',
      imzaBlogu: 'Arb. Av. Ömer Faruk AKYAVAŞ'
    };
  }

  belgeCiktiMetin(deger: any, varsayilan = '') {
    const metin = typeof deger === 'string' ? deger.trim() : '';
    return metin || varsayilan;
  }

  belgeCiktiDosyaAdi(uzanti: 'docx' | 'rtf' | 'txt') {
    const tur = this.belgeCiktiMetin(this.belgeCiktiFormu.belgeTuru, 'belge')
      .toLocaleLowerCase('tr-TR')
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'belge';
    return `${tur}-${new Date().toISOString().slice(0, 10)}.${uzanti}`;
  }

  belgeCiktiGovdeParagraflari(metin: string, varsayilan: string) {
    return this.belgeCiktiMetin(metin, varsayilan)
      .split(/\n+/)
      .map(satir => satir.trim())
      .filter(Boolean);
  }

  belgeCiktiParagraflariOlustur(): BelgeParagrafi[] {
    const f = this.belgeCiktiFormu;
    const mahkemeSatirlari = this.belgeCiktiGovdeParagraflari(f.mahkemeKurum, 'İLGİLİ MAKAMA')
      .map(metin => metin.toLocaleUpperCase('tr-TR'));
    const belgeBasligi = this.belgeCiktiMetin(f.belgeBasligi, f.belgeTuru || 'DİLEKÇE').toLocaleUpperCase('tr-TR');
    const paragraflar: BelgeParagrafi[] = [
      ...mahkemeSatirlari.map((metin, index) => ({ metin, hizalama: 'center' as const, kalin: true, boslukSonrasi: index === mahkemeSatirlari.length - 1 ? 220 : 40 })),
      { metin: belgeBasligi, hizalama: 'center', kalin: true, boslukSonrasi: 260 },
      { metin: `DOSYA NO: ${this.belgeCiktiMetin(f.dosyaNo, 'Belirtilmedi')}`, kalin: true, boslukSonrasi: 120 },
      { metin: 'TARAFLAR', kalin: true, boslukSonrasi: 80 }
    ];

    this.belgeCiktiGovdeParagraflari(f.tarafBilgileri, 'Taraf bilgileri daha sonra tamamlanacaktır.').forEach(metin => paragraflar.push({ metin, hizalama: 'both', boslukSonrasi: 90 }));
    paragraflar.push({ metin: 'KONU', kalin: true, boslukSonrasi: 80 });
    this.belgeCiktiGovdeParagraflari(f.konu, 'Konu bilgisi daha sonra tamamlanacaktır.').forEach(metin => paragraflar.push({ metin, hizalama: 'both', boslukSonrasi: 120 }));

    const bolumler = [
      { baslik: 'AÇIKLAMALAR', metin: f.aciklamalar, varsayilan: 'Açıklamalar bölümü daha sonra tamamlanacaktır.' },
      { baslik: 'HUKUKİ SEBEPLER', metin: f.hukukiSebepler, varsayilan: 'İlgili mevzuat ve sair hukuki sebepler.' },
      { baslik: 'DELİLLER', metin: f.deliller, varsayilan: 'Yasal deliller.' },
      { baslik: 'SONUÇ VE İSTEM', metin: f.sonucIstem, varsayilan: 'Yukarıda açıklanan nedenlerle gereğinin yapılmasını saygıyla arz ve talep ederiz.' }
    ];

    bolumler.forEach(bolum => {
      paragraflar.push({ metin: bolum.baslik, kalin: true, boslukSonrasi: 80 });
      this.belgeCiktiGovdeParagraflari(bolum.metin, bolum.varsayilan).forEach(metin => paragraflar.push({ metin, hizalama: 'both', boslukSonrasi: 130 }));
    });

    paragraflar.push({ metin: '', boslukSonrasi: 180 });
    this.belgeCiktiGovdeParagraflari(f.imzaBlogu, 'Arb. Av. Ömer Faruk AKYAVAŞ').forEach(metin => paragraflar.push({ metin, hizalama: 'right', kalin: true, boslukSonrasi: 80 }));
    return paragraflar;
  }

  belgeCiktiDuzMetinOlustur() {
    return this.belgeCiktiParagraflariOlustur()
      .map(paragraf => paragraf.metin)
      .join('\n\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  async belgeCiktiDuzMetniKopyala() {
    const metin = this.belgeCiktiDuzMetinOlustur();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(metin);
      } else if (typeof document !== 'undefined') {
        const alan = document.createElement('textarea');
        alan.value = metin;
        alan.setAttribute('readonly', 'true');
        alan.style.position = 'fixed';
        alan.style.opacity = '0';
        document.body.appendChild(alan);
        alan.focus();
        alan.select();
        document.execCommand('copy');
        document.body.removeChild(alan);
      }
      this.bildirimGoster('success', 'Belge metni kopyalandı', 'Metni Google Dokümanlar veya UYAP Editör alanına yapıştırabilirsiniz.');
    } catch (e: any) {
      this.bildirimGoster('error', 'Metin kopyalanamadı', e?.message || 'Panoya kopyalama tamamlanamadı.');
    }
  }

  belgeCiktiRtfCp1254Byte(karakter: string) {
    const kod = karakter.codePointAt(0) || 0;
    if (kod >= 32 && kod <= 126) return kod;
    if (kod >= 160 && kod <= 255) return kod;

    const harita: Record<string, number> = {
      '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
      'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
      '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
      '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
      'Ğ': 0xd0, 'İ': 0xdd, 'Ş': 0xde, 'ğ': 0xf0, 'ı': 0xfd, 'ş': 0xfe
    };
    return harita[karakter] ?? null;
  }

  belgeCiktiRtfKacis(metin: string) {
    let sonuc = '';
    for (const karakter of Array.from(metin || '')) {
      if (karakter === '\r') continue;
      if (karakter === '\n') {
        sonuc += '\\line ';
        continue;
      }
      if (karakter === '\t') {
        sonuc += '\\tab ';
        continue;
      }
      if (karakter === '\\' || karakter === '{' || karakter === '}') {
        sonuc += `\\${karakter}`;
        continue;
      }

      const byte = this.belgeCiktiRtfCp1254Byte(karakter);
      if (byte !== null) {
        sonuc += byte <= 126 ? karakter : `\\'${byte.toString(16).padStart(2, '0')}`;
      } else {
        sonuc += '?';
      }
    }
    return sonuc;
  }

  belgeCiktiRtfOlustur() {
    const satirlar = [
      '{\\rtf1\\ansi\\ansicpg1254\\deff0\\deflang1055\\uc0',
      '{\\fonttbl{\\f0\\froman\\fcharset162 Times New Roman;}}',
      '\\paperw11906\\paperh16838\\margl1417\\margr1417\\margt1417\\margb1417',
      '\\viewkind4\\f0\\fs24\\lang1055'
    ];
    this.belgeCiktiParagraflariOlustur().forEach(paragraf => {
      const hizalama = paragraf.hizalama === 'center' ? '\\qc' : paragraf.hizalama === 'right' ? '\\qr' : paragraf.hizalama === 'both' ? '\\qj' : '\\ql';
      const kalinBasla = paragraf.kalin ? '\\b ' : '';
      const kalinBitir = paragraf.kalin ? '\\b0 ' : '';
      const metin = this.belgeCiktiRtfKacis(paragraf.metin || '');
      satirlar.push(`\\pard${hizalama}\\sl276\\slmult1\\sa${paragraf.boslukSonrasi ?? 140} ${kalinBasla}${metin}${kalinBitir}\\par`);
    });
    satirlar.push('}');
    return satirlar.join('\n');
  }

  belgeCiktiRtfIndir() {
    const blob = new Blob([this.belgeCiktiRtfOlustur()], { type: 'application/rtf' });
    this.belgeCiktiBlobIndir(blob, this.belgeCiktiDosyaAdi('rtf'));
    this.bildirimGoster('success', 'RTF dosyası hazır', 'Bu RTF dosyasını UYAP Editör’de açıp UDF olarak kaydedebilirsiniz.');
  }

  belgeCiktiXmlKacis(metin: string) {
    return (metin || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  belgeCiktiDocxParagrafXml(paragraf: BelgeParagrafi) {
    const hizalama = paragraf.hizalama === 'center' ? 'center' : paragraf.hizalama === 'right' ? 'right' : paragraf.hizalama === 'both' ? 'both' : 'left';
    const metin = this.belgeCiktiXmlKacis(paragraf.metin || '');
    const kalin = paragraf.kalin ? '<w:b/>' : '';
    return `<w:p><w:pPr><w:jc w:val="${hizalama}"/><w:spacing w:line="276" w:lineRule="auto" w:after="${paragraf.boslukSonrasi ?? 140}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>${kalin}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${metin}</w:t></w:r></w:p>`;
  }

  belgeCiktiDocxDocumentXml() {
    const paragraflar = this.belgeCiktiParagraflariOlustur().map(paragraf => this.belgeCiktiDocxParagrafXml(paragraf)).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${paragraflar}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }

  belgeCiktiDocxBlobOlustur() {
    const dosyalar = [
      {
        ad: '[Content_Types].xml',
        icerik: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'
      },
      {
        ad: '_rels/.rels',
        icerik: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      },
      {
        ad: 'word/styles.xml',
        icerik: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>'
      },
      {
        ad: 'word/settings.xml',
        icerik: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/></w:settings>'
      },
      { ad: 'word/document.xml', icerik: this.belgeCiktiDocxDocumentXml() }
    ];
    return new Blob([this.belgeCiktiZipOlustur(dosyalar)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  belgeCiktiDocxIndir(googleDocsIcin = false) {
    const blob = this.belgeCiktiDocxBlobOlustur();
    this.belgeCiktiBlobIndir(blob, this.belgeCiktiDosyaAdi('docx'));
    this.bildirimGoster(
      'success',
      googleDocsIcin ? 'Google Docs uyumlu DOCX hazır' : 'DOCX dosyası hazır',
      googleDocsIcin ? 'Dosyayı Google Drive’a yükleyip Google Dokümanlar ile açabilirsiniz.' : 'Belge DOCX formatında indirildi.'
    );
  }

  belgeCiktiBlobIndir(blob: Blob, dosyaAdi: string) {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dosyaAdi;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  belgeCiktiZipOlustur(dosyalar: { ad: string; icerik: string | Uint8Array }[]) {
    const encoder = new TextEncoder();
    const parcalar: Uint8Array[] = [];
    const merkezParcalar: Uint8Array[] = [];
    let offset = 0;
    const simdi = new Date();
    const dosTime = ((simdi.getHours() & 0x1f) << 11) | ((simdi.getMinutes() & 0x3f) << 5) | ((Math.floor(simdi.getSeconds() / 2)) & 0x1f);
    const dosDate = (((simdi.getFullYear() - 1980) & 0x7f) << 9) | (((simdi.getMonth() + 1) & 0x0f) << 5) | (simdi.getDate() & 0x1f);

    dosyalar.forEach(dosya => {
      const adBytes = encoder.encode(dosya.ad);
      const icerikBytes = typeof dosya.icerik === 'string' ? encoder.encode(dosya.icerik) : dosya.icerik;
      const crc = this.belgeCiktiCrc32(icerikBytes);
      const localHeader = this.belgeCiktiZipHeader([
        [0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2], [dosTime, 2], [dosDate, 2],
        [crc, 4], [icerikBytes.length, 4], [icerikBytes.length, 4], [adBytes.length, 2], [0, 2]
      ]);
      parcalar.push(localHeader, adBytes, icerikBytes);

      const centralHeader = this.belgeCiktiZipHeader([
        [0x02014b50, 4], [20, 2], [20, 2], [0x0800, 2], [0, 2], [dosTime, 2], [dosDate, 2],
        [crc, 4], [icerikBytes.length, 4], [icerikBytes.length, 4], [adBytes.length, 2], [0, 2],
        [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]
      ]);
      merkezParcalar.push(centralHeader, adBytes);
      offset += localHeader.length + adBytes.length + icerikBytes.length;
    });

    const merkezOffset = offset;
    const merkezBoyut = merkezParcalar.reduce((toplam, parca) => toplam + parca.length, 0);
    const bitis = this.belgeCiktiZipHeader([
      [0x06054b50, 4], [0, 2], [0, 2], [dosyalar.length, 2], [dosyalar.length, 2],
      [merkezBoyut, 4], [merkezOffset, 4], [0, 2]
    ]);
    return this.belgeCiktiUint8Birlestir([...parcalar, ...merkezParcalar, bitis]);
  }

  belgeCiktiZipHeader(alanlar: [number, number][]) {
    const uzunluk = alanlar.reduce((toplam, [, byte]) => toplam + byte, 0);
    const sonuc = new Uint8Array(uzunluk);
    let offset = 0;
    alanlar.forEach(([deger, byte]) => {
      for (let i = 0; i < byte; i++) sonuc[offset++] = (deger >>> (8 * i)) & 0xff;
    });
    return sonuc;
  }

  belgeCiktiUint8Birlestir(parcalar: Uint8Array[]) {
    const toplam = parcalar.reduce((boyut, parca) => boyut + parca.length, 0);
    const sonuc = new Uint8Array(toplam);
    let offset = 0;
    parcalar.forEach(parca => {
      sonuc.set(parca, offset);
      offset += parca.length;
    });
    return sonuc;
  }

  belgeCiktiCrc32(bytes: Uint8Array) {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ this.belgeCiktiCrcTablosu[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  private belgeCiktiCrcTablosu = (() => {
    const tablo: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      tablo[n] = c >>> 0;
    }
    return tablo;
  })();



  veriKopyala<T>(veri: T): T {
    return JSON.parse(JSON.stringify(veri));
  }

  aktifDetayKaydetFonksiyonu(sayfa: SayfaTipi = this.aktifSayfa): (dosya: any, basariMesaji?: string) => Promise<boolean> {
    if (sayfa === 'icraDetay') return (dosya: IcraDosyasi, basariMesaji?: string) => this.icraKaydetCloud(dosya, basariMesaji);
    if (sayfa === 'arabuluculukDetay') return (dosya: ArabuluculukDosyasi, basariMesaji?: string) => this.arabuluculukKaydetCloud(dosya, basariMesaji);
    return (dosya: DavaDosyasi, basariMesaji?: string) => this.davaKaydetCloud(dosya, basariMesaji);
  }

  kaynakKaydetFonksiyonu(kaynak: AjandaKaynak): (dosya: any, basariMesaji?: string) => Promise<boolean> {
    if (kaynak === 'icra') return (dosya: IcraDosyasi, basariMesaji?: string) => this.icraKaydetCloud(dosya, basariMesaji);
    if (kaynak === 'arabuluculuk') return (dosya: ArabuluculukDosyasi, basariMesaji?: string) => this.arabuluculukKaydetCloud(dosya, basariMesaji);
    return (dosya: DavaDosyasi, basariMesaji?: string) => this.davaKaydetCloud(dosya, basariMesaji);
  }

  geriAlMesajiHazirla(mesaj: string) {
    return `${mesaj} Yanlışlıkla olduysa ${this.geriAlmaSuresiSaniye} saniye içinde geri alabilirsiniz.`;
  }

  geriAlinabilirBasariBildirimiGoster(
    baslik: string,
    mesaj: string,
    geriAlIslemi: () => Promise<boolean | void> | boolean | void,
    geriAlBaslik = 'İşlem geri alındı',
    geriAlMesaj = 'Son işlem önceki haline döndürüldü.'
  ) {
    this.bildirimGoster('success', baslik, this.geriAlMesajiHazirla(mesaj), {
      sureMs: this.geriAlmaSuresiSaniye * 1000,
      geriAl: {
        islem: geriAlIslemi,
        sureSaniye: this.geriAlmaSuresiSaniye,
        etiket: 'Geri Al',
        basariBaslik: geriAlBaslik,
        basariMesaj: geriAlMesaj
      }
    });
  }

  varsayilanDurumFiltresi(s: SayfaTipi) {
    if (s === 'davalar') return 'Derdest';
    return 'Tümü';
  }
  aktifGezinmeDurumunuOlustur(): UygulamaGezinmeDurumu {
    return {
      sayfa: this.aktifSayfa,
      seciliDavaId: this.seciliDava?.id || null,
      seciliIcraId: this.seciliIcra?.id || null,
      seciliArabuluculukId: this.seciliArabuluculuk?.id || null,
      aktifDetaySekmesi: this.aktifDetaySekmesi,
      aktifDavaTarafDetayi: this.aktifDavaTarafDetayi ? { ...this.aktifDavaTarafDetayi } : null,
      aramaMetni: this.aramaMetni,
      durumFiltresi: this.durumFiltresi,
      arabuluculukSonucFiltresi: this.arabuluculukSonucFiltresi,
      muhasebeArama: this.muhasebeArama,
      muhasebeFiltre: this.muhasebeFiltre,
      aktifIliskiSekmesi: this.aktifIliskiSekmesi,
      iliskiGorunumModu: this.iliskiGorunumModu,
      iliskiArama: this.iliskiArama,
      iliskiFiltre: this.iliskiFiltre,
      iliskiSiralama: this.iliskiSiralama,
      ajandaArama: this.ajandaArama,
      ajandaZamanFiltresi: this.ajandaZamanFiltresi,
      ajandaTurFiltresi: this.ajandaTurFiltresi,
      aktifSablonSekmesi: this.aktifSablonSekmesi
    };
  }
  gezinmeDurumlariAyniMi(a: UygulamaGezinmeDurumu, b: UygulamaGezinmeDurumu) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  gezinmeGecmisineEkle() {
    const mevcut = this.aktifGezinmeDurumunuOlustur();
    const son = this.navigasyonGecmisi[this.navigasyonGecmisi.length - 1];
    if (!son || !this.gezinmeDurumlariAyniMi(son, mevcut)) {
      this.navigasyonGecmisi.push(mevcut);
    }
  }
  detayGecisiIcinArayuzuHazirla(finansTuru: FinansalIslem['tur']) {
    this.topluDosyaSecenekleriAcik = false;
    this.arabuluculukBelgeSecenekMenusu = null;
    this.finansalIslemFormunuSifirla(finansTuru);
    this.finansalIslemDuzenlemeIptal();
    this.evrakDuzenleIptal();
    this.ekEvrakFormKapat();
    this.yeniMuvekkilGorusmeNotu = { tarih: new Date().toISOString().split('T')[0], saat: '', yontem: 'Telefon', notlar: '' };
    this.acikMuvekkilGorusmeNotlari = {};
    this.duzenlenenMuvekkilGorusmeNotuId = null;
    this.duzenlenenMuvekkilGorusmeNotu = {};
    this.silinecekMuvekkilGorusmeNotuId = null;
  }
  gezinmeDurumunuUygula(durum: UygulamaGezinmeDurumu) {
    const seciliDava = durum.seciliDavaId ? this.davalar.find(dava => dava.id === durum.seciliDavaId) || null : null;
    const seciliIcra = durum.seciliIcraId ? this.icralar.find(icra => icra.id === durum.seciliIcraId) || null : null;
    const seciliArabuluculuk = durum.seciliArabuluculukId ? this.arabuluculukDosyalar.find(arabuluculuk => arabuluculuk.id === durum.seciliArabuluculukId) || null : null;
    let hedefSayfa = durum.sayfa;

    if (hedefSayfa === 'detay' && !seciliDava) hedefSayfa = 'davalar';
    if (hedefSayfa === 'icraDetay' && !seciliIcra) hedefSayfa = 'icralar';
    if (hedefSayfa === 'arabuluculukDetay' && !seciliArabuluculuk) hedefSayfa = 'arabuluculuk';

    this.topluDosyaSecenekleriAcik = false;
    this.arabuluculukBelgeSecenekMenusu = null;
    this.aktifSayfa = hedefSayfa;
    this.seciliDava = hedefSayfa === 'detay' ? seciliDava : null;
    this.seciliIcra = hedefSayfa === 'icraDetay' ? seciliIcra : null;
    this.seciliArabuluculuk = hedefSayfa === 'arabuluculukDetay' ? seciliArabuluculuk : null;
    this.aktifDetaySekmesi = durum.aktifDetaySekmesi;
    this.aktifDavaTarafDetayi = hedefSayfa === 'detay' ? (durum.aktifDavaTarafDetayi ? { ...durum.aktifDavaTarafDetayi } : null) : null;
    this.aramaMetni = durum.aramaMetni;
    this.durumFiltresi = durum.durumFiltresi;
    this.arabuluculukSonucFiltresi = durum.arabuluculukSonucFiltresi || 'Tümü';
    this.muhasebeArama = durum.muhasebeArama;
    this.muhasebeFiltre = durum.muhasebeFiltre;
    this.aktifIliskiSekmesi = durum.aktifIliskiSekmesi;
    this.iliskiGorunumModu = durum.iliskiGorunumModu;
    this.iliskiArama = durum.iliskiArama;
    this.iliskiFiltre = durum.iliskiFiltre;
    this.iliskiSiralama = durum.iliskiSiralama;
    this.ajandaArama = durum.ajandaArama;
    this.ajandaZamanFiltresi = durum.ajandaZamanFiltresi;
    this.ajandaTurFiltresi = durum.ajandaTurFiltresi;
    this.aktifSablonSekmesi = durum.aktifSablonSekmesi;

    if (hedefSayfa === 'detay') this.detayGecisiIcinArayuzuHazirla('Vekalet Ücreti');
    if (hedefSayfa === 'icraDetay') this.detayGecisiIcinArayuzuHazirla('Vekalet Ücreti');
    if (hedefSayfa === 'arabuluculukDetay') this.detayGecisiIcinArayuzuHazirla('Ödeme');
  }
  geriGidilebilirMi() {
    return this.navigasyonGecmisi.length > 0;
  }
  geriGit() {
    const onceki = this.navigasyonGecmisi.pop();
    if (onceki) {
      this.gezinmeDurumunuUygula(onceki);
      return;
    }

    const hedefSayfa: SayfaTipi = this.aktifSayfa === 'detay'
      ? 'davalar'
      : this.aktifSayfa === 'icraDetay'
        ? 'icralar'
        : this.aktifSayfa === 'arabuluculukDetay'
          ? 'arabuluculuk'
          : 'dashboard';

    if (hedefSayfa !== this.aktifSayfa) {
      this.sayfaDegistir(hedefSayfa, false);
    }
  }
  sayfaDegistir(s: SayfaTipi, gecmiseKaydet = true) {
    if (gecmiseKaydet && this.aktifSayfa !== s) {
      this.gezinmeGecmisineEkle();
    }

    this.aktifSayfa = s;
    this.topluDosyaSecenekleriAcik = false;
    this.arabuluculukBelgeSecenekMenusu = null;
    if (s !== 'detay') this.seciliDava = null;
    if (s !== 'icraDetay') this.seciliIcra = null;
    if (s !== 'arabuluculukDetay') this.seciliArabuluculuk = null;
    if (s !== 'detay') this.aktifDavaTarafDetayi = null;
    this.aramaMetni = '';
    if (s === 'davalar' || s === 'icralar' || s === 'arabuluculuk') {
      this.durumFiltresi = this.varsayilanDurumFiltresi(s);
    }
    if (s === 'arabuluculuk') this.arabuluculukSonucFiltresi = 'Tümü';
  }

  detayaGit(d: DavaDosyasi) { this.gezinmeGecmisineEkle(); this.seciliDava = d; this.aktifSayfa = 'detay'; this.aktifDetaySekmesi = 'notlar'; this.aktifDavaTarafDetayi = null; this.detayGecisiIcinArayuzuHazirla('Vekalet Ücreti'); }
  icraDetayinaGit(i: IcraDosyasi) { this.gezinmeGecmisineEkle(); this.seciliIcra = i; this.aktifSayfa = 'icraDetay'; this.aktifDetaySekmesi = 'notlar'; this.detayGecisiIcinArayuzuHazirla('Vekalet Ücreti'); }
  arabuluculukDetayinaGit(a: ArabuluculukDosyasi) { this.gezinmeGecmisineEkle(); this.seciliArabuluculuk = a; this.aktifSayfa = 'arabuluculukDetay'; this.aktifDetaySekmesi = 'notlar'; this.detayGecisiIcinArayuzuHazirla('Ödeme'); }

  davayaGitId(id?: number) { if(!id) return; const d = this.davalar.find(x=>x.id===id); if(d) this.detayaGit(d); }
  icrayaGitId(id?: number) { if(!id) return; const i = this.icralar.find(x=>x.id===id); if(i) this.icraDetayinaGit(i); }
  arabuluculugaGitId(id?: number) { if(!id) return; const a = this.arabuluculukDosyalar.find(x=>x.id===id); if(a) this.arabuluculukDetayinaGit(a); }
  getDavaNo(id?: number) { if(!id) return ''; return this.davalar.find(d=>d.id===id)?.dosyaNo || 'Bulunamadı'; }
  getIcraNo(id?: number) { if(!id) return ''; return this.icralar.find(i=>i.id===id)?.dosyaNo || 'Bulunamadı'; }
  getIcraBaglantiEtiketi(id?: number) {
    if (!id) return 'Bulunamadı';
    const icra = this.icralar.find(i => i.id === id);
    return icra ? `${icra.icraDairesi} / ${icra.dosyaNo}` : 'Bulunamadı';
  }
  getArabuluculukNo(id?: number) {
    if (!id) return '';
    const arabuluculuk = this.arabuluculukDosyalar.find(a => a.id === id);
    return arabuluculuk ? `${arabuluculuk.buroNo ? arabuluculuk.buroNo + ' / ' : ''}${arabuluculuk.arabuluculukNo}` : 'Bulunamadı';
  }
  hazirSayisalBaglantiListesi(liste?: Array<number | null | undefined>, legacyId?: number) {
    return [...new Set([...(liste || []), legacyId].map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0))];
  }
  hazirMetinBaglantiListesi(liste?: string[]) {
    return [...new Set((liste || []).map(item => this.formatMetin(item)).filter(Boolean))];
  }
  getDavaBaglantiliIcraIdleri(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    return this.hazirSayisalBaglantiListesi(dava?.baglantiliIcraIds, dava?.baglantiliIcraId);
  }
  getDavaBaglantiliArabuluculukIdleri(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    return this.hazirSayisalBaglantiListesi(dava?.baglantiliArabuluculukIds);
  }
  getDavaBaglantiMetinListesi(liste?: string[]) {
    return this.hazirMetinBaglantiListesi(liste);
  }
  getBaglantiliIcraDosyalari(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    return this.getDavaBaglantiliIcraIdleri(dava)
      .map(id => this.icralar.find(icra => icra.id === id))
      .filter((icra): icra is IcraDosyasi => !!icra);
  }
  getBaglantiliArabuluculukDosyalari(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    return this.getDavaBaglantiliArabuluculukIdleri(dava)
      .map(id => this.arabuluculukDosyalar.find(arabuluculuk => arabuluculuk.id === id))
      .filter((arabuluculuk): arabuluculuk is ArabuluculukDosyasi => !!arabuluculuk);
  }
  get secilebilirBaglantiliIcraDosyalari() {
    const secili = new Set(this.getDavaBaglantiliIcraIdleri(this.islemGorenDava));
    const arama = (this.baglantiliIcraArama || '').toLocaleLowerCase('tr-TR').trim();
    return this.icralar.filter(icra => {
      if (secili.has(icra.id)) return false;
      if (!arama) return true;
      return [
        icra.icraDairesi,
        icra.dosyaNo,
        icra.alacakli,
        icra.borclu,
        icra.muvekkil
      ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(arama);
    });
  }
  get secilebilirBaglantiliArabuluculukDosyalari() {
    const secili = new Set(this.getDavaBaglantiliArabuluculukIdleri(this.islemGorenDava));
    const arama = (this.baglantiliArabuluculukArama || '').toLocaleLowerCase('tr-TR').trim();
    return this.arabuluculukDosyalar.filter(arabuluculuk => {
      if (secili.has(arabuluculuk.id)) return false;
      if (!arama) return true;
      return [
        arabuluculuk.buroNo,
        arabuluculuk.arabuluculukNo,
        arabuluculuk.buro,
        arabuluculuk.uyusmazlikTuru,
        this.getArabuluculukTarafAramaMetni(arabuluculuk.taraflar)
      ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(arama);
    });
  }
  baglantiliIcraEkle() {
    if (!this.seciliBaglantiliIcraId) return;
    this.islemGorenDava.baglantiliIcraIds = [...this.getDavaBaglantiliIcraIdleri(this.islemGorenDava), this.seciliBaglantiliIcraId];
    this.seciliBaglantiliIcraId = undefined;
  }
  baglantiliIcraSil(id: number) {
    this.islemGorenDava.baglantiliIcraIds = this.getDavaBaglantiliIcraIdleri(this.islemGorenDava).filter(item => item !== id);
    if (this.islemGorenDava.baglantiliIcraId === id) this.islemGorenDava.baglantiliIcraId = undefined;
  }
  baglantiliArabuluculukEkle() {
    if (!this.seciliBaglantiliArabuluculukId) return;
    this.islemGorenDava.baglantiliArabuluculukIds = [...this.getDavaBaglantiliArabuluculukIdleri(this.islemGorenDava), this.seciliBaglantiliArabuluculukId];
    this.seciliBaglantiliArabuluculukId = undefined;
  }
  baglantiliArabuluculukSil(id: number) {
    this.islemGorenDava.baglantiliArabuluculukIds = this.getDavaBaglantiliArabuluculukIdleri(this.islemGorenDava).filter(item => item !== id);
  }
  baglantiliMetinDosyaEkle(tur: 'tedbir' | 'delil' | 'noterlik') {
    const alan = tur === 'tedbir'
      ? 'baglantiliTedbirDosyalari'
      : tur === 'delil'
      ? 'baglantiliDelilTespitiDosyalari'
      : 'baglantiliNoterlikDosyalari';
    const metin = this.formatMetin(
      tur === 'tedbir'
        ? this.yeniBaglantiliTedbirDosyasi
        : tur === 'delil'
        ? this.yeniBaglantiliDelilTespitiDosyasi
        : this.yeniBaglantiliNoterlikDosyasi
    );
    if (!metin) return;
    const mevcutListe = this.getDavaBaglantiMetinListesi(this.islemGorenDava[alan] as string[]);
    if (!mevcutListe.some(item => this.metinEsit(item, metin))) this.islemGorenDava[alan] = [...mevcutListe, metin] as any;
    if (tur === 'tedbir') this.yeniBaglantiliTedbirDosyasi = '';
    else if (tur === 'delil') this.yeniBaglantiliDelilTespitiDosyasi = '';
    else this.yeniBaglantiliNoterlikDosyasi = '';
  }
  baglantiliMetinDosyaSil(alan: 'baglantiliTedbirDosyalari' | 'baglantiliDelilTespitiDosyalari' | 'baglantiliNoterlikDosyalari', index: number) {
    const liste = this.getDavaBaglantiMetinListesi(this.islemGorenDava[alan] as string[]);
    liste.splice(index, 1);
    this.islemGorenDava[alan] = liste as any;
  }
  getDavaBaglantiOzeti(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    const parcalar: string[] = [];
    const icraSayisi = this.getDavaBaglantiliIcraIdleri(dava).length;
    const arabuluculukSayisi = this.getDavaBaglantiliArabuluculukIdleri(dava).length;
    const tedbirSayisi = this.getDavaBaglantiMetinListesi(dava?.baglantiliTedbirDosyalari).length;
    const delilSayisi = this.getDavaBaglantiMetinListesi(dava?.baglantiliDelilTespitiDosyalari).length;
    const noterlikSayisi = this.getDavaBaglantiMetinListesi(dava?.baglantiliNoterlikDosyalari).length;
    if (icraSayisi) parcalar.push(`${icraSayisi} icra`);
    if (arabuluculukSayisi) parcalar.push(`${arabuluculukSayisi} arabuluculuk`);
    if (tedbirSayisi) parcalar.push(`${tedbirSayisi} tedbir`);
    if (delilSayisi) parcalar.push(`${delilSayisi} delil tespiti`);
    if (noterlikSayisi) parcalar.push(`${noterlikSayisi} noterlik`);
    return parcalar.join(' * ');
  }
  getDavaBaglantiKayitOzeti(dava?: Partial<DavaDosyasi> | DavaDosyasi | null) {
    return [
      `icra:${this.getDavaBaglantiliIcraIdleri(dava).join(',')}`,
      `arabuluculuk:${this.getDavaBaglantiliArabuluculukIdleri(dava).join(',')}`,
      `tedbir:${this.getDavaBaglantiMetinListesi(dava?.baglantiliTedbirDosyalari).join(',')}`,
      `delil:${this.getDavaBaglantiMetinListesi(dava?.baglantiliDelilTespitiDosyalari).join(',')}`,
      `noterlik:${this.getDavaBaglantiMetinListesi(dava?.baglantiliNoterlikDosyalari).join(',')}`
    ].join('|');
  }

  yeniGecmisKaydiId() { return Date.now() + this.gecmisKaydiSayaci++; }
  kopyaliVeri<T>(veri: T): T { return JSON.parse(JSON.stringify(veri)); }
  yeniDosyaIslemKaydi(kategori: DosyaIslemKategori, baslik: string, aciklama = '', tarih = new Date().toISOString()): DosyaIslemKaydi {
    return { id: this.yeniGecmisKaydiId(), tarih, kategori, baslik, aciklama, kullanici: this.user?.email || 'Yerel kullanıcı' };
  }
  dosyayaIslemKaydiEkle<T extends DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi>(dosya: T, kategori: DosyaIslemKategori, baslik: string, aciklama = '', tarih = new Date().toISOString()): T {
    const kayitli = this.kopyaliVeri(dosya);
    kayitli.islemGecmisi = [this.yeniDosyaIslemKaydi(kategori, baslik, aciklama, tarih), ...(kayitli.islemGecmisi || [])].slice(0, 120);
    return kayitli;
  }
  dosyayaTakvimKaydiEkle<T extends DavaDosyasi | ArabuluculukDosyasi>(dosya: T, tur: 'Duruşma' | 'Toplantı', durum: TakvimGecmisiDurumu, planlananTarih?: string, planlananSaat?: string, aciklama = '', gerceklesmeTarihi?: string): T {
    const kayitli = this.kopyaliVeri(dosya);
    const yeniKayit: TakvimGecmisKaydi = {
      id: this.yeniGecmisKaydiId(),
      tur,
      durum,
      kayitTarihi: new Date().toISOString(),
      planlananTarih,
      planlananSaat,
      gerceklesmeTarihi,
      aciklama
    };
    kayitli.takvimGecmisi = [yeniKayit, ...(kayitli.takvimGecmisi || [])].slice(0, 80);
    return kayitli;
  }
  ayniDegerMi(onceki: any, sonraki: any) { return (onceki ?? '') === (sonraki ?? ''); }
  degisenAlanMetni(alanlar: Array<{ etiket: string; onceki: any; sonraki: any }>) {
    const degisenler = alanlar.filter(alan => !this.ayniDegerMi(alan.onceki, alan.sonraki)).map(alan => alan.etiket);
    if (degisenler.length === 0) return 'Dosya kartındaki bilgiler gözden geçirilip kaydedildi.';
    if (degisenler.length === 1) return `${degisenler[0]} alanı güncellendi.`;
    if (degisenler.length === 2) return `${degisenler[0]} ve ${degisenler[1]} alanları güncellendi.`;
    return `${degisenler.slice(0, 3).join(', ')} başlıkları güncellendi.`;
  }
  davaGuncellemeOzeti(onceki: DavaDosyasi | undefined, sonraki: DavaDosyasi) {
    return this.degisenAlanMetni([
      { etiket: 'Dosya numarası', onceki: onceki?.dosyaNo, sonraki: sonraki.dosyaNo },
      { etiket: 'Müvekkil', onceki: onceki?.muvekkil, sonraki: sonraki.muvekkil },
      { etiket: 'Taraflar', onceki: this.getDavaTarafDetayKayitOzeti(onceki), sonraki: this.getDavaTarafDetayKayitOzeti(sonraki) },
      { etiket: 'Mahkeme', onceki: onceki?.mahkeme, sonraki: sonraki.mahkeme },
      { etiket: 'Eski mahkeme', onceki: onceki?.eskiMahkeme, sonraki: sonraki.eskiMahkeme },
      { etiket: 'Eski esas', onceki: onceki?.eskiEsasNo, sonraki: sonraki.eskiEsasNo },
      { etiket: 'Konu', onceki: onceki?.konu, sonraki: sonraki.konu },
      { etiket: 'Duruşma', onceki: this.birlestirTarihVeSaat(onceki?.durusmaTarihi, onceki?.durusmaSaati), sonraki: this.birlestirTarihVeSaat(sonraki.durusmaTarihi, sonraki.durusmaSaati) },
      { etiket: 'Bağlantılar', onceki: this.getDavaBaglantiKayitOzeti(onceki), sonraki: this.getDavaBaglantiKayitOzeti(sonraki) },
      { etiket: 'Arşiv yeri', onceki: onceki?.arsivYeri, sonraki: sonraki.arsivYeri },
      { etiket: 'Vekalet ücreti', onceki: onceki?.vekaletUcreti, sonraki: sonraki.vekaletUcreti }
    ]);
  }
  icraGuncellemeOzeti(onceki: IcraDosyasi | undefined, sonraki: IcraDosyasi) {
    return this.degisenAlanMetni([
      { etiket: 'İcra dairesi', onceki: onceki?.icraDairesi, sonraki: sonraki.icraDairesi },
      { etiket: 'Dosya numarası', onceki: onceki?.dosyaNo, sonraki: sonraki.dosyaNo },
      { etiket: 'Eski mahkeme', onceki: onceki?.eskiMahkeme, sonraki: sonraki.eskiMahkeme },
      { etiket: 'Eski esas', onceki: onceki?.eskiEsasNo, sonraki: sonraki.eskiEsasNo },
      { etiket: 'Muhatap', onceki: onceki?.muvekkil, sonraki: sonraki.muvekkil },
      { etiket: 'Alacaklı', onceki: onceki?.alacakli, sonraki: sonraki.alacakli },
      { etiket: 'Borçlu', onceki: onceki?.borclu, sonraki: sonraki.borclu },
      { etiket: 'Takip tipi', onceki: onceki?.takipTipi, sonraki: sonraki.takipTipi },
      { etiket: 'Takip tarihi', onceki: onceki?.takipTarihi, sonraki: sonraki.takipTarihi },
      { etiket: 'Arşiv yeri', onceki: onceki?.arsivYeri, sonraki: sonraki.arsivYeri }
    ]);
  }
  arabuluculukGuncellemeOzeti(onceki: ArabuluculukDosyasi | undefined, sonraki: ArabuluculukDosyasi) {
    return this.degisenAlanMetni([
      { etiket: 'Büro no', onceki: onceki?.buroNo, sonraki: sonraki.buroNo },
      { etiket: 'Arabuluculuk no', onceki: onceki?.arabuluculukNo, sonraki: sonraki.arabuluculukNo },
      { etiket: 'Büro', onceki: onceki?.buro, sonraki: sonraki.buro },
      { etiket: 'Büroya başvuru tarihi', onceki: onceki?.buroyaBasvuruTarihi, sonraki: sonraki.buroyaBasvuruTarihi },
      { etiket: 'Görevlendirme tarihi', onceki: onceki?.arabulucuGorevlendirmeTarihi, sonraki: sonraki.arabulucuGorevlendirmeTarihi },
      { etiket: 'Tutanak tarihi', onceki: onceki?.tutanakDuzenlemeTarihi, sonraki: sonraki.tutanakDuzenlemeTarihi },
      { etiket: 'Uyuşmazlık türü', onceki: onceki?.uyusmazlikTuru, sonraki: sonraki.uyusmazlikTuru },
      { etiket: 'Başvuru konusu', onceki: onceki?.basvuruKonusu, sonraki: sonraki.basvuruKonusu },
      { etiket: 'Sonuç', onceki: this.getArabuluculukSonucu(onceki) || 'Girilmedi', sonraki: this.getArabuluculukSonucu(sonraki) || 'Girilmedi' },
      { etiket: 'Anlaşma şartları', onceki: onceki?.anlasmaSartlari, sonraki: sonraki.anlasmaSartlari },
      { etiket: 'İşe giriş tarihi', onceki: onceki?.iseGirisTarihi, sonraki: sonraki.iseGirisTarihi },
      { etiket: 'İşten çıkış tarihi', onceki: onceki?.istenCikisTarihi, sonraki: sonraki.istenCikisTarihi },
      { etiket: 'Ödeme tarihi', onceki: onceki?.odemeTarihi, sonraki: sonraki.odemeTarihi },
      { etiket: 'Ödenecek toplam tutar (rakamla)', onceki: onceki?.odenecekToplamTutarRakamla, sonraki: sonraki.odenecekToplamTutarRakamla },
      { etiket: 'Ödenecek toplam tutar (yazıyla)', onceki: onceki?.odenecekToplamTutarYaziyla, sonraki: sonraki.odenecekToplamTutarYaziyla },
      { etiket: 'Arabulucu ücreti tutarı', onceki: onceki?.arabulucuUcretiTutari, sonraki: sonraki.arabulucuUcretiTutari },
      { etiket: 'Arabulucu ücreti ödeme tarihi', onceki: onceki?.arabulucuUcretiOdemeTarihi, sonraki: sonraki.arabulucuUcretiOdemeTarihi },
      { etiket: 'Kıdem tazminatı tutarı', onceki: onceki?.kidemTazminatiTutari, sonraki: sonraki.kidemTazminatiTutari },
      { etiket: 'Kıdem tazminatı ödeme tarihi', onceki: onceki?.kidemTazminatiOdemeTarihi, sonraki: sonraki.kidemTazminatiOdemeTarihi },
      { etiket: 'İhbar tazminatı tutarı', onceki: onceki?.ihbarTazminatiTutari, sonraki: sonraki.ihbarTazminatiTutari },
      { etiket: 'İhbar tazminatı ödeme tarihi', onceki: onceki?.ihbarTazminatiOdemeTarihi, sonraki: sonraki.ihbarTazminatiOdemeTarihi },
      { etiket: 'Yıllık ücretli izin tutarı', onceki: onceki?.yillikUcretliIzinTutari, sonraki: sonraki.yillikUcretliIzinTutari },
      { etiket: 'Yıllık ücretli izin ödeme tarihi', onceki: onceki?.yillikUcretliIzinOdemeTarihi, sonraki: sonraki.yillikUcretliIzinOdemeTarihi },
      { etiket: 'Bakiye ücret alacağı', onceki: onceki?.bakiyeUcretAlacagi, sonraki: sonraki.bakiyeUcretAlacagi },
      { etiket: 'Bakiye ücret alacağı ödeme tarihi', onceki: onceki?.bakiyeUcretAlacagiOdemeTarihi, sonraki: sonraki.bakiyeUcretAlacagiOdemeTarihi },
      { etiket: 'Prim alacağı', onceki: onceki?.primAlacagi, sonraki: sonraki.primAlacagi },
      { etiket: 'Prim alacağı ödeme tarihi', onceki: onceki?.primAlacagiOdemeTarihi, sonraki: sonraki.primAlacagiOdemeTarihi },
      { etiket: 'İşe başlatmama ve boşta geçen süre alacağı', onceki: onceki?.iseBaslatmamaVeBostaGecenSureAlacagi, sonraki: sonraki.iseBaslatmamaVeBostaGecenSureAlacagi },
      { etiket: 'İşe başlatmama ve boşta geçen süre ödeme tarihi', onceki: onceki?.iseBaslatmamaVeBostaGecenSureOdemeTarihi, sonraki: sonraki.iseBaslatmamaVeBostaGecenSureOdemeTarihi },
      { etiket: 'Ek ödeme', onceki: onceki?.ekOdeme, sonraki: sonraki.ekOdeme },
      { etiket: 'Ek ödeme tarihi', onceki: onceki?.ekOdemeOdemeTarihi, sonraki: sonraki.ekOdemeOdemeTarihi },
      { etiket: 'Taksitli ödeme', onceki: onceki?.taksitleOdeme ? 'Evet' : 'Hayır', sonraki: sonraki.taksitleOdeme ? 'Evet' : 'Hayır' },
      { etiket: 'Taksit sayısı', onceki: onceki?.taksitSayisi, sonraki: sonraki.taksitSayisi },
      { etiket: 'Taksit planı', onceki: this.getArabuluculukTaksitlerDetayListesi(onceki), sonraki: this.getArabuluculukTaksitlerDetayListesi(sonraki) },
      { etiket: 'Taraflar', onceki: this.getArabuluculukTarafKayitOzeti(onceki?.taraflar), sonraki: this.getArabuluculukTarafKayitOzeti(sonraki.taraflar) },
      { etiket: 'Toplantı', onceki: this.birlestirTarihVeSaat(onceki?.toplantiTarihi, onceki?.toplantiSaati), sonraki: this.birlestirTarihVeSaat(sonraki.toplantiTarihi, sonraki.toplantiSaati) },
      { etiket: 'Arşiv yeri', onceki: onceki?.arsivYeri, sonraki: sonraki.arsivYeri },
      { etiket: 'Hizmet ücreti', onceki: onceki?.vekaletUcreti, sonraki: sonraki.vekaletUcreti },
      { etiket: 'Stopaj tercihi', onceki: onceki?.hizmetUcretiStopajli ? 'Stopajlı' : 'Stopajsız', sonraki: sonraki.hizmetUcretiStopajli ? 'Stopajlı' : 'Stopajsız' }
    ]);
  }
  takvimDegisimMetni(oncekiTarih?: string, oncekiSaat?: string, sonrakiTarih?: string, sonrakiSaat?: string) {
    const onceki = oncekiTarih ? this.formatTarihSaat(oncekiTarih, oncekiSaat) : 'Plan yoktu';
    const sonraki = sonrakiTarih ? this.formatTarihSaat(sonrakiTarih, sonrakiSaat) : 'Plan kaldırıldı';
    return `${onceki} -> ${sonraki}`;
  }

  davaTarafMetniniParcala(metin?: string) {
    return (metin || '')
      .split(/\r?\n|;|,/)
      .map(parca => (this.formatMetin(parca) || '').trim())
      .filter(parca => parca !== '' && parca !== '-');
  }
  davaTarafListesiKopyala(liste?: DavaTarafKaydi[]) {
    return Array.isArray(liste) ? liste.map(taraf => this.adresKaydiNormalizeEt({ ...taraf })) : [];
  }
  davaTarafBosOlustur(id = Date.now()): DavaTarafKaydi {
    return { id, isim: '', tcKimlikVergiNo: '', vergiDairesi: '', telefon: '', eposta: '', adres: '', il: '', ilce: '', acikAdres: '' };
  }
  davaTarafMuvekkilKaydiBul(taraf?: Partial<DavaTarafKaydi> | null) {
    if (!taraf) return null;
    if (taraf.muvekkilId) {
      const idIleEslesen = this.muvekkiller.find(m => m.id == taraf.muvekkilId);
      if (idIleEslesen) return idIleEslesen;
    }
    const isim = (taraf.isim || '').trim();
    if (!isim) return null;
    return this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim)) || null;
  }
  davaTarafBilgileriniMuvekkildenDoldur(taraf: DavaTarafKaydi, muvekkil?: Muvekkil | null, sadeceBos = false) {
    if (!taraf || !muvekkil) return;
    taraf.muvekkilId = muvekkil.id;
    if (!sadeceBos || !(taraf.isim || '').trim()) taraf.isim = muvekkil.adSoyad;
    if (!sadeceBos || !(taraf.tcKimlikVergiNo || '').trim()) taraf.tcKimlikVergiNo = this.duzMetinTrimle(muvekkil.tcKimlik) || '';
    if (!sadeceBos || !(taraf.vergiDairesi || '').trim()) taraf.vergiDairesi = this.formatMetin(muvekkil.vergiDairesi) || '';
    if (!sadeceBos || !(taraf.telefon || '').trim()) taraf.telefon = this.duzMetinTrimle(muvekkil.telefon) || '';
    if (!sadeceBos || !(taraf.eposta || '').trim()) taraf.eposta = this.epostaDegeriniTemizle(muvekkil.eposta) || '';
    const adres = this.adresBilesenleriniHazirla(muvekkil);
    if (!sadeceBos || !(taraf.il || '').trim()) taraf.il = adres.il;
    if (!sadeceBos || !(taraf.ilce || '').trim()) taraf.ilce = adres.ilce;
    if (!sadeceBos || !(taraf.acikAdres || '').trim()) taraf.acikAdres = adres.acikAdres;
    if (!sadeceBos || !(taraf.adres || '').trim()) taraf.adres = adres.adres;
  }
  davaMuvekkilleriVarsayilanOlustur(dava?: Partial<DavaDosyasi> | null) {
    let muvekkiller = this.davaTarafListesiKopyala(dava?.muvekkiller);

    if (!muvekkiller.length) {
      const muvekkil = (dava?.muvekkil || '').trim();
      if (muvekkil) {
        muvekkiller.push({ id: Date.now(), isim: muvekkil, muvekkilId: dava?.muvekkilId });
      }
    }

    if (!muvekkiller.length) muvekkiller = [{ id: Date.now(), isim: '' }];
    return muvekkiller;
  }
  davaMuvekkilleriniHazirla(liste?: DavaTarafKaydi[]) {
    return (liste || [])
      .map(kayit => {
        const secilen = kayit.muvekkilId ? this.muvekkiller.find(m => m.id == kayit.muvekkilId) : undefined;
        const isim = (this.formatMetin(secilen?.adSoyad || kayit.isim) || '').trim();
        const adres = this.adresBilesenleriniHazirla({
          adres: kayit.adres || secilen?.adres,
          il: kayit.il || secilen?.il,
          ilce: kayit.ilce || secilen?.ilce,
          acikAdres: kayit.acikAdres || secilen?.acikAdres
        });
        return { ...kayit, ...adres, isim, muvekkilId: secilen?.id || kayit.muvekkilId };
      })
      .filter(kayit => kayit.isim !== '');
  }
  davaTaraflariVarsayilanOlustur(dava?: Partial<DavaDosyasi> | null) {
    let davacilar = this.davaTarafListesiKopyala(dava?.davacilar);
    let davalilar = this.davaTarafListesiKopyala(dava?.davalilar);

    if (!davacilar.length && !davalilar.length) {
      const muvekkiller = this.davaMuvekkilleriniHazirla(this.davaMuvekkilleriVarsayilanOlustur(dava));
      const karsiTaraflar = this.davaTarafMetniniParcala(dava?.karsiTaraf);
      muvekkiller.forEach((muvekkil, index) => {
        if (dava?.muvekkilPozisyonu === 'Davalı') davalilar.push({ id: Date.now() + index, isim: muvekkil.isim, muvekkilId: muvekkil.muvekkilId });
        else davacilar.push({ id: Date.now() + index, isim: muvekkil.isim, muvekkilId: muvekkil.muvekkilId });
      });
      karsiTaraflar.forEach((isim, index) => {
        const kayit = { id: Date.now() + muvekkiller.length + index + 1, isim };
        if (dava?.muvekkilPozisyonu === 'Davalı') davacilar.push(kayit);
        else davalilar.push(kayit);
      });
    }

    if (!davacilar.length) davacilar = [this.davaTarafBosOlustur(Date.now())];
    if (!davalilar.length) davalilar = [this.davaTarafBosOlustur(Date.now() + 1)];

    return { davacilar, davalilar };
  }
  davaTaraflariniHazirla(liste?: DavaTarafKaydi[]): DavaTarafKaydi[] {
    return (liste || [])
      .map((taraf, index): DavaTarafKaydi => {
        const secilen = this.davaTarafMuvekkilKaydiBul(taraf);
        const adres = this.adresBilesenleriniHazirla({
          adres: taraf.adres || secilen?.adres,
          il: taraf.il || secilen?.il,
          ilce: taraf.ilce || secilen?.ilce,
          acikAdres: taraf.acikAdres || secilen?.acikAdres
        });
        return {
          ...taraf,
          ...adres,
          id: typeof taraf.id === 'number' ? taraf.id : Date.now() + index,
          isim: (this.formatMetin(secilen?.adSoyad || taraf.isim) || '').trim(),
          muvekkilId: secilen?.id ?? taraf.muvekkilId,
          tcKimlikVergiNo: this.duzMetinTrimle(taraf.tcKimlikVergiNo || secilen?.tcKimlik) || '',
          vergiDairesi: this.formatMetin(taraf.vergiDairesi || secilen?.vergiDairesi) || '',
          telefon: this.duzMetinTrimle(taraf.telefon || secilen?.telefon) || '',
          eposta: this.epostaDegeriniTemizle(taraf.eposta || secilen?.eposta) || ''
        };
      })
      .filter(taraf => taraf.isim !== '');
  }
  getDavaTarafKayitOzeti(liste?: DavaTarafKaydi[]) {
    return (liste || [])
      .map(taraf => [taraf.isim, taraf.tcKimlikVergiNo, taraf.telefon, taraf.eposta, taraf.vergiDairesi, taraf.adres, taraf.il, taraf.ilce, taraf.acikAdres, taraf.muvekkilId].filter(Boolean).join(':'))
      .join('|');
  }
  getDavaTarafDetayKayitOzeti(dava?: Partial<DavaDosyasi> | null) {
    if (!dava) return '';
    const taraflar = this.getDavaTarafKayitlari(dava);
    return `Davacı:${this.getDavaTarafKayitOzeti(taraflar.davacilar)};Davalı:${this.getDavaTarafKayitOzeti(taraflar.davalilar)}`;
  }
  getDavaTarafKayitlari(dava?: Partial<DavaDosyasi> | null) {
    if (!dava) return { davacilar: [], davalilar: [] };
    const varsayilan = this.davaTaraflariVarsayilanOlustur(dava);
    return {
      davacilar: this.davaTaraflariniHazirla(varsayilan.davacilar),
      davalilar: this.davaTaraflariniHazirla(varsayilan.davalilar)
    };
  }
  davaMuvekkilTarafiniDahilEt(liste: DavaTarafKaydi[], isim: string, muvekkilId?: number) {
    if (!isim) return liste;
    if (!liste.some(taraf => taraf.isim.toLocaleLowerCase('tr-TR') === isim.toLocaleLowerCase('tr-TR'))) {
      const kayit = this.davaTarafBosOlustur(this.yeniGecmisKaydiId());
      kayit.isim = isim;
      kayit.muvekkilId = muvekkilId;
      const secilen = this.davaTarafMuvekkilKaydiBul(kayit);
      if (secilen) this.davaTarafBilgileriniMuvekkildenDoldur(kayit, secilen);
      liste.unshift(kayit);
    }
    return liste;
  }
  davaMuvekkilTaraflariniDahilEt(liste: DavaTarafKaydi[], muvekkiller: DavaTarafKaydi[]) {
    let guncelListe = [...liste];
    muvekkiller.forEach(muvekkil => {
      guncelListe = this.davaMuvekkilTarafiniDahilEt(guncelListe, muvekkil.isim, muvekkil.muvekkilId);
    });
    return guncelListe;
  }
  getDavaTarafOzet(dava?: Partial<DavaDosyasi> | null) {
    if (!dava) return 'Taraf bilgisi girilmedi.';
    const { davacilar, davalilar } = this.getDavaTarafKayitlari(dava);
    const bolumler: string[] = [];
    if (davacilar.length) bolumler.push(`Davacı: ${davacilar.map(taraf => taraf.isim).join(', ')}`);
    if (davalilar.length) bolumler.push(`Davalı: ${davalilar.map(taraf => taraf.isim).join(', ')}`);
    if (bolumler.length) return bolumler.join(' | ');
    return `${dava.muvekkil || 'Müvekkil yok'} | ${dava.karsiTaraf || '-'}`;
  }
  getDavaKarsiTarafOzet(dava?: Partial<DavaDosyasi> | null) {
    if (!dava) return '-';
    const { davacilar, davalilar } = this.getDavaTarafKayitlari(dava);
    const isimler = (dava.muvekkilPozisyonu === 'Davalı' ? davacilar : davalilar).map(taraf => taraf.isim);
    return isimler.length ? isimler.join(', ') : (dava.karsiTaraf || '-');
  }
  getDavaMuvekkilPozisyonEtiketi(dava?: Partial<DavaDosyasi> | null) {
    return dava?.muvekkilPozisyonu === 'Davalı' ? 'Davalı' : 'Davacı';
  }
  getDavaKarsiTarafPozisyonEtiketi(dava?: Partial<DavaDosyasi> | null) {
    return this.getDavaMuvekkilPozisyonEtiketi(dava) === 'Davalı' ? 'Davacı' : 'Davalı';
  }
  davaTarafEkle(tur: 'davaci' | 'davali') {
    const anahtar = tur === 'davaci' ? 'davacilar' : 'davalilar';
    if (!this.islemGorenDava[anahtar]) this.islemGorenDava[anahtar] = [];
    this.islemGorenDava[anahtar]!.push(this.davaTarafBosOlustur(Date.now()));
  }
  davaMuvekkilEkle() {
    if (!this.islemGorenDava.muvekkiller) this.islemGorenDava.muvekkiller = [];
    this.islemGorenDava.muvekkiller.push({ id: Date.now(), isim: '' });
  }
  davaMuvekkilSil(index: number) {
    if (!this.islemGorenDava.muvekkiller) return;
    this.islemGorenDava.muvekkiller.splice(index, 1);
    if (this.islemGorenDava.muvekkiller.length === 0) {
      this.islemGorenDava.muvekkiller = [{ id: Date.now(), isim: '' }];
    }
  }
  davaTarafSil(tur: 'davaci' | 'davali', index: number) {
    const anahtar = tur === 'davaci' ? 'davacilar' : 'davalilar';
    if (this.islemGorenDava[anahtar]) {
      this.islemGorenDava[anahtar]!.splice(index, 1);
      if (this.islemGorenDava[anahtar]!.length === 0) {
        this.islemGorenDava[anahtar] = [this.davaTarafBosOlustur(Date.now())];
      }
    }
  }
  davaTarafSecimDegisti(taraf: DavaTarafKaydi, muvekkilId?: number) {
    const secilen = this.muvekkiller.find(m => m.id == muvekkilId);
    taraf.muvekkilId = secilen?.id;
    if (secilen) this.davaTarafBilgileriniMuvekkildenDoldur(taraf, secilen);
  }
  davaMuvekkilSecimDegisti(kayit: DavaTarafKaydi, muvekkilId?: number) {
    const secilen = this.muvekkiller.find(m => m.id == muvekkilId);
    kayit.muvekkilId = secilen?.id;
    kayit.isim = secilen?.adSoyad || '';
  }
  davaTarafMetniElleDegisti(taraf: DavaTarafKaydi, isim: string) {
    taraf.isim = isim;
    const eslesen = this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim));
    taraf.muvekkilId = eslesen?.id;
    if (eslesen) this.davaTarafBilgileriniMuvekkildenDoldur(taraf, eslesen, true);
  }
  davaMuvekkilMetniElleDegisti(kayit: DavaTarafKaydi, isim: string) {
    kayit.isim = isim;
    const eslesen = this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim));
    kayit.muvekkilId = eslesen?.id;
  }
  metinEsit(a?: string, b?: string) {
    return (a || '').trim().toLocaleLowerCase('tr-TR') === (b || '').trim().toLocaleLowerCase('tr-TR');
  }
  sayfaAktifMi(s: SayfaTipi) {
    return this.aktifSayfa === s
      || (s === 'davalar' && this.aktifSayfa === 'detay')
      || (s === 'icralar' && this.aktifSayfa === 'icraDetay')
      || (s === 'arabuluculuk' && this.aktifSayfa === 'arabuluculukDetay');
  }

  getMenuClass(s: SayfaTipi): string {
    const b = "flex items-center gap-3 px-4 py-3 rounded-lg transition-all group cursor-pointer ";
    return this.sayfaAktifMi(s) ? b + "bg-blue-600 text-white shadow-md" : b + "text-slate-400 hover:bg-slate-800 hover:text-white";
  }

  getMobilMenuClass(s: SayfaTipi): string {
    return this.sayfaAktifMi(s)
      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
      : 'border-slate-200 bg-white text-slate-600';
  }

  getMobilKayitAnahtari(tur: 'dava' | 'icra' | 'arabuluculuk', id?: number | string | null) {
    return `${tur}-${id ?? 'kayit'}`;
  }

  mobilKayitAcikMi(tur: 'dava' | 'icra' | 'arabuluculuk', id?: number | string | null) {
    return !!this.mobilAcikKartlar[this.getMobilKayitAnahtari(tur, id)];
  }

  mobilKayitGecis(tur: 'dava' | 'icra' | 'arabuluculuk', id?: number | string | null) {
    const anahtar = this.getMobilKayitAnahtari(tur, id);
    const acikMi = !!this.mobilAcikKartlar[anahtar];
    Object.keys(this.mobilAcikKartlar)
      .filter(kayit => kayit.startsWith(`${tur}-`))
      .forEach(kayit => delete this.mobilAcikKartlar[kayit]);
    if (!acikMi) this.mobilAcikKartlar[anahtar] = true;
  }

  getArabuluculukTarafOzet(dosya?: Partial<ArabuluculukDosyasi> | null, limit = 2) {
    const isimler = (dosya?.taraflar || []).map(taraf => taraf.isim).filter(Boolean);
    if (!isimler.length) return 'Taraf bilgisi yok';
    const ozet = isimler.slice(0, limit).join(', ');
    const kalan = isimler.length - limit;
    return kalan > 0 ? `${ozet} + ${kalan} taraf` : ozet;
  }

  get filtrelenmisDavalar() { return this.davalar.filter(d => { const s = this.aramaMetni.toLowerCase(); const mS = d.dosyaNo.toLowerCase().includes(s) || d.muvekkil.toLowerCase().includes(s) || this.getDavaKarsiTarafOzet(d).toLowerCase().includes(s) || d.mahkeme.toLowerCase().includes(s) || (d.eskiMahkeme || '').toLowerCase().includes(s) || (d.eskiEsasNo || '').toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || d.durum === this.durumFiltresi; return mS && mD; }); }
  get filtrelenmisIcralar() { return this.icralar.filter(i => { const s = this.aramaMetni.toLowerCase(); const mS = i.dosyaNo.toLowerCase().includes(s) || i.icraDairesi.toLowerCase().includes(s) || i.alacakli.toLowerCase().includes(s) || i.borclu.toLowerCase().includes(s) || (i.eskiMahkeme || '').toLowerCase().includes(s) || (i.eskiEsasNo || '').toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || i.durum === this.durumFiltresi; return mS && mD; }); }
  get arabuluculukAramaDurumFiltreliListe() {
    return this.arabuluculukDosyalar.filter(a => {
      const s = this.aramaMetni.toLocaleLowerCase('tr-TR');
      const mS = (a.buroNo || '').toLocaleLowerCase('tr-TR').includes(s)
        || (a.arabuluculukNo || '').toLocaleLowerCase('tr-TR').includes(s)
        || this.getArabuluculukTarafAramaMetni(a.taraflar).includes(s);
      const mD = this.durumFiltresi === 'Tümü' || a.durum === this.durumFiltresi;
      return mS && mD;
    });
  }

  get filtrelenmisArabuluculuk() {
    return this.arabuluculukAramaDurumFiltreliListe.filter(a => this.arabuluculukSonucFiltresi === 'Tümü'
      || (this.arabuluculukSonucFiltresi === 'Girilmedi' ? !this.getArabuluculukSonucu(a) : this.getArabuluculukSonucu(a) === this.arabuluculukSonucFiltresi));
  }

  getArabuluculukSonucu(dosya?: Partial<ArabuluculukDosyasi> | null): ArabuluculukSonucu | '' {
    const sonuc = (dosya?.sonuc || '') as string;
    return this.arabuluculukSonucSecenekleri.includes(sonuc as ArabuluculukSonucu) ? sonuc as ArabuluculukSonucu : '';
  }
  getArabuluculukSonucEtiketi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return this.getArabuluculukSonucu(dosya) || 'Sonuç girilmedi';
  }
  getArabuluculukSonucClass(sonuc?: string | null) {
    if (sonuc === 'Anlaşma') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (sonuc === 'Anlaşamama') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (sonuc === 'Vazgeçme') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-slate-50 text-slate-500';
  }
  get arabuluculukSonucOzet() {
    const liste = this.arabuluculukAramaDurumFiltreliListe;
    const anlasma = liste.filter(a => this.getArabuluculukSonucu(a) === 'Anlaşma').length;
    const anlasamama = liste.filter(a => this.getArabuluculukSonucu(a) === 'Anlaşamama').length;
    const vazgecme = liste.filter(a => this.getArabuluculukSonucu(a) === 'Vazgeçme').length;
    const sonuclanan = anlasma + anlasamama + vazgecme;
    return {
      anlasma,
      anlasamama,
      vazgecme,
      sonuclanan,
      girilmedi: Math.max(0, liste.length - sonuclanan),
      toplam: liste.length
    };
  }
  getArabuluculukSonucGrafikStili() {
    const ozet = this.arabuluculukSonucOzet;
    const toplam = Math.max(ozet.sonuclanan, 0);
    if (!toplam) return { background: 'conic-gradient(#e2e8f0 0deg 360deg)' };
    const anlasmaAci = (ozet.anlasma / toplam) * 360;
    const anlasamamaAci = anlasmaAci + (ozet.anlasamama / toplam) * 360;
    return {
      background: `conic-gradient(#059669 0deg ${anlasmaAci}deg, #e11d48 ${anlasmaAci}deg ${anlasamamaAci}deg, #d97706 ${anlasamamaAci}deg 360deg)`
    };
  }

  get filtrelenmisArabuluculukSureKayitlari() {
    return this.filtrelenmisArabuluculuk
      .map(dosya => this.getArabuluculukSureSayaci(dosya))
      .filter((sayac): sayac is ArabuluculukSureSayaci => !!sayac && sayac.asama !== 'tamamlandi');
  }

  get filtrelenmisArabuluculukSureOzet() {
    const kayitlar = this.filtrelenmisArabuluculukSureKayitlari;
    return {
      izlenen: kayitlar.length,
      normal: kayitlar.filter(kayit => kayit.asama === 'normal').length,
      uzatma: kayitlar.filter(kayit => kayit.asama === 'uzatma').length,
      asildi: kayitlar.filter(kayit => kayit.asama === 'asildi').length
    };
  }

  getArabuluculukSureListeDetayi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    if (!dosya) return 'Dosya bulunamadı.';
    if (dosya.basvuruTuru !== 'Dava Şartı') return 'İhtiyari dosyada kanuni sayaç uygulanmaz.';

    const sayac = this.getArabuluculukSureSayaci(dosya);
    if (!sayac) return 'Görevlendirme tarihi girildiğinde sayaç başlayacak.';
    if (sayac.asama === 'tamamlandi') return `Tutanak ${sayac.tamamlanmaGun || 0} günde düzenlendi.`;

    return `Normal son: ${this.formatTarih(sayac.normalSonTarih)} * Azami son: ${this.formatTarih(sayac.azamiSonTarih)}`;
  }

  get filtrelenmisArabuluculukMuvekkiller() {
    const s = this.arabuluculukMuvekkilArama.toLowerCase();
    return this.muvekkiller.filter(m => m.adSoyad.toLowerCase().includes(s) || (m.tcKimlik && m.tcKimlik.toLowerCase().includes(s)));
  }
  get filtrelenmisIcraMuvekkilleri() {
    const arama = this.icraMuvekkilArama.toLocaleLowerCase('tr-TR').trim();
    return [...this.muvekkiller]
      .filter(m => {
        if (!arama) return true;
        return [m.adSoyad, m.tcKimlik, m.telefon, m.eposta]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .includes(arama);
      })
      .sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr-TR', { sensitivity: 'base' }));
  }
  filtrelenmisMuvekkilListesi(aramaMetni?: string) {
    const terimler = this.sablonAramaMetniHazirla(aramaMetni).split(' ').filter(Boolean);
    return [...this.muvekkiller]
      .filter(m => {
        if (!terimler.length) return true;
        const kaynak = this.sablonAramaMetniHazirla([m.adSoyad, m.tcKimlik, m.telefon, m.eposta, m.tip].filter(Boolean).join(' '));
        return terimler.every(terim => kaynak.includes(terim));
      })
      .sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr-TR', { sensitivity: 'base' }));
  }
  getArabuluculukTarafSecenekleri(taraf?: Partial<ArabuluculukTaraf> | null) {
    const arama = (taraf?.id ? this.arabuluculukTarafAramaMetinleri[taraf.id] : '') || '';
    return this.filtrelenmisMuvekkilListesi(arama);
  }
  getArabuluculukTarafVekilSecenekleri(taraf?: Partial<ArabuluculukTaraf> | null) {
    const arama = (taraf?.id ? this.arabuluculukTarafVekilAramaMetinleri[taraf.id] : '') || '';
    return this.filtrelenmisMuvekkilListesi(arama);
  }
  getArabuluculukTarafVekilListeBoyutu(taraf?: Partial<ArabuluculukTaraf> | null) {
    const arama = ((taraf?.id ? this.arabuluculukTarafVekilAramaMetinleri[taraf.id] : '') || '').trim();
    if (!arama) return null;
    const sonucSayisi = this.getArabuluculukTarafVekilSecenekleri(taraf).length;
    return sonucSayisi ? Math.min(6, sonucSayisi + 1) : 2;
  }
  arabuluculukTarafAramalariniHazirla(liste?: ArabuluculukTaraf[]) {
    this.arabuluculukTarafAramaMetinleri = {};
    this.arabuluculukTarafVekilAramaMetinleri = {};
    (liste || []).forEach(taraf => {
      this.arabuluculukTarafAramaMetinleri[taraf.id] = '';
      this.arabuluculukTarafVekilAramaMetinleri[taraf.id] = '';
    });
  }

  get istatistikler() {
    const davaAcik = this.davalar.filter(d => d.durum !== 'Kapalı').length;
    const davaKapali = this.davalar.filter(d => d.durum === 'Kapalı').length;
    const icraAcik = this.icralar.filter(i => i.durum !== 'İnfaz/Kapalı').length;
    const icraKapali = this.icralar.filter(i => i.durum === 'İnfaz/Kapalı').length;
    const arbAcik = this.arabuluculukDosyalar.filter(a => a.durum !== 'Kapalı').length;
    const arbKapali = this.arabuluculukDosyalar.filter(a => a.durum === 'Kapalı').length;
    return { 
      davaAcik, davaKapali, totalDava: this.davalar.length,
      icraAcik, icraKapali, totalIcra: this.icralar.length,
      arbAcik, arbKapali, totalArb: this.arabuluculukDosyalar.length
    };
  }

  get filtrelenmisYetkiliAdaylari() {
    const s = this.yetkiliSecimArama.toLowerCase();
    return this.muvekkiller.filter(m => m.id !== this.islemGorenMuvekkil.id && m.adSoyad.toLowerCase().includes(s));
  }

  secilenMuvekkilAd(id?: number) { return this.muvekkiller.find(m => m.id === id)?.adSoyad; }
  icraMuvekkilSecimEtiketi() {
    return this.secilenMuvekkilAd(this.islemGorenIcra.muvekkilId) || 'Müvekkil seçiniz';
  }
  icraMuvekkilRolunuAyarla(rol: 'Alacaklı' | 'Borçlu') {
    const oncekiRol = this.icraMuvekkilRolu;
    this.icraMuvekkilRolu = rol;
    const seciliAd = this.secilenMuvekkilAd(this.islemGorenIcra.muvekkilId);
    if (!seciliAd) return;
    this.icraMuvekkiliTarafaUygula(seciliAd, oncekiRol);
  }
  icraMuvekkilSec(muvekkil: Muvekkil) {
    if (!this.icraMuvekkilRolu) {
      this.formHata = 'Önce seçtiğiniz müvekkilin alacaklı mı borçlu mu olacağını belirtin.';
      return;
    }
    this.formHata = '';
    const oncekiMuvekkilAdi = this.secilenMuvekkilAd(this.islemGorenIcra.muvekkilId);
    this.islemGorenIcra.muvekkilId = muvekkil.id;
    this.islemGorenIcra.muvekkil = muvekkil.adSoyad;
    if (oncekiMuvekkilAdi && oncekiMuvekkilAdi !== muvekkil.adSoyad) {
      if ((this.islemGorenIcra.alacakli || '').trim() === oncekiMuvekkilAdi) this.islemGorenIcra.alacakli = '';
      if ((this.islemGorenIcra.borclu || '').trim() === oncekiMuvekkilAdi) this.islemGorenIcra.borclu = '';
    }
    this.icraMuvekkiliTarafaUygula(muvekkil.adSoyad);
    this.icraMuvekkilDropdownAcik = false;
    this.icraMuvekkilArama = '';
  }
  private icraMuvekkiliTarafaUygula(muvekkilAdi: string, oncekiRol?: 'Alacaklı' | 'Borçlu' | null) {
    if (oncekiRol === 'Alacaklı' && (this.islemGorenIcra.alacakli || '').trim() === muvekkilAdi) this.islemGorenIcra.alacakli = '';
    if (oncekiRol === 'Borçlu' && (this.islemGorenIcra.borclu || '').trim() === muvekkilAdi) this.islemGorenIcra.borclu = '';
    if (this.icraMuvekkilRolu === 'Alacaklı') {
      if ((this.islemGorenIcra.borclu || '').trim() === muvekkilAdi) this.islemGorenIcra.borclu = '';
      this.islemGorenIcra.alacakli = muvekkilAdi;
    }
    if (this.icraMuvekkilRolu === 'Borçlu') {
      if ((this.islemGorenIcra.alacakli || '').trim() === muvekkilAdi) this.islemGorenIcra.alacakli = '';
      this.islemGorenIcra.borclu = muvekkilAdi;
    }
  }

  get filtrelenmisIliskiler() {
    const s = this.iliskiArama.toLowerCase();
    let filtrelenmis = this.muvekkiller.filter(m => {
      const tipKontrol = (m.tip || 'Müvekkil') === this.aktifIliskiSekmesi;
      const aramaKontrol = m.adSoyad.toLowerCase().includes(s) || m.tcKimlik.toLowerCase().includes(s) || m.telefon.toLowerCase().includes(s);
      const finans = this.hesaplaMuvekkilFinans(m.id);
      const filtreKontrol = this.iliskiFiltre === 'Tümü' || (this.iliskiFiltre === 'Borclu' && finans.kalanVekaletBorcu > 0) || (this.iliskiFiltre === 'Alacakli' && finans.emanetMasrafBakiyesi > 0);
      return tipKontrol && aramaKontrol && filtreKontrol;
    });

    return filtrelenmis.sort((a, b) => {
      if (this.iliskiSiralama === 'a-z') return a.adSoyad.localeCompare(b.adSoyad, 'tr-TR');
      if (this.iliskiSiralama === 'z-a') return b.adSoyad.localeCompare(a.adSoyad, 'tr-TR');
      if (this.iliskiSiralama === 'yeni') return b.id - a.id;
      if (this.iliskiSiralama === 'eski') return a.id - b.id;
      return 0;
    });
  }
  iliskiKaydiSec(muvekkil: Muvekkil) {
    this.seciliIliskiId = this.seciliIliskiId === muvekkil.id ? null : muvekkil.id;
  }
  iliskiDetayiKapat() {
    this.seciliIliskiId = null;
  }
  get seciliIliski() {
    return this.muvekkiller.find(m => m.id === this.seciliIliskiId) || null;
  }
  iliskiDosyaylaEslesiyor(muvekkil: Muvekkil, isim?: string, muvekkilId?: number) {
    if (muvekkilId && muvekkil.id === muvekkilId) return true;
    return this.metinEsit(muvekkil.adSoyad, isim);
  }
  get seciliIliskiDosyalari(): IliskiDosyaKaydi[] {
    const muvekkil = this.seciliIliski;
    if (!muvekkil) return [];

    const davaKayitlari = this.davalar
      .filter(dava =>
        dava.muvekkilId === muvekkil.id
        || (dava.muvekkiller || []).some(kayit => this.iliskiDosyaylaEslesiyor(muvekkil, kayit.isim, kayit.muvekkilId))
        || this.getDavaTarafKayitlari(dava).davacilar.some(taraf => this.iliskiDosyaylaEslesiyor(muvekkil, taraf.isim, taraf.muvekkilId))
        || this.getDavaTarafKayitlari(dava).davalilar.some(taraf => this.iliskiDosyaylaEslesiyor(muvekkil, taraf.isim, taraf.muvekkilId))
      )
      .map(dava => ({
        id: `dava-${dava.id}`,
        tur: 'dava' as const,
        baslik: dava.dosyaNo || 'Dava dosyası',
        altBaslik: `${dava.mahkeme || '-'} * ${dava.konu || '-'}`,
        durum: dava.durum,
        referans: this.getDavaTarafOzet(dava),
        dosya: dava
      }));

    const icraKayitlari = this.icralar
      .filter(icra =>
        icra.muvekkilId === muvekkil.id
        || this.iliskiDosyaylaEslesiyor(muvekkil, icra.alacakli)
        || this.iliskiDosyaylaEslesiyor(muvekkil, icra.borclu)
      )
      .map(icra => ({
        id: `icra-${icra.id}`,
        tur: 'icra' as const,
        baslik: `${icra.icraDairesi || 'İcra'} / ${icra.dosyaNo || '-'}`,
        altBaslik: `${icra.alacakli || '-'} * ${icra.borclu || '-'}`,
        durum: icra.durum,
        referans: `Muhatap: ${icra.muvekkil || '-'}`,
        dosya: icra
      }));

    const arabuluculukKayitlari = this.arabuluculukDosyalar
      .filter(arabuluculuk =>
        arabuluculuk.muvekkilId === muvekkil.id
        || (arabuluculuk.taraflar || []).some(taraf => this.iliskiDosyaylaEslesiyor(muvekkil, taraf.isim))
      )
      .map(arabuluculuk => ({
        id: `arabuluculuk-${arabuluculuk.id}`,
        tur: 'arabuluculuk' as const,
        baslik: `${arabuluculuk.arabuluculukNo || 'Arabuluculuk'}${arabuluculuk.buroNo ? ` / ${arabuluculuk.buroNo}` : ''}`,
        altBaslik: `${arabuluculuk.buro || '-'} * ${arabuluculuk.uyusmazlikTuru || '-'}`,
        durum: arabuluculuk.durum,
        referans: (arabuluculuk.taraflar || []).map(taraf => taraf.isim).join(', ') || 'Taraf bilgisi yok',
        dosya: arabuluculuk
      }));

    return [...davaKayitlari, ...icraKayitlari, ...arabuluculukKayitlari]
      .sort((a, b) => Number((b.dosya as any).id || 0) - Number((a.dosya as any).id || 0));
  }
  get seciliIliskiDosyaOzeti() {
    const kayitlar = this.seciliIliskiDosyalari;
    return {
      dava: kayitlar.filter(kayit => kayit.tur === 'dava').length,
      icra: kayitlar.filter(kayit => kayit.tur === 'icra').length,
      arabuluculuk: kayitlar.filter(kayit => kayit.tur === 'arabuluculuk').length
    };
  }
  iliskiDosyasinaGit(kayit: IliskiDosyaKaydi) {
    if (kayit.tur === 'dava') this.detayaGit(kayit.dosya as DavaDosyasi);
    else if (kayit.tur === 'icra') this.icraDetayinaGit(kayit.dosya as IcraDosyasi);
    else this.arabuluculukDetayinaGit(kayit.dosya as ArabuluculukDosyasi);
  }

  get muhasebeListesi() {
    let liste: any[] = [];
    this.davalar.forEach(d => {
      let odenen = 0; (d.finansalIslemler || []).forEach(i => { if (i.tur === 'Vekalet Ücreti') odenen += i.tutar; });
      const kalan = Math.max(0, Number(((d.vekaletUcreti || 0) - odenen).toFixed(2)));
      if (kalan > 0.01) liste.push({ tip: 'Avukatlık', isim: d.dosyaNo || 'İsimsiz Dosya', muvekkil: d.muvekkil, toplam: d.vekaletUcreti || 0, tahsilat: odenen, kalan: kalan, id: d.id, detayFonk: () => this.detayaGit(d) });
    });
    this.icralar.forEach(i => {
      let odenen = 0; (i.finansalIslemler || []).forEach(islem => { if (islem.tur === 'Vekalet Ücreti') odenen += islem.tutar; });
      const kalan = Math.max(0, Number(((i.vekaletUcreti || 0) - odenen).toFixed(2)));
      if (kalan > 0.01) liste.push({ tip: 'İcra', isim: i.icraDairesi + ' ' + i.dosyaNo, muvekkil: i.muvekkil, toplam: i.vekaletUcreti || 0, tahsilat: odenen, kalan: kalan, id: i.id, detayFonk: () => this.icraDetayinaGit(i) });
    });
    this.arabuluculukDosyalar.forEach(a => {
      let odenen = 0; (a.finansalIslemler || []).forEach(islem => { 
        if (islem.tur === 'Ödeme' || islem.tur === 'Ödeme Tarihi' || islem.tur === 'Vekalet Ücreti') {
          const hesap = this.getArabuluculukMakbuzHesabi(islem, a);
          odenen += hesap?.netTutar || 0;
        }
      });
      const netUcret = this.getArabuluculukHizmetUcretiHesabi(a)?.netTutar || 0;
      const kalan = Math.max(0, Number((netUcret - odenen).toFixed(2)));
      
      const taraflarStr = a.taraflar?.map((t:any) => t.isim).join(' vs ') || '';

      if (kalan > 0.01) liste.push({ tip: 'Arabuluculuk', isim: (a.buroNo ? a.buroNo + ' / ' : '') + a.arabuluculukNo, muvekkil: this.muvekkiller.find(m=>m.id === a.muvekkilId)?.adSoyad || a.taraflar?.map((t:any) => t.isim).join(', ') || '-', ekBilgi: taraflarStr, toplam: netUcret, tahsilat: odenen, kalan: kalan, id: a.id, detayFonk: () => this.arabuluculukDetayinaGit(a) });
    });
    return liste.sort((a, b) => b.kalan - a.kalan);
  }

  get muhasebeOzet() {
    const o = { toplam: 0, avukatlik: 0, icra: 0, arabuluculuk: 0 };
    this.muhasebeListesi.forEach(item => {
      o.toplam += item.kalan;
      if (item.tip === 'Avukatlık') o.avukatlik += item.kalan;
      if (item.tip === 'İcra') o.icra += item.kalan;
      if (item.tip === 'Arabuluculuk') o.arabuluculuk += item.kalan;
    });
    return o;
  }

  ajandaGunDamgasi(str?: string) {
    if (!str) return Number.MAX_SAFE_INTEGER;
    const tarih = new Date(str);
    tarih.setHours(0, 0, 0, 0);
    return tarih.getTime();
  }

  ajandaTarihDamgasi(str?: string) {
    if (!str) return Number.MAX_SAFE_INTEGER;
    return new Date(str).getTime();
  }

  gunBazliTarihOlustur(str?: string) {
    const deger = (str || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deger)) return null;

    const [yil, ay, gun] = deger.split('-').map(Number);
    const tarih = new Date(yil, ay - 1, gun);
    tarih.setHours(0, 0, 0, 0);
    return Number.isNaN(tarih.getTime()) ? null : tarih;
  }

  gunBazliIsoTarih(tarih?: Date | null) {
    if (!tarih) return '';
    const yil = tarih.getFullYear();
    const ay = `${tarih.getMonth() + 1}`.padStart(2, '0');
    const gun = `${tarih.getDate()}`.padStart(2, '0');
    return `${yil}-${ay}-${gun}`;
  }

  gunBazliTarihEkle(str?: string, gun = 0) {
    const tarih = this.gunBazliTarihOlustur(str);
    if (!tarih) return '';
    const yeniTarih = new Date(tarih);
    yeniTarih.setDate(yeniTarih.getDate() + gun);
    return this.gunBazliIsoTarih(yeniTarih);
  }

  gunBazliTarihFarki(str?: string) {
    const tarih = this.gunBazliTarihOlustur(str);
    if (!tarih) return Number.MAX_SAFE_INTEGER;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return Math.round((tarih.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
  }

  ajandaGunFarki(str?: string) {
    if (!str) return Number.MAX_SAFE_INTEGER;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    return Math.round((this.ajandaGunDamgasi(str) - bugun.getTime()) / (1000 * 60 * 60 * 24));
  }

  ajandaDurumMetni(str?: string) {
    const fark = this.ajandaGunFarki(str);
    if (!isFinite(fark)) return 'Tarih yok';
    if (fark < 0) return `${Math.abs(fark)} gün geçmiş`;
    if (fark === 0) return 'Bugün';
    if (fark === 1) return 'Yarın';
    return `${fark} gün kaldı`;
  }

  getAjandaKalanGunClass(str?: string) {
    const fark = this.ajandaGunFarki(str);
    if (fark < 0) return 'bg-rose-100 text-rose-700';
    if (fark === 0) return 'bg-amber-100 text-amber-700';
    if (fark <= 7) return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  }

  getAjandaDurumMetni(kayit: AjandaKaydi) {
    const fark = this.ajandaGunFarki(kayit.tarih);
    if (kayit.tur !== 'sureliIs') return this.ajandaDurumMetni(kayit.tarih);
    if (!isFinite(fark)) return 'Tarih yok';
    if (fark < 0) return `${Math.abs(fark)} gün geçti`;
    if (fark === 0) return 'Bugün son gün';
    if (fark <= 5) return `${fark} gün kaldı`;
    return `${fark} gün kaldı`;
  }

  getAjandaDurumClass(kayit: AjandaKaydi) {
    const fark = this.ajandaGunFarki(kayit.tarih);
    if (kayit.tur === 'sureliIs') {
      if (fark < 0) return 'app-agenda-critical-pulse border-red-200 bg-red-600 text-white';
      if (fark <= 2) return 'app-agenda-critical-pulse border-red-200 bg-red-600 text-white';
      if (fark <= 5) return 'border-amber-300 bg-amber-100 text-amber-800';
    }
    return `${this.getAjandaKalanGunClass(kayit.tarih)} border-transparent`;
  }

  getSureliIsUyariMetni(kayit: AjandaKaydi) {
    if (kayit.tur !== 'sureliIs') return '';
    const fark = this.ajandaGunFarki(kayit.tarih);
    if (fark < 0) return `Süreli iş ${Math.abs(fark)} gün gecikti`;
    if (fark === 0) return 'Bugün son gün';
    if (fark <= 5) return `Süreli iş için ${fark} gün kaldı`;
    return '';
  }

  getSureliIsUyariClass(kayit: AjandaKaydi) {
    const fark = this.ajandaGunFarki(kayit.tarih);
    if (fark < 0 || fark <= 2) return 'app-agenda-critical-pulse border-red-200 bg-red-600 text-white';
    return 'border-amber-300 bg-amber-50 text-amber-800';
  }

  getArabuluculukSureKurali(dosya?: Partial<ArabuluculukDosyasi> | null) {
    const uyusmazlik = (dosya?.uyusmazlikTuru || '').toLocaleLowerCase('tr-TR');
    const ticariMi = uyusmazlik.includes('ticari');

    return {
      kuralEtiketi: ticariMi ? 'Ticari dava şartı' : 'Genel dava şartı',
      kuralAciklamasi: ticariMi ? '6 hafta yasal süre + 2 hafta uzatma' : '3 hafta yasal süre + 1 hafta uzatma',
      normalSureGun: ticariMi ? 42 : 21,
      uzatmaSureGun: ticariMi ? 14 : 7
    };
  }

  getArabuluculukSureSayaci(dosya?: Partial<ArabuluculukDosyasi> | null): ArabuluculukSureSayaci | null {
    if (!dosya || dosya.basvuruTuru !== 'Dava Şartı') return null;

    const gorevlendirmeTarihi = (dosya.arabulucuGorevlendirmeTarihi || '').trim();
    const gorevTarihi = this.gunBazliTarihOlustur(gorevlendirmeTarihi);
    if (!gorevTarihi) return null;

    const kural = this.getArabuluculukSureKurali(dosya);
    const normalSonTarih = this.gunBazliTarihEkle(gorevlendirmeTarihi, kural.normalSureGun);
    const azamiSonTarih = this.gunBazliTarihEkle(gorevlendirmeTarihi, kural.normalSureGun + kural.uzatmaSureGun);
    const normalKalanGun = this.gunBazliTarihFarki(normalSonTarih);
    const azamiKalanGun = this.gunBazliTarihFarki(azamiSonTarih);

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const gecenGun = Math.max(0, Math.round((bugun.getTime() - gorevTarihi.getTime()) / (1000 * 60 * 60 * 24)));

    const temelBilgi = {
      dosya: dosya as ArabuluculukDosyasi,
      ...kural,
      gorevlendirmeTarihi,
      normalSonTarih,
      azamiSonTarih,
      gecenGun,
      normalKalanGun,
      azamiKalanGun
    };

    const tutanakTarihi = this.gunBazliTarihOlustur(dosya.tutanakDuzenlemeTarihi);
    if (tutanakTarihi) {
      return {
        ...temelBilgi,
        asama: 'tamamlandi',
        tamamlanmaGun: Math.max(0, Math.round((tutanakTarihi.getTime() - gorevTarihi.getTime()) / (1000 * 60 * 60 * 24)))
      };
    }

    const asama: ArabuluculukSureAsamasi = normalKalanGun < 0
      ? (azamiKalanGun < 0 ? 'asildi' : 'uzatma')
      : 'normal';

    return {
      ...temelBilgi,
      asama
    };
  }

  get arabuluculukSureTakipKayitlari() {
    return this.arabuluculukDosyalar
      .map(dosya => this.getArabuluculukSureSayaci(dosya))
      .filter((sayac): sayac is ArabuluculukSureSayaci => !!sayac && sayac.asama !== 'tamamlandi');
  }

  get arabuluculukSureSayacOzet() {
    const kayitlar = this.arabuluculukSureTakipKayitlari;
    return {
      izlenen: kayitlar.length,
      normal: kayitlar.filter(kayit => kayit.asama === 'normal').length,
      uzatma: kayitlar.filter(kayit => kayit.asama === 'uzatma').length,
      asildi: kayitlar.filter(kayit => kayit.asama === 'asildi').length
    };
  }

  get oncelikliArabuluculukSureKayitlari() {
    return [...this.arabuluculukSureTakipKayitlari]
      .sort((a, b) => {
        const oncelikA = a.asama === 'asildi' ? 0 : (a.asama === 'uzatma' ? 1 : 2);
        const oncelikB = b.asama === 'asildi' ? 0 : (b.asama === 'uzatma' ? 1 : 2);
        if (oncelikA !== oncelikB) return oncelikA - oncelikB;
        if (a.azamiKalanGun !== b.azamiKalanGun) return a.azamiKalanGun - b.azamiKalanGun;
        return this.ajandaGunDamgasi(a.azamiSonTarih) - this.ajandaGunDamgasi(b.azamiSonTarih);
      })
      .slice(0, 6);
  }

  get kritikArabuluculukSureKayitlari() {
    return [...this.arabuluculukSureTakipKayitlari]
      .filter(kayit => kayit.asama === 'asildi' || kayit.asama === 'uzatma' || kayit.azamiKalanGun <= 7)
      .sort((a, b) => {
        const oncelikA = a.asama === 'asildi' ? 0 : (a.asama === 'uzatma' ? 1 : 2);
        const oncelikB = b.asama === 'asildi' ? 0 : (b.asama === 'uzatma' ? 1 : 2);
        if (oncelikA !== oncelikB) return oncelikA - oncelikB;
        if (a.azamiKalanGun !== b.azamiKalanGun) return a.azamiKalanGun - b.azamiKalanGun;
        return this.ajandaGunDamgasi(a.azamiSonTarih) - this.ajandaGunDamgasi(b.azamiSonTarih);
      });
  }

  getArabuluculukSureAsamaClass(asama?: ArabuluculukSureAsamasi) {
    if (asama === 'asildi') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (asama === 'uzatma') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (asama === 'tamamlandi') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }

  getArabuluculukSureAsamaEtiketi(sayac?: ArabuluculukSureSayaci | null) {
    if (!sayac) return 'Sayaç bekleniyor';
    if (sayac.asama === 'asildi') return 'Azami Süre Aşıldı';
    if (sayac.asama === 'uzatma') return 'Uzatma Penceresinde';
    if (sayac.asama === 'tamamlandi') return 'Süreç Tamamlandı';
    return 'Normal Sürede';
  }

  getArabuluculukSureKalanMetni(sayac?: ArabuluculukSureSayaci | null) {
    if (!sayac) return 'Görevlendirme tarihi bekleniyor';
    if (sayac.asama === 'tamamlandi') return `Tutanak ${sayac.tamamlanmaGun || 0} günde düzenlendi`;
    if (sayac.asama === 'asildi') return `Azami süre ${Math.abs(sayac.azamiKalanGun)} gün geçti`;
    if (sayac.asama === 'uzatma') return sayac.azamiKalanGun === 0 ? 'Azami sürenin son günü' : `Azami süreye ${sayac.azamiKalanGun} gün kaldı`;
    return sayac.normalKalanGun === 0 ? 'Normal sürenin son günü' : `Normal süreye ${sayac.normalKalanGun} gün kaldı`;
  }

  getArabuluculukSureDetayMetni(sayac?: ArabuluculukSureSayaci | null) {
    if (!sayac) return 'Görevlendirme tarihi girildiğinde sayaç otomatik başlayacak.';
    if (sayac.asama === 'tamamlandi') {
      return `Tutanak düzenleme tarihi işlendiği için sayaç kapandı. Dosya görevlendirmeden sonra ${sayac.tamamlanmaGun || 0} gün içinde sonuçlandırıldı.`;
    }
    if (sayac.asama === 'asildi') {
      return `Azami sürenin üzerinden ${Math.abs(sayac.azamiKalanGun)} gün geçti. Dosyanın son tutanak ve kapanış adımlarını öncelikli kontrol etmeniz gerekir.`;
    }
    if (sayac.asama === 'uzatma') {
      return `Normal yasal süre doldu. Arabulucunun kullanabileceği uzatma penceresinin son günü ${this.formatTarih(sayac.azamiSonTarih)} olarak izleniyor.`;
    }
    return `Normal yasal süre ${this.formatTarih(sayac.normalSonTarih)} tarihinde doluyor. Gerekirse uzatma ile azami son tarih ${this.formatTarih(sayac.azamiSonTarih)} olarak hesaplandı.`;
  }

  ofisGoreviFormunuSifirla() {
    this.yeniOfisGorevi = { tarih: new Date().toISOString().split('T')[0], saat: '', oncelik: 'Normal', baslik: '', aciklama: '' };
  }

  ofisGoreviZamanDamgasi(gorev?: Partial<OfisGorevi>) {
    if (!gorev?.tarih) return Number.MAX_SAFE_INTEGER;
    return new Date(`${gorev.tarih}T${(gorev.saat || '00:00').slice(0, 5) || '00:00'}`).getTime();
  }

  get aktifOfisGorevleri() {
    return [...this.ofisGorevleri]
      .filter(gorev => !gorev.tamamlandiMi)
      .sort((a, b) => this.ofisGoreviZamanDamgasi(a) - this.ofisGoreviZamanDamgasi(b));
  }

  async ofisGoreviKaydet() {
    const baslik = this.formatMetin(this.yeniOfisGorevi.baslik)?.trim();
    const tarih = (this.yeniOfisGorevi.tarih || '').trim();
    if (!baslik || !tarih) {
      this.bildirimGoster('info', 'Ofis görevi eksik', 'Başlık ve tarih alanını doldurun.');
      return;
    }

    const gorev: OfisGorevi = {
      id: Date.now(),
      baslik,
      aciklama: (this.yeniOfisGorevi.aciklama || '').trim(),
      tarih,
      saat: (this.yeniOfisGorevi.saat || '').trim().slice(0, 5),
      oncelik: this.yeniOfisGorevi.oncelik || 'Normal',
      tamamlandiMi: false,
      kayitTarihi: new Date().toISOString()
    };
    const kaydedildi = await this.ofisGoreviKaydetCloud(gorev, 'Görev ajandaya eklendi.');
    if (!kaydedildi) return;
    this.ofisGoreviFormunuSifirla();
  }

  ofisGoreviDuzenleBaslat(gorev: OfisGorevi, event?: Event) {
    event?.stopPropagation();
    this.duzenlenenOfisGoreviId = gorev.id;
    this.duzenlenenOfisGorevi = { ...gorev };
  }

  ofisGoreviDuzenlemeIptal(event?: Event) {
    event?.stopPropagation();
    this.duzenlenenOfisGoreviId = null;
    this.duzenlenenOfisGorevi = {};
  }

  async ofisGoreviGuncelleKaydet(event?: Event) {
    event?.stopPropagation();
    const id = this.duzenlenenOfisGoreviId;
    const mevcut = id ? this.ofisGorevleri.find(gorev => gorev.id === id) : null;
    if (!id || !mevcut) return;
    const baslik = this.formatMetin(this.duzenlenenOfisGorevi.baslik)?.trim();
    const tarih = (this.duzenlenenOfisGorevi.tarih || '').trim();
    if (!baslik || !tarih) {
      this.bildirimGoster('info', 'Ofis görevi eksik', 'Başlık ve tarih alanını doldurun.');
      return;
    }

    const guncel: OfisGorevi = {
      ...mevcut,
      baslik,
      aciklama: (this.duzenlenenOfisGorevi.aciklama || '').trim(),
      tarih,
      saat: (this.duzenlenenOfisGorevi.saat || '').trim().slice(0, 5),
      oncelik: this.duzenlenenOfisGorevi.oncelik || 'Normal'
    };
    const kaydedildi = await this.ofisGoreviKaydetCloud(guncel, 'Ofis görevi güncellendi.');
    if (!kaydedildi) return;
    this.ofisGoreviDuzenlemeIptal();
  }

  async ofisGoreviTamamla(gorev: OfisGorevi, event?: Event) {
    event?.stopPropagation();
    const onceki = this.veriKopyala(gorev);
    const guncel: OfisGorevi = { ...gorev, tamamlandiMi: true, tamamlanmaTarihi: new Date().toISOString() };
    const kaydedildi = await this.ofisGoreviKaydetCloud(guncel);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Ofis görevi tamamlandı',
      'Görev ajandadan kapatıldı.',
      () => this.ofisGoreviKaydetCloud(onceki),
      'Ofis görevi geri açıldı',
      'Görev tekrar aktif hale getirildi.'
    );
  }

  async ofisGoreviSil(gorev: OfisGorevi, event?: Event) {
    event?.stopPropagation();
    const onceki = this.veriKopyala(gorev);
    const silindi = await this.ofisGoreviSilCloud(gorev.id);
    if (!silindi) return;
    if (this.duzenlenenOfisGoreviId === gorev.id) this.ofisGoreviDuzenlemeIptal();
    this.geriAlinabilirBasariBildirimiGoster(
      'Ofis görevi silindi',
      'Görev listesinden kaldırıldı.',
      () => this.ofisGoreviKaydetCloud(onceki),
      'Ofis görevi geri yüklendi',
      'Silinen görev tekrar ajandaya eklendi.'
    );
  }

  getOfisGoreviOncelikClass(oncelik?: string) {
    if (oncelik === 'Acil') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (oncelik === 'Önemli') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  getAjandaTurEtiketi(tur: AjandaTur) {
    if (tur === 'durusma') return 'Duruşma';
    if (tur === 'toplanti') return 'Toplantı';
    if (tur === 'ofisGorevi') return 'Ofis Görevi';
    return 'Süreli İş';
  }

  getAjandaTurClass(tur: AjandaTur) {
    if (tur === 'durusma') return 'bg-blue-100 text-blue-700';
    if (tur === 'toplanti') return 'bg-purple-100 text-purple-700';
    if (tur === 'ofisGorevi') return 'bg-emerald-100 text-emerald-700';
    return 'bg-rose-100 text-rose-700';
  }

  getAjandaKaynakEtiketi(kaynak: AjandaKaynak) {
    if (kaynak === 'dava') return 'Dava';
    if (kaynak === 'icra') return 'İcra';
    if (kaynak === 'ofis') return 'Ofis';
    return 'Arabuluculuk';
  }

  getAjandaKaynakClass(kaynak: AjandaKaynak) {
    if (kaynak === 'dava') return 'bg-slate-100 text-slate-700';
    if (kaynak === 'icra') return 'bg-emerald-100 text-emerald-700';
    if (kaynak === 'ofis') return 'bg-amber-100 text-amber-700';
    return 'bg-violet-100 text-violet-700';
  }

  getAjandaDosyaOzeti(kaynak: AjandaKaynak, dosya?: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi) {
    if (kaynak === 'ofis' || !dosya) return 'Ofis içi görev';
    if (kaynak === 'dava') {
      const dava = dosya as DavaDosyasi;
      return dava.dosyaNo || 'Dava dosyası';
    }
    if (kaynak === 'icra') {
      const icra = dosya as IcraDosyasi;
      return `${icra.icraDairesi || ''} ${icra.dosyaNo || ''}`.trim() || 'İcra dosyası';
    }
    const arabuluculuk = dosya as ArabuluculukDosyasi;
    return `${arabuluculuk.buroNo ? arabuluculuk.buroNo + ' / ' : ''}${arabuluculuk.arabuluculukNo || ''}`.trim() || 'Arabuluculuk dosyası';
  }

  ajandaKaydinaGit(kayit: AjandaKaydi) {
    if (kayit.kaynak === 'ofis') {
      this.sayfaDegistir('ajanda');
      return;
    }
    if (kayit.kaynak === 'dava') this.detayaGit(kayit.dosya as DavaDosyasi);
    else if (kayit.kaynak === 'icra') this.icraDetayinaGit(kayit.dosya as IcraDosyasi);
    else this.arabuluculukDetayinaGit(kayit.dosya as ArabuluculukDosyasi);

    if (kayit.tur === 'sureliIs') this.aktifDetaySekmesi = 'sureliIsler';
  }

  get ajandaKayitlariLegacy() {
    const kayitlar: AjandaKaydi[] = [];

    this.davalar.forEach(dava => {
      if (dava.durum === 'Kapalı' || !dava.durusmaTarihi || dava.durusmaTamamlandiMi) return;
      kayitlar.push({
        id: `dava-durusma-${dava.id}`,
        tarih: this.birlestirTarihVeSaat(dava.durusmaTarihi, dava.durusmaSaati),
        saat: dava.durusmaSaati,
        tur: 'durusma',
        kaynak: 'dava',
        dosya: dava,
        baslik: dava.mahkeme || 'Dava Duruşması',
        altBaslik: dava.konu || this.getAjandaDosyaOzeti('dava', dava),
        taraflar: this.getDavaTarafOzet(dava)
      });
    });

    this.arabuluculukDosyalar.forEach(arabuluculuk => {
      if (arabuluculuk.durum === 'Kapalı' || !arabuluculuk.toplantiTarihi || arabuluculuk.toplantiTamamlandiMi) return;
      kayitlar.push({
        id: `arabuluculuk-toplanti-${arabuluculuk.id}`,
        tarih: this.birlestirTarihVeSaat(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati),
        saat: arabuluculuk.toplantiSaati,
        tur: 'toplanti',
        kaynak: 'arabuluculuk',
        dosya: arabuluculuk,
        baslik: this.getAjandaDosyaOzeti('arabuluculuk', arabuluculuk),
        altBaslik: arabuluculuk.toplantiYontemi ? `${arabuluculuk.buro || 'Arabuluculuk'} - ${arabuluculuk.toplantiYontemi}` : (arabuluculuk.buro || 'Arabuluculuk toplantısı'),
        taraflar: arabuluculuk.taraflar?.map(t => t.isim).join(' - ') || 'Taraf bilgisi yok'
      });
    });

    this.tumAcilSureliIsler.forEach(is => {
      kayitlar.push({
        id: `${is.tur}-sureli-${is.dosya.id}-${is.evrak.id}`,
        tarih: is.evrak.sonEylemTarihi,
        tur: 'sureliIs',
        kaynak: is.tur,
        dosya: is.dosya,
        baslik: is.evrak.isim || 'Süreli iş',
        altBaslik: this.getAjandaDosyaOzeti(is.tur, is.dosya),
        taraflar: this.getTaraflarMetni(is),
        evrakId: is.evrak.id,
        evrakIsmi: is.evrak.isim,
        anaEvrakIsmi: is.anaEvrakIsim
      });
    });

    this.aktifOfisGorevleri.forEach(gorev => {
      kayitlar.push({
        id: `ofis-gorevi-${gorev.id}`,
        tarih: this.birlestirTarihVeSaat(gorev.tarih, gorev.saat),
        saat: gorev.saat,
        tur: 'ofisGorevi',
        kaynak: 'ofis',
        ofisGorevi: gorev,
        baslik: gorev.baslik || 'Ofis görevi',
        altBaslik: gorev.aciklama || `${gorev.oncelik || 'Normal'} öncelikli ofis içi iş`,
        taraflar: 'Ofis içi görev'
      });
    });

    return kayitlar.sort((a, b) => this.ajandaTarihDamgasi(a.tarih) - this.ajandaTarihDamgasi(b.tarih));
  }

  get ajandaKayitlari() {
    const kayitlar: AjandaKaydi[] = [];

    this.davalar.forEach(dava => {
      if (dava.durum.toLowerCase().includes('kap') || !dava.durusmaTarihi || dava.durusmaTamamlandiMi) return;
      kayitlar.push({
        id: `dava-durusma-${dava.id}`,
        tarih: this.birlestirTarihVeSaat(dava.durusmaTarihi, dava.durusmaSaati),
        saat: dava.durusmaSaati,
        tur: 'durusma',
        kaynak: 'dava',
        dosya: dava,
        baslik: dava.mahkeme || 'Dava Duruşması',
        altBaslik: dava.konu || this.getAjandaDosyaOzeti('dava', dava),
        taraflar: this.getDavaTarafOzet(dava)
      });
    });

    this.arabuluculukDosyalar.forEach(arabuluculuk => {
      if (arabuluculuk.durum.toLowerCase().includes('kap') || !arabuluculuk.toplantiTarihi || arabuluculuk.toplantiTamamlandiMi) return;
      kayitlar.push({
        id: `arabuluculuk-toplanti-${arabuluculuk.id}`,
        tarih: this.birlestirTarihVeSaat(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati),
        saat: arabuluculuk.toplantiSaati,
        tur: 'toplanti',
        kaynak: 'arabuluculuk',
        dosya: arabuluculuk,
        baslik: this.getAjandaDosyaOzeti('arabuluculuk', arabuluculuk),
        altBaslik: arabuluculuk.toplantiYontemi ? `${arabuluculuk.buro || 'Arabuluculuk'} - ${arabuluculuk.toplantiYontemi}` : (arabuluculuk.buro || 'Arabuluculuk toplantısı'),
        taraflar: arabuluculuk.taraflar?.map(t => t.isim).join(' - ') || 'Taraf bilgisi yok'
      });
    });

    this.tumAcilSureliIsler.forEach(is => {
      kayitlar.push({
        id: `${is.tur}-sureli-${is.dosya.id}-${is.evrak.id}`,
        tarih: is.evrak.sonEylemTarihi,
        tur: 'sureliIs',
        kaynak: is.tur,
        dosya: is.dosya,
        baslik: is.evrak.isim || 'Süreli iş',
        altBaslik: this.getAjandaDosyaOzeti(is.tur, is.dosya),
        taraflar: this.getTaraflarMetni(is),
        evrakId: is.evrak.id,
        evrakIsmi: is.evrak.isim,
        anaEvrakIsmi: is.anaEvrakIsim
      });
    });

    return kayitlar.sort((a, b) => this.ajandaTarihDamgasi(a.tarih) - this.ajandaTarihDamgasi(b.tarih));
  }

  get filtrelenmisAjandaKayitlari() {
    const arama = this.ajandaArama.trim().toLowerCase();
    return this.ajandaKayitlari.filter(kayit => {
      const fark = this.ajandaGunFarki(kayit.tarih);
      const metin = [
        kayit.baslik,
        kayit.altBaslik,
        kayit.taraflar,
        kayit.evrakIsmi || '',
        kayit.anaEvrakIsmi || '',
        kayit.ofisGorevi?.aciklama || '',
        kayit.ofisGorevi?.oncelik || '',
        this.getAjandaKaynakEtiketi(kayit.kaynak),
        this.getAjandaTurEtiketi(kayit.tur),
        this.getAjandaDosyaOzeti(kayit.kaynak, kayit.dosya)
      ].join(' ').toLowerCase();

      const aramaUygun = !arama || metin.includes(arama);
      const zamanUygun = this.ajandaZamanFiltresi === 'all'
        || (this.ajandaZamanFiltresi === 'today' && fark === 0)
        || (this.ajandaZamanFiltresi === '7days' && fark >= 0 && fark <= 7)
        || (this.ajandaZamanFiltresi === '30days' && fark >= 0 && fark <= 30)
        || (this.ajandaZamanFiltresi === 'overdue' && fark < 0);
      const turUygun = this.ajandaTurFiltresi === 'all' || kayit.tur === this.ajandaTurFiltresi;

      return aramaUygun && zamanUygun && turUygun;
    });
  }

  get ajandaOzet() {
    const kayitlar = this.ajandaKayitlari;
    return {
      toplam: kayitlar.length,
      bugun: kayitlar.filter(kayit => this.ajandaGunFarki(kayit.tarih) === 0).length,
      yakin: kayitlar.filter(kayit => {
        const fark = this.ajandaGunFarki(kayit.tarih);
        return fark >= 0 && fark <= 7;
      }).length,
      gecmis: kayitlar.filter(kayit => this.ajandaGunFarki(kayit.tarih) < 0).length,
      durusma: kayitlar.filter(kayit => kayit.tur === 'durusma').length,
      toplanti: kayitlar.filter(kayit => kayit.tur === 'toplanti').length,
      sureliIs: kayitlar.filter(kayit => kayit.tur === 'sureliIs').length,
      ofisGorevi: kayitlar.filter(kayit => kayit.tur === 'ofisGorevi').length
    };
  }

  get dashboardUyariOzet() {
    const kayitlar = this.ajandaKayitlari;
    const bugun = kayitlar.filter(kayit => this.ajandaGunFarki(kayit.tarih) === 0).length;
    const gecmis = kayitlar.filter(kayit => this.ajandaGunFarki(kayit.tarih) < 0).length;
    const yediGun = kayitlar.filter(kayit => {
      const fark = this.ajandaGunFarki(kayit.tarih);
      return fark > 0 && fark <= 7;
    }).length;
    const otuzGun = kayitlar.filter(kayit => {
      const fark = this.ajandaGunFarki(kayit.tarih);
      return fark > 0 && fark <= this.gunlukOzetGunSayisiniSinirla(this.gunlukOzetYakinGunSayisi);
    }).length;

    return {
      bugun,
      gecmis,
      yediGun,
      otuzGun,
      sureAlarm: this.kritikArabuluculukSureKayitlari.length,
      tahsilat: this.muhasebeListesi.length,
      tahsilatTutari: this.muhasebeOzet.toplam
    };
  }

  get bildirimMerkeziAjandaKayitlari() {
    return this.getGunlukOzetAjandaKayitlari().slice(0, 8);
  }

  get oncelikliAjandaKayitlari() {
    return this.getGunlukOzetAjandaKayitlari(7).slice(0, 6);
  }

  get oncelikliTahsilatKayitlari() {
    return this.muhasebeListesi.slice(0, 4);
  }

  get yaklasanAjandaKayitlari() {
    return this.ajandaKayitlari.filter(kayit => this.ajandaGunFarki(kayit.tarih) >= 0).slice(0, 5);
  }

  get filtrelenmisMuhasebeListesi() {
    const s = this.muhasebeArama.toLowerCase();
    return this.muhasebeListesi.filter(item => {
      const mS = item.isim.toLowerCase().includes(s) || item.muvekkil.toLowerCase().includes(s);
      const mF = this.muhasebeFiltre === 'Tümü' || item.tip === this.muhasebeFiltre;
      return mS && mF;
    });
  }

  get aktifDosya() { return this.aktifSayfa === 'icraDetay' ? this.seciliIcra : (this.aktifSayfa === 'arabuluculukDetay' ? this.seciliArabuluculuk : this.seciliDava); }
  aktifDosyaNotKomutuUygula(komut: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'formatBlock' | 'removeFormat', deger?: string) {
    if (typeof document === 'undefined' || !this.dosyaNotEditorRef?.nativeElement) return;
    this.dosyaNotEditorRef.nativeElement.focus();
    if (komut === 'removeFormat') {
      document.execCommand('removeFormat', false);
      document.execCommand('formatBlock', false, 'p');
    } else if (komut === 'formatBlock' && deger) {
      document.execCommand('formatBlock', false, deger);
    } else {
      document.execCommand(komut, false);
    }
    this.aktifDosyaNotEditorDegisti();
  }
  aktifDosyaNotEditorDegisti() {
    if (!this.aktifDosya || !this.dosyaNotEditorRef?.nativeElement) return;
    this.aktifDosya.notlar = this.aktifDosyaNotEditorHtmlAl();
  }
  aktifDosyaNotlariniKaydet() {
    if (!this.aktifDosya) return;
    this.aktifDosyaNotEditorDegisti();
    this.aktifDosyaKaydet(this.aktifDosya);
  }
  private aktifDosyaNotEditorunuYukle() {
    if (!this.dosyaNotEditorRef?.nativeElement) return;
    const html = this.notIceriginiEditorIcinHazirla(this.aktifDosya?.notlar);
    if (this.dosyaNotEditorRef.nativeElement.innerHTML !== html) {
      this.dosyaNotEditorRef.nativeElement.innerHTML = html;
    }
  }
  private aktifDosyaNotEditorHtmlAl() {
    const editor = this.dosyaNotEditorRef?.nativeElement;
    if (!editor || !editor.innerText.trim()) return '';
    return editor.innerHTML.trim();
  }
  private notIceriginiEditorIcinHazirla(icerik?: string) {
    const metin = (icerik || '').trim();
    if (!metin) return '';
    if (/<(p|div|br|ul|ol|li|strong|b|em|i|u|h1|h2|h3|blockquote)\b/i.test(metin)) return metin;
    return this.htmlKacis(metin).replace(/\n/g, '<br>');
  }
  private htmlKacis(metin: string) {
    return metin
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  get aktifDosyaIslemGecmisi() {
    return [...(this.aktifDosya?.islemGecmisi || [])].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  }
  get aktifDosyaTakvimGecmisi() {
    return [...(this.aktifDosya?.takvimGecmisi || [])].sort((a, b) => new Date(b.kayitTarihi).getTime() - new Date(a.kayitTarihi).getTime());
  }
  get aktifDavaMuvekkilGorusmeNotlari() {
    const dava = this.getAktifDavaDosyasi();
    return [...(dava?.muvekkilGorusmeNotlari || [])].sort((a, b) => this.muvekkilGorusmeZamanDamgasi(a) - this.muvekkilGorusmeZamanDamgasi(b));
  }
  muvekkilGorusmeZamanDamgasi(kayit?: Partial<MuvekkilGorusmeNotu>) {
    if (!kayit?.tarih) return Number.MAX_SAFE_INTEGER;
    return new Date(`${kayit.tarih}T${(kayit.saat || '00:00').slice(0, 5) || '00:00'}`).getTime();
  }
  muvekkilGorusmeNotuOnizleme(notlar?: string, limit = 120) {
    const metin = (notlar || '').replace(/\s+/g, ' ').trim();
    if (!metin) return 'Not girilmedi.';
    return metin.length > limit ? `${metin.slice(0, limit)}...` : metin;
  }
  muvekkilGorusmeNotuAcikMi(id: number) {
    return !!this.acikMuvekkilGorusmeNotlari[id];
  }
  muvekkilGorusmeNotuGorunumDegistir(id: number) {
    this.acikMuvekkilGorusmeNotlari[id] = !this.acikMuvekkilGorusmeNotlari[id];
  }
  getMuvekkilGorusmeKayitOzetMetni(kayit?: Partial<MuvekkilGorusmeNotu>) {
    if (!kayit?.tarih) return '-';
    const temel = this.formatTarihSaat(kayit.tarih, kayit.saat);
    return kayit.yontem ? `${temel} * ${kayit.yontem}` : temel;
  }
  muvekkilGorusmeNotuFormunuSifirla() {
    this.yeniMuvekkilGorusmeNotu = { tarih: new Date().toISOString().split('T')[0], saat: '', yontem: 'Telefon', notlar: '' };
  }
  muvekkilGorusmeNotuDuzenlemeBaslat(kayit: MuvekkilGorusmeNotu) {
    this.duzenlenenMuvekkilGorusmeNotuId = kayit.id;
    this.duzenlenenMuvekkilGorusmeNotu = { ...kayit };
    this.silinecekMuvekkilGorusmeNotuId = null;
    this.acikMuvekkilGorusmeNotlari[kayit.id] = true;
  }
  muvekkilGorusmeNotuDuzenlemeIptal() {
    this.duzenlenenMuvekkilGorusmeNotuId = null;
    this.duzenlenenMuvekkilGorusmeNotu = {};
  }
  muvekkilGorusmeNotuSilmeIste(id: number) {
    this.silinecekMuvekkilGorusmeNotuId = id;
    this.acikMuvekkilGorusmeNotlari[id] = true;
  }
  muvekkilGorusmeNotuSilmeIptal() {
    this.silinecekMuvekkilGorusmeNotuId = null;
  }
  async muvekkilGorusmeNotuKaydet() {
    const dava = this.getAktifDavaDosyasi();
    if (!dava) return;

    const tarih = this.yeniMuvekkilGorusmeNotu.tarih || new Date().toISOString().split('T')[0];
    const saat = (this.yeniMuvekkilGorusmeNotu.saat || '').trim().slice(0, 5);
    const yontem = this.formatMetin(this.yeniMuvekkilGorusmeNotu.yontem) || 'Telefon';
    const notlar = (this.yeniMuvekkilGorusmeNotu.notlar || '').trim();
    if (!tarih || !notlar) {
      this.bildirimGoster('info', 'Görüşme notu eksik', 'Tarih ve not alanını doldurup tekrar deneyin.');
      return;
    }

    const k: DavaDosyasi = JSON.parse(JSON.stringify(dava));
    if (!k.muvekkilGorusmeNotlari) k.muvekkilGorusmeNotlari = [];
    const yeniKayit: MuvekkilGorusmeNotu = {
      id: this.yeniGecmisKaydiId(),
      tarih,
      saat,
      yontem,
      notlar,
      kayitTarihi: new Date().toISOString()
    };
    k.muvekkilGorusmeNotlari.push(yeniKayit);
    k.muvekkilGorusmeNotlari.sort((a, b) => this.muvekkilGorusmeZamanDamgasi(a) - this.muvekkilGorusmeZamanDamgasi(b));

    const kayitli = this.dosyayaIslemKaydiEkle(
      k,
      'gorusme',
      'Müvekkil görüşme notu eklendi',
      `${this.formatTarihSaat(tarih, saat)}${yontem ? ` * ${yontem}` : ''}`
    );
    this.seciliDava = kayitli;
    this.acikMuvekkilGorusmeNotlari[yeniKayit.id] = false;
    this.muvekkilGorusmeNotuFormunuSifirla();
    await this.davaKaydetCloud(kayitli, 'Müvekkil görüşme notu kaydedildi.');
    this.cdr.detectChanges();
  }
  async muvekkilGorusmeNotuGuncelleKaydet() {
    const dava = this.getAktifDavaDosyasi();
    const kayitId = this.duzenlenenMuvekkilGorusmeNotuId;
    if (!dava || !kayitId) return;

    const tarih = this.duzenlenenMuvekkilGorusmeNotu.tarih || new Date().toISOString().split('T')[0];
    const saat = (this.duzenlenenMuvekkilGorusmeNotu.saat || '').trim().slice(0, 5);
    const yontem = this.formatMetin(this.duzenlenenMuvekkilGorusmeNotu.yontem) || 'Telefon';
    const notlar = (this.duzenlenenMuvekkilGorusmeNotu.notlar || '').trim();
    if (!tarih || !notlar) {
      this.bildirimGoster('info', 'Görüşme notu eksik', 'Tarih ve not alanını doldurup tekrar deneyin.');
      return;
    }

    const k: DavaDosyasi = JSON.parse(JSON.stringify(dava));
    const kayit = (k.muvekkilGorusmeNotlari || []).find(item => item.id === kayitId);
    if (!kayit) return;

    kayit.tarih = tarih;
    kayit.saat = saat;
    kayit.yontem = yontem;
    kayit.notlar = notlar;
    k.muvekkilGorusmeNotlari = [...(k.muvekkilGorusmeNotlari || [])].sort((a, b) => this.muvekkilGorusmeZamanDamgasi(a) - this.muvekkilGorusmeZamanDamgasi(b));

    const kayitli = this.dosyayaIslemKaydiEkle(k, 'gorusme', 'Müvekkil görüşme notu güncellendi', this.getMuvekkilGorusmeKayitOzetMetni(kayit));
    this.seciliDava = kayitli;
    this.duzenlenenMuvekkilGorusmeNotuDuzenlemeSonrasiSifirla(kayitId);
    await this.davaKaydetCloud(kayitli, 'Müvekkil görüşme notu güncellendi.');
    this.cdr.detectChanges();
  }
  duzenlenenMuvekkilGorusmeNotuDuzenlemeSonrasiSifirla(kayitId: number) {
    this.duzenlenenMuvekkilGorusmeNotuId = null;
    this.duzenlenenMuvekkilGorusmeNotu = {};
    this.silinecekMuvekkilGorusmeNotuId = null;
    this.acikMuvekkilGorusmeNotlari[kayitId] = false;
  }
  async muvekkilGorusmeNotuSil(id: number) {
    const dava = this.getAktifDavaDosyasi();
    if (!dava) return;
    const oncekiKayit = this.veriKopyala(dava);

    const k: DavaDosyasi = JSON.parse(JSON.stringify(dava));
    const silinen = (k.muvekkilGorusmeNotlari || []).find(item => item.id === id);
    if (!silinen) return;
    k.muvekkilGorusmeNotlari = (k.muvekkilGorusmeNotlari || []).filter(item => item.id !== id);

    const kayitli = this.dosyayaIslemKaydiEkle(k, 'gorusme', 'Müvekkil görüşme notu silindi', this.getMuvekkilGorusmeKayitOzetMetni(silinen));
    this.seciliDava = kayitli;
    delete this.acikMuvekkilGorusmeNotlari[id];
    if (this.duzenlenenMuvekkilGorusmeNotuId === id) this.muvekkilGorusmeNotuDuzenlemeIptal();
    this.silinecekMuvekkilGorusmeNotuId = null;
    const kaydedildi = await this.davaKaydetCloud(kayitli);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Müvekkil görüşme notu silindi',
      'Kayıt dosyadan kaldırıldı.',
      () => this.davaKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Müvekkil görüşme notu geri yüklendi',
      'Silinen görüşme notu yeniden dosyaya işlendi.'
    );
    this.cdr.detectChanges();
  }
  
  get aktifDosyaSureliIsleri() {
    const dosya = this.aktifDosya; if (!dosya) return [];
    let isler: any[] = [];
    (dosya.evraklar || []).forEach((e:any) => {
       if (e.sonEylemTarihi && !e.tamamlandiMi) isler.push({...e, anaEvrakIsim: null});
       (e.ekler || []).forEach((ek:any) => { if (ek.sonEylemTarihi && !ek.tamamlandiMi) isler.push({...ek, anaEvrakIsim: e.isim}); });
    });
    return isler.sort((a,b) => new Date(a.sonEylemTarihi).getTime() - new Date(b.sonEylemTarihi).getTime());
  }

  get tumAcilSureliIsler() {
    let isler: any[] = [];
    this.davalar.forEach(d => {
        if (d.durum === 'Kapalı') return;
        (d.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi && !e.tamamlandiMi) isler.push({ tur: 'dava', dosya: d, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi && !ek.tamamlandiMi) isler.push({ tur: 'dava', dosya: d, evrak: ek, anaEvrakIsim: e.isim }); });
        });
    });
    this.icralar.forEach(i => {
        if (i.durum === 'İnfaz/Kapalı') return;
        (i.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi && !e.tamamlandiMi) isler.push({ tur: 'icra', dosya: i, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi && !ek.tamamlandiMi) isler.push({ tur: 'icra', dosya: i, evrak: ek, anaEvrakIsim: e.isim }); });
        });
    });
    this.arabuluculukDosyalar.forEach(a => {
        if (a.durum === 'Kapalı') return;
        (a.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi && !e.tamamlandiMi) isler.push({ tur: 'arabuluculuk', dosya: a, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi && !ek.tamamlandiMi) isler.push({ tur: 'arabuluculuk', dosya: a, evrak: ek, anaEvrakIsim: e.isim }); });
        });
    });
    return isler.sort((a,b) => new Date(a.evrak.sonEylemTarihi).getTime() - new Date(b.evrak.sonEylemTarihi).getTime());
  }

  formatMetin(str: any): any {
    if (typeof str !== 'string') return str;
    const trimli = str.trim();
    if (!trimli) return str;
    const tUpper = trimli.toLocaleUpperCase('tr-TR');
    const tLower = trimli.toLocaleLowerCase('tr-TR');
    
    // Eğer veri TAMAMI büyük veya TAMAMI küçük yazılmışsa kuralı işlet
    if (trimli === tUpper || trimli === tLower) {
      return trimli.split(' ').map((kelime: string) => {
        if (kelime.length === 0) return '';
        return kelime.charAt(0).toLocaleUpperCase('tr-TR') + kelime.slice(1).toLocaleLowerCase('tr-TR');
      }).join(' ');
    }
    return trimli; // Karışık veri girişiyse olduğu gibi bırak
  }
  hazirBaglantiUrl(url?: string) {
    const temiz = (url || '').trim();
    if (!temiz) return '';
    return /^https?:\/\//i.test(temiz) ? temiz : `https://${temiz}`;
  }
  duzMetinTrimle(str: any) {
    return typeof str === 'string' ? str.trim() : str;
  }
  epostaDegeriniTemizle(str: any) {
    return typeof str === 'string' ? str.trim().toLocaleLowerCase('tr-TR') : str;
  }
  adresAcikBolumunuCikar(adres: string, il?: string, ilce?: string) {
    let sonuc = (this.formatMetin(adres) || '').trim();
    const bolge = [this.formatMetin(ilce) || '', this.formatMetin(il) || ''].filter(Boolean).join('/');
    if (sonuc && bolge && sonuc.toLocaleLowerCase('tr-TR').endsWith(bolge.toLocaleLowerCase('tr-TR'))) {
      sonuc = sonuc.slice(0, Math.max(0, sonuc.length - bolge.length)).trim().replace(/[,\-/\s]+$/g, '');
    }
    return sonuc;
  }
  adresBilesenleriniHazirla(kayit?: AdresliKayit | null) {
    const eskiAdres = this.formatMetin(kayit?.adres) || '';
    const parcalar = this.adrestenIlIlceCikar(eskiAdres);
    const il = this.formatMetin(kayit?.il || parcalar.il) || '';
    const ilce = this.formatMetin(kayit?.ilce || parcalar.ilce) || '';
    const acikAdres = this.formatMetin(kayit?.acikAdres || this.adresAcikBolumunuCikar(eskiAdres, il, ilce)) || '';
    return {
      il,
      ilce,
      acikAdres,
      adres: this.adresGosterimMetniOlustur({ il, ilce, acikAdres }, '') || eskiAdres
    };
  }
  adresKaydiNormalizeEt<T extends AdresliKayit>(kayit: T): T {
    return { ...kayit, ...this.adresBilesenleriniHazirla(kayit) };
  }
  adresGosterimMetniOlustur(kayit?: AdresliKayit | null, bosDeger = '-') {
    const acikAdres = this.formatMetin(kayit?.acikAdres) || '';
    const ilce = this.formatMetin(kayit?.ilce) || '';
    const il = this.formatMetin(kayit?.il) || '';
    const bolge = [ilce, il].filter(Boolean).join('/');
    const sonuc = [acikAdres, bolge].filter(Boolean).join(' ').trim();
    return sonuc || this.formatMetin(kayit?.adres) || bosDeger;
  }
  getAdresGosterimMetni(kayit?: AdresliKayit | null, bosDeger = '-') {
    return this.adresGosterimMetniOlustur(kayit, bosDeger);
  }
  arabuluculukTarafBosOlustur(tip: ArabuluculukTaraf['tip'] = 'Diğer Taraf', id = Date.now()): ArabuluculukTaraf {
    return { id, tip, isim: '', muvekkilId: undefined, vekilMuvekkilId: undefined, tcVergiNo: '', vergiDairesi: '', adres: '', il: '', ilce: '', acikAdres: '', telefon: '', eposta: '', vekil: '', vekilTelefon: '', vekilEposta: '', vekilBaroBilgisi: '' };
  }
  arabuluculukTarafMuvekkilKaydiBul(taraf?: Partial<ArabuluculukTaraf> | null) {
    if (!taraf) return null;
    if (taraf.muvekkilId) {
      const idIleEslesen = this.muvekkiller.find(m => m.id == taraf.muvekkilId);
      if (idIleEslesen) return idIleEslesen;
    }
    const isim = (taraf.isim || '').trim();
    if (!isim) return null;
    return this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim)) || null;
  }
  arabuluculukTarafVekilKaydiBul(taraf?: Partial<ArabuluculukTaraf> | null) {
    if (!taraf) return null;
    if (taraf.vekilMuvekkilId) {
      const idIleEslesen = this.muvekkiller.find(m => m.id == taraf.vekilMuvekkilId);
      if (idIleEslesen) return idIleEslesen;
    }
    const isim = (taraf.vekil || '').trim();
    if (!isim) return null;
    return this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim)) || null;
  }
  arabuluculukTarafBilgileriniMuvekkildenDoldur(taraf: ArabuluculukTaraf, secilen: Muvekkil, isimKorunsun = false) {
    taraf.muvekkilId = secilen.id;
    if (!isimKorunsun || !(taraf.isim || '').trim()) taraf.isim = secilen.adSoyad || '';
    taraf.tcVergiNo = this.duzMetinTrimle(taraf.tcVergiNo || secilen.tcKimlik) || '';
    taraf.vergiDairesi = this.formatMetin(taraf.vergiDairesi || secilen.vergiDairesi) || '';
    const adres = this.adresBilesenleriniHazirla({
      adres: taraf.adres || secilen.adres,
      il: taraf.il || secilen.il,
      ilce: taraf.ilce || secilen.ilce,
      acikAdres: taraf.acikAdres || secilen.acikAdres
    });
    taraf.il = adres.il;
    taraf.ilce = adres.ilce;
    taraf.acikAdres = adres.acikAdres;
    taraf.adres = adres.adres;
    taraf.telefon = this.duzMetinTrimle(taraf.telefon || secilen.telefon) || '';
    taraf.eposta = this.epostaDegeriniTemizle(taraf.eposta || secilen.eposta) || '';
  }
  arabuluculukTarafVekilBilgileriniMuvekkildenDoldur(taraf: ArabuluculukTaraf, secilen: Muvekkil, isimKorunsun = false) {
    taraf.vekilMuvekkilId = secilen.id;
    if (!isimKorunsun || !(taraf.vekil || '').trim()) taraf.vekil = secilen.adSoyad || '';
    taraf.vekilTelefon = this.duzMetinTrimle(taraf.vekilTelefon || secilen.telefon) || '';
    taraf.vekilEposta = this.epostaDegeriniTemizle(taraf.vekilEposta || secilen.eposta) || '';
  }
  arabuluculukTarafSecimDegisti(taraf: ArabuluculukTaraf, muvekkilId?: number) {
    const secilen = this.muvekkiller.find(m => m.id == muvekkilId);
    taraf.muvekkilId = secilen?.id;
    if (secilen) this.arabuluculukTarafBilgileriniMuvekkildenDoldur(taraf, secilen);
  }
  arabuluculukTarafMetniElleDegisti(taraf: ArabuluculukTaraf, isim: string) {
    taraf.isim = isim;
    const eslesen = this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim));
    taraf.muvekkilId = eslesen?.id;
    if (eslesen) this.arabuluculukTarafBilgileriniMuvekkildenDoldur(taraf, eslesen, true);
  }
  arabuluculukTarafVekilSecimDegisti(taraf: ArabuluculukTaraf, muvekkilId?: number) {
    const secilen = this.muvekkiller.find(m => m.id == muvekkilId);
    taraf.vekilMuvekkilId = secilen?.id;
    if (secilen) this.arabuluculukTarafVekilBilgileriniMuvekkildenDoldur(taraf, secilen);
  }
  arabuluculukTarafVekilMetniElleDegisti(taraf: ArabuluculukTaraf, isim: string) {
    taraf.vekil = isim;
    const eslesen = this.muvekkiller.find(m => this.metinEsit(m.adSoyad, isim));
    taraf.vekilMuvekkilId = eslesen?.id;
    if (eslesen) this.arabuluculukTarafVekilBilgileriniMuvekkildenDoldur(taraf, eslesen, true);
  }
  arabuluculukTaraflariniHazirla(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .map((taraf, index) => {
        const secilen = this.arabuluculukTarafMuvekkilKaydiBul(taraf);
        const secilenVekil = this.arabuluculukTarafVekilKaydiBul(taraf);
        const adres = this.adresBilesenleriniHazirla({
          adres: taraf.adres || secilen?.adres,
          il: taraf.il || secilen?.il,
          ilce: taraf.ilce || secilen?.ilce,
          acikAdres: taraf.acikAdres || secilen?.acikAdres
        });
        return {
          ...taraf,
          ...adres,
          id: typeof taraf.id === 'number' ? taraf.id : Date.now() + index,
          isim: this.formatMetin(secilen?.adSoyad || taraf.isim),
          muvekkilId: secilen?.id ?? taraf.muvekkilId,
          vekilMuvekkilId: secilenVekil?.id ?? taraf.vekilMuvekkilId,
          tcVergiNo: this.duzMetinTrimle(taraf.tcVergiNo || secilen?.tcKimlik) || '',
          vergiDairesi: this.formatMetin(taraf.vergiDairesi || secilen?.vergiDairesi) || '',
          telefon: this.duzMetinTrimle(taraf.telefon || secilen?.telefon) || '',
          eposta: this.epostaDegeriniTemizle(taraf.eposta || secilen?.eposta) || '',
          vekil: this.formatMetin(secilenVekil?.adSoyad || taraf.vekil) || '',
          vekilTelefon: this.duzMetinTrimle(taraf.vekilTelefon || secilenVekil?.telefon) || '',
          vekilEposta: this.epostaDegeriniTemizle(taraf.vekilEposta || secilenVekil?.eposta) || '',
          vekilBaroBilgisi: this.formatMetin(taraf.vekilBaroBilgisi) || ''
        };
      })
      .filter(taraf => taraf.isim && taraf.isim.trim() !== '');
  }
  getArabuluculukTarafKayitOzeti(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .map(taraf => [taraf.tip, taraf.isim, taraf.tcVergiNo, taraf.vergiDairesi, taraf.adres, taraf.il, taraf.ilce, taraf.acikAdres, taraf.vekil].filter(Boolean).join(':'))
      .join('|');
  }
  getArabuluculukTarafAramaMetni(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .flatMap(taraf => [taraf.tip, taraf.isim, taraf.tcVergiNo, taraf.vergiDairesi, taraf.adres, taraf.il, taraf.ilce, taraf.acikAdres, taraf.telefon, taraf.eposta, taraf.vekil, taraf.vekilTelefon, taraf.vekilEposta, taraf.vekilBaroBilgisi])
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR');
  }
  getArabuluculukTarafIsimMetni(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return (dosya?.taraflar || []).map(taraf => taraf.isim).filter(Boolean).join(' * ') || 'Taraf bilgisi yok';
  }

  dosyaFormunuAc(d?: DavaDosyasi) {
    this.formHata = '';
    this.seciliBaglantiliIcraId = undefined;
    this.seciliBaglantiliArabuluculukId = undefined;
    this.baglantiliIcraArama = '';
    this.baglantiliArabuluculukArama = '';
    this.yeniBaglantiliTedbirDosyasi = '';
    this.yeniBaglantiliDelilTespitiDosyasi = '';
    this.yeniBaglantiliNoterlikDosyasi = '';
    this.hizliMuvekkilFormAcik = false;
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
    if (d) { 
      this.formModu = 'duzenle'; 
      const taraflar = this.davaTaraflariVarsayilanOlustur(d);
      const muvekkiller = this.davaMuvekkilleriVarsayilanOlustur(d);
      this.islemGorenDava = { ...d, dosyaNumaralari: Array.isArray(d.dosyaNumaralari) ? d.dosyaNumaralari.map(n => ({...n})) : [], muvekkiller, davacilar: taraflar.davacilar, davalilar: taraflar.davalilar, baglantiliIcraIds: this.getDavaBaglantiliIcraIdleri(d), baglantiliArabuluculukIds: this.getDavaBaglantiliArabuluculukIdleri(d), baglantiliTedbirDosyalari: this.getDavaBaglantiMetinListesi(d.baglantiliTedbirDosyalari), baglantiliDelilTespitiDosyalari: this.getDavaBaglantiMetinListesi(d.baglantiliDelilTespitiDosyalari), baglantiliNoterlikDosyalari: this.getDavaBaglantiMetinListesi(d.baglantiliNoterlikDosyalari) }; 
      if (!this.islemGorenDava.dosyaNumaralari || this.islemGorenDava.dosyaNumaralari.length === 0) {
         this.islemGorenDava.dosyaNumaralari = [{ tur: 'ESAS', no: this.islemGorenDava.dosyaNo || '' }, { tur: 'KARAR', no: '' }]; 
      }
    } 
    else { const varsayilanDava = { muvekkilPozisyonu: 'Davacı' } as Partial<DavaDosyasi>; const taraflar = this.davaTaraflariVarsayilanOlustur(varsayilanDava); const muvekkiller = this.davaMuvekkilleriVarsayilanOlustur(varsayilanDava); this.formModu = 'ekle'; this.islemGorenDava = { durum: 'Derdest', muvekkilId: undefined, muvekkilPozisyonu: 'Davacı', durusmaSaati: '', durusmaTamamlandiMi: false, dosyaNumaralari: [{ tur: 'ESAS', no: '' }, { tur: 'KARAR', no: '' }], muvekkiller, davacilar: taraflar.davacilar, davalilar: taraflar.davalilar, baglantiliIcraIds: [], baglantiliArabuluculukIds: [], baglantiliTedbirDosyalari: [], baglantiliDelilTespitiDosyalari: [], baglantiliNoterlikDosyalari: [] }; }
    this.davaFormAcik = true;
  }
  dosyaNumarasiEkle() { if (!this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari = []; this.islemGorenDava.dosyaNumaralari.push({ tur: 'ESAS', no: '' }); }
  dosyaNumarasiSil(i: number) { if (this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari.splice(i, 1); }
  davaFormKapat() { this.davaFormAcik = false; this.hizliMuvekkilFormAcik = false; this.hizliMuvekkilKaydi = { tip: 'Müvekkil' }; this.seciliBaglantiliIcraId = undefined; this.seciliBaglantiliArabuluculukId = undefined; this.baglantiliIcraArama = ''; this.baglantiliArabuluculukArama = ''; this.yeniBaglantiliTedbirDosyasi = ''; this.yeniBaglantiliDelilTespitiDosyasi = ''; this.yeniBaglantiliNoterlikDosyasi = ''; }
  davaKaydet() {
    const num = (this.islemGorenDava.dosyaNumaralari || []).filter(n => n.no && n.no.trim() !== '');
    const muvekkiller = this.davaMuvekkilleriniHazirla(this.islemGorenDava.muvekkiller);
    if (num.length === 0 || muvekkiller.length === 0) { this.formHata = "Dosya numarası ve müvekkil zorunludur."; return; }
    if (this.islemGorenDava.durum !== 'İstinaf/Temyiz') this.islemGorenDava.istinafMahkemesi = '';
    
    this.islemGorenDava.mahkeme = this.formatMetin(this.islemGorenDava.mahkeme);
    this.islemGorenDava.eskiMahkeme = this.formatMetin(this.islemGorenDava.eskiMahkeme);
    this.islemGorenDava.eskiEsasNo = this.formatMetin(this.islemGorenDava.eskiEsasNo);
    this.islemGorenDava.konu = this.formatMetin(this.islemGorenDava.konu);
    this.islemGorenDava.istinafMahkemesi = this.formatMetin(this.islemGorenDava.istinafMahkemesi);
    this.islemGorenDava.arsivYeri = this.formatMetin(this.islemGorenDava.arsivYeri);

    const birincilMuvekkil = muvekkiller[0];
    const muvekkil = muvekkiller.map(kayit => kayit.isim).join(', ') || this.islemGorenDava.muvekkil || 'Bilinmiyor';
    const muvekkilPozisyonu = this.islemGorenDava.muvekkilPozisyonu || 'Davacı';
    let davacilar = this.davaTaraflariniHazirla(this.islemGorenDava.davacilar);
    let davalilar = this.davaTaraflariniHazirla(this.islemGorenDava.davalilar);
    const baglantiliIcraIds = this.getDavaBaglantiliIcraIdleri(this.islemGorenDava);
    const baglantiliArabuluculukIds = this.getDavaBaglantiliArabuluculukIdleri(this.islemGorenDava);
    const baglantiliTedbirDosyalari = this.getDavaBaglantiMetinListesi(this.islemGorenDava.baglantiliTedbirDosyalari);
    const baglantiliDelilTespitiDosyalari = this.getDavaBaglantiMetinListesi(this.islemGorenDava.baglantiliDelilTespitiDosyalari);
    const baglantiliNoterlikDosyalari = this.getDavaBaglantiMetinListesi(this.islemGorenDava.baglantiliNoterlikDosyalari);
    if (muvekkilPozisyonu === 'Davalı') davalilar = this.davaMuvekkilTaraflariniDahilEt(davalilar, muvekkiller);
    else davacilar = this.davaMuvekkilTaraflariniDahilEt(davacilar, muvekkiller);
    const karsiTaraf = (muvekkilPozisyonu === 'Davalı' ? davacilar : davalilar).map(taraf => taraf.isim).join(', ') || '-';
    const noStr = num.map(n => `${n.tur}: ${n.no}`).join(' | ');
    if (this.formModu === 'ekle') {
      let y: DavaDosyasi = { id: Date.now(), dosyaNo: noStr, dosyaNumaralari: num, muvekkilId: birincilMuvekkil?.muvekkilId, muvekkiller, muvekkil, muvekkilPozisyonu, davacilar, davalilar, karsiTaraf, mahkeme: this.islemGorenDava.mahkeme || '-', eskiMahkeme: this.islemGorenDava.eskiMahkeme || '', eskiEsasNo: this.islemGorenDava.eskiEsasNo || '', konu: this.islemGorenDava.konu || '-', durum: this.islemGorenDava.durum as any, istinafMahkemesi: this.islemGorenDava.istinafMahkemesi || '', durusmaTarihi: this.islemGorenDava.durusmaTarihi || '', durusmaSaati: this.islemGorenDava.durusmaSaati || '', durusmaTamamlandiMi: false, durusmaTamamlanmaTarihi: '', takipTarihi: this.islemGorenDava.takipTarihi || '', vekaletUcreti: this.islemGorenDava.vekaletUcreti || 0, baglantiliIcraId: baglantiliIcraIds[0], baglantiliIcraIds, baglantiliArabuluculukIds, baglantiliTedbirDosyalari, baglantiliDelilTespitiDosyalari, baglantiliNoterlikDosyalari, arsivYeri: this.islemGorenDava.arsivYeri || '', notlar: '', muvekkilGorusmeNotlari: [], finansalIslemler: [], evraklar: [], islemGecmisi: [], takvimGecmisi: [] };
      y = this.dosyayaIslemKaydiEkle(y, 'dosya', 'Dava dosyası açıldı', `${noStr} referansıyla yeni kayıt oluşturuldu.`);
      if (y.durusmaTarihi) {
        y = this.dosyayaTakvimKaydiEkle(y, 'Duruşma', 'Planlandı', y.durusmaTarihi, y.durusmaSaati, 'İlk duruşma planı kaydedildi.');
        y = this.dosyayaIslemKaydiEkle(y, 'takvim', 'Duruşma takvimi oluşturuldu', this.formatTarihSaat(y.durusmaTarihi, y.durusmaSaati));
      }
      this.davaKaydetCloud(y, 'Yeni dava dosyası buluta eklendi.');
    } else {
      const mevcut = this.davalar.find(x => x.id === this.islemGorenDava.id);
      const durusmaDegisti = (mevcut?.durusmaTarihi || '') !== (this.islemGorenDava.durusmaTarihi || '') || (mevcut?.durusmaSaati || '') !== (this.islemGorenDava.durusmaSaati || '');
      let g = { ...this.islemGorenDava, dosyaNo: noStr, dosyaNumaralari: num, muvekkilId: birincilMuvekkil?.muvekkilId, muvekkiller, muvekkil, muvekkilPozisyonu, davacilar, davalilar, karsiTaraf, baglantiliIcraId: baglantiliIcraIds[0], baglantiliIcraIds, baglantiliArabuluculukIds, baglantiliTedbirDosyalari, baglantiliDelilTespitiDosyalari, baglantiliNoterlikDosyalari } as DavaDosyasi;
      if (durusmaDegisti) { g.durusmaTamamlandiMi = false; g.durusmaTamamlanmaTarihi = ''; }
      g = this.dosyayaIslemKaydiEkle(g, 'dosya', 'Dava dosyası güncellendi', this.davaGuncellemeOzeti(mevcut, g));
      if (durusmaDegisti) {
        if (g.durusmaTarihi) {
          g = this.dosyayaTakvimKaydiEkle(g, 'Duruşma', mevcut?.durusmaTarihi ? 'Güncellendi' : 'Planlandı', g.durusmaTarihi, g.durusmaSaati, this.takvimDegisimMetni(mevcut?.durusmaTarihi, mevcut?.durusmaSaati, g.durusmaTarihi, g.durusmaSaati));
          g = this.dosyayaIslemKaydiEkle(g, 'takvim', mevcut?.durusmaTarihi ? 'Duruşma takvimi güncellendi' : 'Duruşma takvimi oluşturuldu', this.takvimDegisimMetni(mevcut?.durusmaTarihi, mevcut?.durusmaSaati, g.durusmaTarihi, g.durusmaSaati));
        } else if (mevcut?.durusmaTarihi) {
          g = this.dosyayaTakvimKaydiEkle(g, 'Duruşma', 'Kaldırıldı', mevcut.durusmaTarihi, mevcut.durusmaSaati, 'Planlı duruşma ajandadan kaldırıldı.');
          g = this.dosyayaIslemKaydiEkle(g, 'takvim', 'Duruşma takvimi kaldırıldı', this.formatTarihSaat(mevcut.durusmaTarihi, mevcut.durusmaSaati));
        }
      }
      this.davaKaydetCloud(g, 'Dava dosyasındaki bilgiler güncellendi.');
    }
    this.davaFormKapat();
  }
  async durumGuncelle(d: DavaDosyasi, yD: string) {
    const oncekiKayit = this.veriKopyala(d);
    let k = { ...d };
    const oncekiDurum = k.durum;
    if (oncekiDurum === yD) return;
    k.durum = yD as any;
    if (k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = '';
    k = this.dosyayaIslemKaydiEkle(k, 'durum', 'Dava durumu güncellendi', `${oncekiDurum} -> ${yD}`);
    const kaydedildi = await this.davaKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Dava durum etiketi güncellendi',
      'Durum değişikliği kaydedildi.',
      () => this.davaKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Dava durum etiketi geri alındı',
      `${oncekiDurum} durumuna dönüldü.`
    );
  }
  async dosyaSil(id: number) {
    const silinen = this.davalar.find(d => d.id === id);
    if (!silinen) return;
    const silinenKopya = this.veriKopyala(silinen);
    const silindi = await this.davaSilCloud(id);
    if (!silindi) return;
    this.silinecekDavaId = null;
    this.geriAlinabilirBasariBildirimiGoster(
      'Dava dosyası kaldırıldı',
      'Kayıt listeden çıkarıldı.',
      () => this.davaKaydetCloud(this.veriKopyala(silinenKopya)),
      'Dava dosyası geri yüklendi',
      'Silinen dava dosyası yeniden listeye alındı.'
    );
  }

  icraFormunuAc(i?: IcraDosyasi) {
    this.formHata = '';
    this.icraMuvekkilDropdownAcik = false;
    this.icraMuvekkilArama = '';
    if (i) {
      this.formModu = 'duzenle';
      this.islemGorenIcra = { ...i };
      this.icraMuvekkilRolu = i.muvekkilRolu
        || ((i.alacakli || '').trim() === (i.muvekkil || '').trim() ? 'Alacaklı'
          : (i.borclu || '').trim() === (i.muvekkil || '').trim() ? 'Borçlu'
          : null);
    } 
    else {
      this.formModu = 'ekle';
      this.islemGorenIcra = { durum: 'Aktif', muvekkilId: undefined, takipTipi: 'İlamsız' };
      this.icraMuvekkilRolu = null;
    }
    this.icraFormAcik = true;
  }
  icraFormKapat() {
    this.icraFormAcik = false;
    this.icraMuvekkilDropdownAcik = false;
    this.icraMuvekkilArama = '';
    this.icraMuvekkilRolu = null;
  }
  
  icraKaydet() {
    if (!this.islemGorenIcra.icraDairesi || !this.islemGorenIcra.dosyaNo || !this.islemGorenIcra.muvekkilId || !this.icraMuvekkilRolu || !this.islemGorenIcra.takipTipi) { this.formHata = "Daire, Dosya No, Müvekkil, Müvekkil Rolü ve Takip Tipi zorunludur."; return; }
    
    this.islemGorenIcra.icraDairesi = this.formatMetin(this.islemGorenIcra.icraDairesi);
    this.islemGorenIcra.eskiMahkeme = this.formatMetin(this.islemGorenIcra.eskiMahkeme);
    this.islemGorenIcra.eskiEsasNo = this.formatMetin(this.islemGorenIcra.eskiEsasNo);
    this.islemGorenIcra.alacakli = this.formatMetin(this.islemGorenIcra.alacakli);
    this.islemGorenIcra.borclu = this.formatMetin(this.islemGorenIcra.borclu);
    this.islemGorenIcra.arsivYeri = this.formatMetin(this.islemGorenIcra.arsivYeri);

    const m = this.muvekkiller.find(x => x.id == this.islemGorenIcra.muvekkilId);
    if (this.formModu === 'ekle') {
      let y: IcraDosyasi = { id: Date.now(), icraDairesi: this.islemGorenIcra.icraDairesi || '', dosyaNo: this.islemGorenIcra.dosyaNo || '', eskiMahkeme: this.islemGorenIcra.eskiMahkeme || '', eskiEsasNo: this.islemGorenIcra.eskiEsasNo || '', muvekkilId: m?.id, muvekkil: m?.adSoyad || 'Bilinmiyor', muvekkilRolu: this.icraMuvekkilRolu, alacakli: this.islemGorenIcra.alacakli || '-', borclu: this.islemGorenIcra.borclu || '-', takipTipi: this.islemGorenIcra.takipTipi || '', takipTarihi: this.islemGorenIcra.takipTarihi || '', durum: this.islemGorenIcra.durum as any, baglantiliDavaId: this.islemGorenIcra.baglantiliDavaId, arsivYeri: this.islemGorenIcra.arsivYeri || '', vekaletUcreti: this.islemGorenIcra.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [], islemGecmisi: [], takvimGecmisi: [] };
      y = this.dosyayaIslemKaydiEkle(y, 'dosya', 'İcra dosyası açıldı', `${y.icraDairesi} / ${y.dosyaNo} referansıyla yeni takip oluşturuldu.`);
      this.icraKaydetCloud(y, 'Yeni icra dosyası buluta eklendi.');
    } else {
      let g = { ...this.islemGorenIcra, muvekkil: m?.adSoyad || this.islemGorenIcra.muvekkil, muvekkilRolu: this.icraMuvekkilRolu } as IcraDosyasi;
      const mevcut = this.icralar.find(x => x.id === this.islemGorenIcra.id);
      g = this.dosyayaIslemKaydiEkle(g, 'dosya', 'İcra dosyası güncellendi', this.icraGuncellemeOzeti(mevcut, g));
      this.icraKaydetCloud(g, 'İcra dosyasındaki bilgiler güncellendi.');
    }
    this.icraFormKapat();
  }
  async icraDurumGuncelle(i: IcraDosyasi, yD: string) {
    const oncekiKayit = this.veriKopyala(i);
    let k = { ...i };
    const oncekiDurum = k.durum;
    if (oncekiDurum === yD) return;
    k.durum = yD as any;
    k = this.dosyayaIslemKaydiEkle(k, 'durum', 'İcra durumu güncellendi', `${oncekiDurum} -> ${yD}`);
    const kaydedildi = await this.icraKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'İcra durumu güncellendi',
      'Durum değişikliği kaydedildi.',
      () => this.icraKaydetCloud(this.veriKopyala(oncekiKayit)),
      'İcra durumu geri alındı',
      `${oncekiDurum} durumuna dönüldü.`
    );
  }
  async icraSil(id: number) {
    const silinen = this.icralar.find(i => i.id === id);
    if (!silinen) return;
    const silinenKopya = this.veriKopyala(silinen);
    const silindi = await this.icraSilCloud(id);
    if (!silindi) return;
    this.silinecekIcraId = null;
    this.geriAlinabilirBasariBildirimiGoster(
      'İcra dosyası kaldırıldı',
      'Kayıt listeden çıkarıldı.',
      () => this.icraKaydetCloud(this.veriKopyala(silinenKopya)),
      'İcra dosyası geri yüklendi',
      'Silinen icra dosyası yeniden listeye alındı.'
    );
  }

  arabuluculukFormAc(a?: ArabuluculukDosyasi) {
    this.formHata = '';
    this.arabuluculukBasvuruKonusuOtomatikMi = false;
    this.hizliMuvekkilFormAcik = false;
    this.hizliMuvekkilKayitBaglami = 'arabuluculuk';
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
    this.arabuluculukMuvekkilDropdownAcik = false;
    this.arabuluculukMuvekkilArama = '';
    if (a) { 
      this.formModu = 'duzenle'; 
      this.islemGorenArabuluculuk = {
        ...a,
        hizmetUcretiStopajli: typeof a.hizmetUcretiStopajli === 'boolean' ? a.hizmetUcretiStopajli : this.getArabuluculukMakbuzTipOnerisi(a) === 'sirket',
        taksitleOdeme: !!a.taksitleOdeme,
        taksitSayisi: a.taksitSayisi || (a.taksitler || []).length || 0,
        taksitler: a.taksitleOdeme ? this.arabuluculukTaksitleriniHazirla(a.taksitler, a.taksitSayisi || (a.taksitler || []).length || 2) : [],
        taraflar: Array.isArray(a.taraflar) ? a.taraflar.map(t => this.adresKaydiNormalizeEt({...t})) : []
      }; 
    }
    else {
      this.formModu = 'ekle';
      this.islemGorenArabuluculuk = { durum: 'Hazırlık', sonuc: '', basvuruTuru: 'Dava Şartı', uyusmazlikTuru: 'İşçi İşveren', basvuruKonusu: '', anlasmaSartlari: '', iseGirisTarihi: '', istenCikisTarihi: '', odemeTarihi: '', odenecekToplamTutarRakamla: '', odenecekToplamTutarYaziyla: '', arabulucuUcretiTutari: '', arabulucuUcretiOdemeTarihi: '', kidemTazminatiTutari: '', kidemTazminatiOdemeTarihi: '', ihbarTazminatiTutari: '', ihbarTazminatiOdemeTarihi: '', yillikUcretliIzinTutari: '', yillikUcretliIzinOdemeTarihi: '', bakiyeUcretAlacagi: '', bakiyeUcretAlacagiOdemeTarihi: '', primAlacagi: '', primAlacagiOdemeTarihi: '', iseBaslatmamaVeBostaGecenSureAlacagi: '', iseBaslatmamaVeBostaGecenSureOdemeTarihi: '', ekOdeme: '', ekOdemeOdemeTarihi: '', taksitleOdeme: false, taksitSayisi: 0, taksitler: [], buro: 'İstanbul Anadolu', buroyaBasvuruTarihi: '', arabulucuGorevlendirmeTarihi: '', tutanakDuzenlemeTarihi: '', toplantiSaati: '', toplantiTamamlandiMi: false, hizmetUcretiStopajli: true, taraflar: [this.arabuluculukTarafBosOlustur('Başvurucu', Date.now()), this.arabuluculukTarafBosOlustur('Diğer Taraf', Date.now() + 1)] };
      this.arabuluculukUyusmazlikTuruDegisti(this.islemGorenArabuluculuk.uyusmazlikTuru as ArabuluculukDosyasi['uyusmazlikTuru']);
    }
    this.arabuluculukTarafAramalariniHazirla(this.islemGorenArabuluculuk.taraflar);
    this.arabuluculukFormAcik = true;
  }
  arabuluculukFormKapat() {
    this.arabuluculukFormAcik = false;
    this.arabuluculukBasvuruKonusuOtomatikMi = false;
    this.arabuluculukMuvekkilDropdownAcik = false;
    this.arabuluculukMuvekkilArama = '';
    this.arabuluculukTarafAramalariniHazirla();
    this.hizliMuvekkilFormAcik = false;
    this.hizliMuvekkilKayitBaglami = 'dava';
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
  }
  arabuluculukUyusmazlikTuruDegisti(tur: ArabuluculukDosyasi['uyusmazlikTuru']) {
    this.islemGorenArabuluculuk.uyusmazlikTuru = tur;
    if (this.formModu !== 'ekle') return;
    const mevcutMetin = (this.islemGorenArabuluculuk.basvuruKonusu || '').trim();
    const otomatikMetin = this.isciIsverenVarsayilanBasvuruKonusu.trim();
    const otomatikAlanKullaniliyor = this.arabuluculukBasvuruKonusuOtomatikMi || mevcutMetin === otomatikMetin;

    if (tur === 'İşçi İşveren') {
      if (!mevcutMetin || otomatikAlanKullaniliyor) {
        this.islemGorenArabuluculuk.basvuruKonusu = this.isciIsverenVarsayilanBasvuruKonusu;
        this.arabuluculukBasvuruKonusuOtomatikMi = true;
      }
      return;
    }

    if (otomatikAlanKullaniliyor) {
      this.islemGorenArabuluculuk.basvuruKonusu = '';
      this.arabuluculukBasvuruKonusuOtomatikMi = false;
    }
  }
  arabuluculukBasvuruKonusuDegisti(metin: string) {
    this.islemGorenArabuluculuk.basvuruKonusu = metin;
    this.arabuluculukBasvuruKonusuOtomatikMi = (metin || '').trim() === this.isciIsverenVarsayilanBasvuruKonusu.trim();
  }
  arabuluculukDosyasiIsciIsverenMi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return (dosya?.uyusmazlikTuru || '') === 'İşçi İşveren';
  }
  tarafEkle() {
    if (!this.islemGorenArabuluculuk.taraflar) this.islemGorenArabuluculuk.taraflar = [];
    const yeniTaraf = this.arabuluculukTarafBosOlustur();
    this.islemGorenArabuluculuk.taraflar.push(yeniTaraf);
    this.arabuluculukTarafAramaMetinleri[yeniTaraf.id] = '';
    this.arabuluculukTarafVekilAramaMetinleri[yeniTaraf.id] = '';
  }
  tarafSil(i: number) {
    if (!this.islemGorenArabuluculuk.taraflar) return;
    const silinen = this.islemGorenArabuluculuk.taraflar[i];
    if (silinen) {
      delete this.arabuluculukTarafAramaMetinleri[silinen.id];
      delete this.arabuluculukTarafVekilAramaMetinleri[silinen.id];
    }
    this.islemGorenArabuluculuk.taraflar.splice(i, 1);
  }
  arabuluculukKaydet() {
    const t = this.arabuluculukTaraflariniHazirla(this.islemGorenArabuluculuk.taraflar);
    const isDavaSarti = this.islemGorenArabuluculuk.basvuruTuru === 'Dava Şartı';
    if ((isDavaSarti && !this.islemGorenArabuluculuk.buroNo) || !this.islemGorenArabuluculuk.arabuluculukNo || !this.islemGorenArabuluculuk.buro || !this.islemGorenArabuluculuk.buroyaBasvuruTarihi || !this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || t.length === 0 || !this.islemGorenArabuluculuk.muvekkilId) { this.formHata = "Zorunlu alanları, büroya başvuru ve görevlendirme tarihlerini, taraf ismini ve Hesap Muhatabını doldurun."; return; }
    
    this.islemGorenArabuluculuk.buro = this.formatMetin(this.islemGorenArabuluculuk.buro);
    this.islemGorenArabuluculuk.basvuruKonusu = this.formatMetin(this.islemGorenArabuluculuk.basvuruKonusu);
    this.islemGorenArabuluculuk.arsivYeri = this.formatMetin(this.islemGorenArabuluculuk.arsivYeri);
    this.arabuluculukOdemeAlanlariniHazirla(this.islemGorenArabuluculuk);

    const ortakOdemeAlanlari = {
      anlasmaSartlari: this.islemGorenArabuluculuk.anlasmaSartlari || '',
      iseGirisTarihi: this.islemGorenArabuluculuk.iseGirisTarihi || '',
      istenCikisTarihi: this.islemGorenArabuluculuk.istenCikisTarihi || '',
      odemeTarihi: this.islemGorenArabuluculuk.odemeTarihi || '',
      odenecekToplamTutarRakamla: this.islemGorenArabuluculuk.odenecekToplamTutarRakamla || '',
      odenecekToplamTutarYaziyla: this.islemGorenArabuluculuk.odenecekToplamTutarYaziyla || '',
      arabulucuUcretiTutari: this.islemGorenArabuluculuk.arabulucuUcretiTutari || '',
      arabulucuUcretiOdemeTarihi: this.islemGorenArabuluculuk.arabulucuUcretiOdemeTarihi || '',
      kidemTazminatiTutari: this.islemGorenArabuluculuk.kidemTazminatiTutari || '',
      kidemTazminatiOdemeTarihi: this.islemGorenArabuluculuk.kidemTazminatiOdemeTarihi || '',
      ihbarTazminatiTutari: this.islemGorenArabuluculuk.ihbarTazminatiTutari || '',
      ihbarTazminatiOdemeTarihi: this.islemGorenArabuluculuk.ihbarTazminatiOdemeTarihi || '',
      yillikUcretliIzinTutari: this.islemGorenArabuluculuk.yillikUcretliIzinTutari || '',
      yillikUcretliIzinOdemeTarihi: this.islemGorenArabuluculuk.yillikUcretliIzinOdemeTarihi || '',
      bakiyeUcretAlacagi: this.islemGorenArabuluculuk.bakiyeUcretAlacagi || '',
      bakiyeUcretAlacagiOdemeTarihi: this.islemGorenArabuluculuk.bakiyeUcretAlacagiOdemeTarihi || '',
      primAlacagi: this.islemGorenArabuluculuk.primAlacagi || '',
      primAlacagiOdemeTarihi: this.islemGorenArabuluculuk.primAlacagiOdemeTarihi || '',
      iseBaslatmamaVeBostaGecenSureAlacagi: this.islemGorenArabuluculuk.iseBaslatmamaVeBostaGecenSureAlacagi || '',
      iseBaslatmamaVeBostaGecenSureOdemeTarihi: this.islemGorenArabuluculuk.iseBaslatmamaVeBostaGecenSureOdemeTarihi || '',
      ekOdeme: this.islemGorenArabuluculuk.ekOdeme || '',
      ekOdemeOdemeTarihi: this.islemGorenArabuluculuk.ekOdemeOdemeTarihi || '',
      taksitleOdeme: !!this.islemGorenArabuluculuk.taksitleOdeme,
      taksitSayisi: this.islemGorenArabuluculuk.taksitSayisi || 0,
      taksitler: this.islemGorenArabuluculuk.taksitleOdeme ? this.arabuluculukTaksitleriniHazirla(this.islemGorenArabuluculuk.taksitler, this.islemGorenArabuluculuk.taksitSayisi) : []
    };

    if (this.formModu === 'ekle') {
      let y: ArabuluculukDosyasi = { id: Date.now(), buroNo: this.islemGorenArabuluculuk.buroNo || '', arabuluculukNo: this.islemGorenArabuluculuk.arabuluculukNo || '', buro: this.islemGorenArabuluculuk.buro || '', basvuruTuru: this.islemGorenArabuluculuk.basvuruTuru as any, uyusmazlikTuru: this.islemGorenArabuluculuk.uyusmazlikTuru as any, basvuruKonusu: this.islemGorenArabuluculuk.basvuruKonusu || '', sonuc: this.getArabuluculukSonucu(this.islemGorenArabuluculuk), ...ortakOdemeAlanlari, taraflar: t, muvekkilId: this.islemGorenArabuluculuk.muvekkilId, buroyaBasvuruTarihi: this.islemGorenArabuluculuk.buroyaBasvuruTarihi || '', arabulucuGorevlendirmeTarihi: this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || '', tutanakDuzenlemeTarihi: this.islemGorenArabuluculuk.tutanakDuzenlemeTarihi || '', toplantiTarihi: this.islemGorenArabuluculuk.toplantiTarihi, toplantiSaati: this.islemGorenArabuluculuk.toplantiSaati || '', toplantiTamamlandiMi: false, toplantiTamamlanmaTarihi: '', toplantiYontemi: this.islemGorenArabuluculuk.toplantiYontemi, durum: this.islemGorenArabuluculuk.durum as any, arsivYeri: this.islemGorenArabuluculuk.arsivYeri || '', vekaletUcreti: this.islemGorenArabuluculuk.vekaletUcreti || 0, hizmetUcretiStopajli: !!this.islemGorenArabuluculuk.hizmetUcretiStopajli, notlar: '', finansalIslemler: [], evraklar: [], islemGecmisi: [], takvimGecmisi: [] };
      y = this.dosyayaIslemKaydiEkle(y, 'dosya', 'Arabuluculuk dosyası açıldı', `${y.arabuluculukNo} referansıyla yeni arabuluculuk kaydı oluşturuldu.`);
      if (y.toplantiTarihi) {
        y = this.dosyayaTakvimKaydiEkle(y, 'Toplantı', 'Planlandı', y.toplantiTarihi, y.toplantiSaati, 'İlk toplantı planı kaydedildi.');
        y = this.dosyayaIslemKaydiEkle(y, 'takvim', 'Toplantı takvimi oluşturuldu', this.formatTarihSaat(y.toplantiTarihi, y.toplantiSaati));
      }
      this.arabuluculukKaydetCloud(y, 'Yeni arabuluculuk dosyası buluta eklendi.');
    } else {
      const mevcut = this.arabuluculukDosyalar.find(x => x.id === this.islemGorenArabuluculuk.id);
      const toplantiDegisti = (mevcut?.toplantiTarihi || '') !== (this.islemGorenArabuluculuk.toplantiTarihi || '') || (mevcut?.toplantiSaati || '') !== (this.islemGorenArabuluculuk.toplantiSaati || '');
      let g = { ...this.islemGorenArabuluculuk, buroNo: this.islemGorenArabuluculuk.buroNo || '', basvuruKonusu: this.islemGorenArabuluculuk.basvuruKonusu || '', sonuc: this.getArabuluculukSonucu(this.islemGorenArabuluculuk), ...ortakOdemeAlanlari, buroyaBasvuruTarihi: this.islemGorenArabuluculuk.buroyaBasvuruTarihi || '', arabulucuGorevlendirmeTarihi: this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || '', tutanakDuzenlemeTarihi: this.islemGorenArabuluculuk.tutanakDuzenlemeTarihi || '', hizmetUcretiStopajli: !!this.islemGorenArabuluculuk.hizmetUcretiStopajli, taraflar: t } as ArabuluculukDosyasi;
      if (toplantiDegisti) { g.toplantiTamamlandiMi = false; g.toplantiTamamlanmaTarihi = ''; }
      g = this.dosyayaIslemKaydiEkle(g, 'dosya', 'Arabuluculuk dosyası güncellendi', this.arabuluculukGuncellemeOzeti(mevcut, g));
      if (toplantiDegisti) {
        if (g.toplantiTarihi) {
          g = this.dosyayaTakvimKaydiEkle(g, 'Toplantı', mevcut?.toplantiTarihi ? 'Güncellendi' : 'Planlandı', g.toplantiTarihi, g.toplantiSaati, this.takvimDegisimMetni(mevcut?.toplantiTarihi, mevcut?.toplantiSaati, g.toplantiTarihi, g.toplantiSaati));
          g = this.dosyayaIslemKaydiEkle(g, 'takvim', mevcut?.toplantiTarihi ? 'Toplantı takvimi güncellendi' : 'Toplantı takvimi oluşturuldu', this.takvimDegisimMetni(mevcut?.toplantiTarihi, mevcut?.toplantiSaati, g.toplantiTarihi, g.toplantiSaati));
        } else if (mevcut?.toplantiTarihi) {
          g = this.dosyayaTakvimKaydiEkle(g, 'Toplantı', 'Kaldırıldı', mevcut.toplantiTarihi, mevcut.toplantiSaati, 'Planlı toplantı ajandadan kaldırıldı.');
          g = this.dosyayaIslemKaydiEkle(g, 'takvim', 'Toplantı takvimi kaldırıldı', this.formatTarihSaat(mevcut.toplantiTarihi, mevcut.toplantiSaati));
        }
      }
      this.arabuluculukKaydetCloud(g, 'Arabuluculuk dosyasındaki bilgiler güncellendi.');
    }
    this.arabuluculukFormKapat();
  }
  async arabuluculukDurumGuncelle(a: ArabuluculukDosyasi, yD: string) {
    const oncekiKayit = this.veriKopyala(a);
    let k = { ...a };
    const oncekiDurum = k.durum;
    if (oncekiDurum === yD) return;
    k.durum = yD as any;
    k = this.dosyayaIslemKaydiEkle(k, 'durum', 'Arabuluculuk durumu güncellendi', `${oncekiDurum} -> ${yD}`);
    const kaydedildi = await this.arabuluculukKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Arabuluculuk durumu güncellendi',
      'Durum değişikliği kaydedildi.',
      () => this.arabuluculukKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Arabuluculuk durumu geri alındı',
      `${oncekiDurum} durumuna dönüldü.`
    );
  }
  async arabuluculukSil(id: number) {
    const silinen = this.arabuluculukDosyalar.find(a => a.id === id);
    if (!silinen) return;
    const silinenKopya = this.veriKopyala(silinen);
    const silindi = await this.arabuluculukSilCloud(id);
    if (!silindi) return;
    this.silinecekArabuluculukId = null;
    this.geriAlinabilirBasariBildirimiGoster(
      'Arabuluculuk dosyası kaldırıldı',
      'Kayıt listeden çıkarıldı.',
      () => this.arabuluculukKaydetCloud(this.veriKopyala(silinenKopya)),
      'Arabuluculuk dosyası geri yüklendi',
      'Silinen arabuluculuk dosyası yeniden listeye alındı.'
    );
  }

  muvekkilFormunuAc(m?: Muvekkil) { 
    this.formHata = ''; this.formModu = m ? 'duzenle' : 'ekle'; 
    this.islemGorenMuvekkil = m
      ? this.adresKaydiNormalizeEt({ ...m, yetkililer: Array.isArray(m.yetkililer) ? m.yetkililer.map(y => ({...y})) : [] })
      : { tip: this.aktifIliskiSekmesi, adres: '', il: '', ilce: '', acikAdres: '', yetkililer: [] }; 
    this.muvekkilFormAcik = true; 
  }
  muvekkilFormKapat() { this.muvekkilFormAcik = false; this.yetkiliSecimDropdownAcik = false; this.yetkiliSecimArama = ''; }
  hizliMuvekkilKaydiAc(hedef: 'dava' | 'arabuluculuk' = 'dava') {
    this.formHata = '';
    this.hizliMuvekkilKayitBaglami = hedef;
    this.hizliMuvekkilFormAcik = true;
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
    if (hedef === 'arabuluculuk') this.arabuluculukMuvekkilDropdownAcik = false;
  }
  hizliMuvekkilKaydiIptal() {
    this.hizliMuvekkilFormAcik = false;
    this.hizliMuvekkilKayitBaglami = 'dava';
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
  }
  hizliMuvekkilKaydet() {
    if (!this.hizliMuvekkilKaydi.adSoyad || !this.hizliMuvekkilKaydi.tip) { this.formHata = 'Hızlı müvekkil kaydı için tip ve ad soyad / unvan zorunludur.'; return; }
    const adSoyad = this.formatMetin(this.hizliMuvekkilKaydi.adSoyad) || '';
    const yeni: Muvekkil = {
      id: Date.now(),
      tip: this.hizliMuvekkilKaydi.tip as any,
      _isNewDiger: this.hizliMuvekkilKaydi.tip === 'Diğer',
      adSoyad,
      tcKimlik: this.hizliMuvekkilKaydi.tcKimlik || '',
      telefon: this.hizliMuvekkilKaydi.telefon || '',
      eposta: this.hizliMuvekkilKaydi.eposta || '',
      adres: '',
      il: '',
      ilce: '',
      acikAdres: '',
      bankaBilgileri: '',
      vergiDairesi: '',
      vekaletnameUrl: '',
      yetkililer: []
    };
    const basariMesaji = this.hizliMuvekkilKayitBaglami === 'arabuluculuk'
      ? 'Yeni kişi veya kurum arabuluculuk ekranından oluşturuldu.'
      : 'Yeni müvekkil dava ekranından oluşturuldu.';
    this.muvekkilKaydetCloud(yeni, basariMesaji);
    if (this.hizliMuvekkilKayitBaglami === 'arabuluculuk') {
      this.islemGorenArabuluculuk.muvekkilId = yeni.id;
      this.arabuluculukMuvekkilDropdownAcik = false;
      this.arabuluculukMuvekkilArama = '';
    } else {
      if (!this.islemGorenDava.muvekkiller) this.islemGorenDava.muvekkiller = [];
      const bosKayit = this.islemGorenDava.muvekkiller.find(kayit => !kayit.muvekkilId && !(kayit.isim || '').trim());
      if (bosKayit) {
        bosKayit.muvekkilId = yeni.id;
        bosKayit.isim = adSoyad;
      } else {
        this.islemGorenDava.muvekkiller.push({ id: Date.now() + 1, isim: adSoyad, muvekkilId: yeni.id });
      }
      const hazirMuvekkiller = this.davaMuvekkilleriniHazirla(this.islemGorenDava.muvekkiller);
      this.islemGorenDava.muvekkilId = hazirMuvekkiller[0]?.muvekkilId;
      this.islemGorenDava.muvekkil = hazirMuvekkiller.map(kayit => kayit.isim).join(', ');
    }
    this.formHata = '';
    this.hizliMuvekkilKaydiIptal();
  }
  yetkiliEkle() { if (!this.islemGorenMuvekkil.yetkililer) this.islemGorenMuvekkil.yetkililer = []; this.islemGorenMuvekkil.yetkililer.push({ id: Date.now(), adSoyad: '', telefon: '', eposta: '', pozisyon: '' }); }
  kayitliYetkiliEkle(m: Muvekkil) {
    if (!this.islemGorenMuvekkil.yetkililer) this.islemGorenMuvekkil.yetkililer = [];
    this.islemGorenMuvekkil.yetkililer.push({ id: Date.now(), adSoyad: m.adSoyad || '', telefon: m.telefon || '', eposta: m.eposta || '', pozisyon: '' });
    this.yetkiliSecimDropdownAcik = false;
    this.yetkiliSecimArama = '';
  }
  yetkiliSil(i: number) { if (this.islemGorenMuvekkil.yetkililer) this.islemGorenMuvekkil.yetkililer.splice(i, 1); }
  muvekkilKaydet() {
    const oncekiMuvekkil = this.formModu === 'duzenle' ? this.muvekkiller.find(m => m.id === this.islemGorenMuvekkil.id) : undefined;
    if (!this.islemGorenMuvekkil.adSoyad || !this.islemGorenMuvekkil.tip) { this.formHata = "İsim ve Kayıt Tipi zorunludur."; return; }
    const yList = (this.islemGorenMuvekkil.yetkililer || []).filter(y => y.adSoyad && y.adSoyad.trim() !== '');
    
    this.islemGorenMuvekkil.adSoyad = this.formatMetin(this.islemGorenMuvekkil.adSoyad);
    const adres = this.adresBilesenleriniHazirla(this.islemGorenMuvekkil);
    this.islemGorenMuvekkil.il = adres.il;
    this.islemGorenMuvekkil.ilce = adres.ilce;
    this.islemGorenMuvekkil.acikAdres = adres.acikAdres;
    this.islemGorenMuvekkil.adres = adres.adres;
    this.islemGorenMuvekkil.vergiDairesi = this.formatMetin(this.islemGorenMuvekkil.vergiDairesi);
    yList.forEach(y => {
       y.adSoyad = this.formatMetin(y.adSoyad);
       y.pozisyon = this.formatMetin(y.pozisyon);
    });

    let vUrl = this.islemGorenMuvekkil.vekaletnameUrl ? this.islemGorenMuvekkil.vekaletnameUrl.trim() : '';
    if (vUrl && !/^https?:\/\//i.test(vUrl)) vUrl = 'https://' + vUrl;

    if (this.formModu === 'ekle') {
      const y: Muvekkil = { id: Date.now(), tip: this.islemGorenMuvekkil.tip as any, _isNewDiger: this.islemGorenMuvekkil.tip === 'Diğer', adSoyad: this.islemGorenMuvekkil.adSoyad || '', tcKimlik: this.islemGorenMuvekkil.tcKimlik || '', telefon: this.islemGorenMuvekkil.telefon || '', eposta: this.islemGorenMuvekkil.eposta || '', adres: this.islemGorenMuvekkil.adres || '', il: this.islemGorenMuvekkil.il || '', ilce: this.islemGorenMuvekkil.ilce || '', acikAdres: this.islemGorenMuvekkil.acikAdres || '', bankaBilgileri: this.islemGorenMuvekkil.bankaBilgileri || '', vergiDairesi: this.islemGorenMuvekkil.vergiDairesi || '', vekaletnameUrl: vUrl, yetkililer: yList };
      this.muvekkilKaydetCloud(y, 'Yeni kişi veya kurum kaydı oluşturuldu.');
    } else {
      const g = { ...this.islemGorenMuvekkil, yetkililer: yList, adSoyad: this.islemGorenMuvekkil.adSoyad || '', _isNewDiger: this.islemGorenMuvekkil.tip === 'Diğer', vekaletnameUrl: vUrl } as Muvekkil;
      this.muvekkilKaydetCloud(g, 'Kişi veya kurum bilgileri güncellendi.');
      this.davalar.forEach(d => {
        let degisti = false;
        const muvekkilKayitlari = this.davaTarafListesiKopyala(d.muvekkiller);
        muvekkilKayitlari.forEach(kayit => {
          if (kayit.muvekkilId === g.id || (!kayit.muvekkilId && this.metinEsit(kayit.isim, oncekiMuvekkil?.adSoyad))) {
            kayit.muvekkilId = g.id;
            kayit.isim = g.adSoyad!;
            degisti = true;
          }
        });
        (d.davacilar || []).forEach(taraf => {
          if (taraf.muvekkilId === g.id || (!taraf.muvekkilId && this.metinEsit(taraf.isim, oncekiMuvekkil?.adSoyad))) {
            taraf.muvekkilId = g.id;
            taraf.isim = g.adSoyad!;
            degisti = true;
          }
        });
        (d.davalilar || []).forEach(taraf => {
          if (taraf.muvekkilId === g.id || (!taraf.muvekkilId && this.metinEsit(taraf.isim, oncekiMuvekkil?.adSoyad))) {
            taraf.muvekkilId = g.id;
            taraf.isim = g.adSoyad!;
            degisti = true;
          }
        });
        if (d.muvekkilId === g.id || this.metinEsit(d.muvekkil, oncekiMuvekkil?.adSoyad)) {
          degisti = true;
        }
        if (degisti) {
          if (!muvekkilKayitlari.length) {
            muvekkilKayitlari.push({ id: Date.now(), isim: g.adSoyad!, muvekkilId: g.id });
          }
          const hazirMuvekkiller = this.davaMuvekkilleriniHazirla(muvekkilKayitlari);
          d.muvekkiller = hazirMuvekkiller;
          d.muvekkilId = hazirMuvekkiller[0]?.muvekkilId;
          d.muvekkil = hazirMuvekkiller.map(kayit => kayit.isim).join(', ') || g.adSoyad!;
          d.karsiTaraf = this.getDavaKarsiTarafOzet(d);
          this.davaKaydetCloud(d);
        }
      });
      this.icralar.forEach(i => { if(i.muvekkilId === g.id && i.muvekkil !== g.adSoyad) { i.muvekkil = g.adSoyad!; this.icraKaydetCloud(i); }});
    }
    this.muvekkilFormKapat();
  }
  async muvekkilSil(id: number) {
    if (this.davalar.some(d => d.muvekkilId === id || (d.muvekkiller || []).some(kayit => kayit.muvekkilId === id)) || this.icralar.some(i => i.muvekkilId === id) || this.arabuluculukDosyalar.some(a => a.muvekkilId === id)) { this.bildirimGoster('error', 'Kayıt silinemedi', 'Bu kişi veya kuruma bağlı aktif dosyalar bulunduğu için önce dosyaları temizlemeniz gerekiyor.'); return; }
    const silinen = this.muvekkiller.find(m => m.id === id);
    if (!silinen) return;
    const silinenKopya = this.veriKopyala(silinen);
    const silindi = await this.muvekkilSilCloud(id);
    if (!silindi) return;
    this.silinecekMuvekkilId = null;
    this.geriAlinabilirBasariBildirimiGoster(
      'Kişi veya kurum kaydı silindi',
      'Kayıt listeden çıkarıldı.',
      () => this.muvekkilKaydetCloud(this.veriKopyala(silinenKopya)),
      'Kişi veya kurum kaydı geri yüklendi',
      'Silinen ilişki kaydı yeniden listeye alındı.'
    );
  }

  aktifDosyaKaydet(dosya: any, basariMesaji?: string) {
    return this.aktifDetayKaydetFonksiyonu()(dosya, basariMesaji);
  }
  async aktifDosyaDurumGuncelle(yD: string) {
    if (!this.aktifDosya) return;
    const oncekiKayit = this.veriKopyala(this.aktifDosya);
    const kaydetFonk = this.aktifDetayKaydetFonksiyonu();
    let k: any = { ...this.aktifDosya };
    const oncekiDurum = k.durum;
    if (oncekiDurum === yD) return;
    k.durum = yD;
    if (this.aktifSayfa === 'detay' && k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = '';
    k = this.dosyayaIslemKaydiEkle(k, 'durum', 'Dosya durumu kaydedildi', `${oncekiDurum} -> ${yD}`);
    const kaydedildi = await kaydetFonk(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Dosya durumu kaydedildi',
      'Durum değişikliği uygulandı.',
      () => kaydetFonk(this.veriKopyala(oncekiKayit)),
      'Dosya durumu geri alındı',
      `${oncekiDurum} durumuna dönüldü.`
    );
  }
  async durusmaTamamlandiIsaretle(dava: DavaDosyasi, event?: Event) {
    event?.stopPropagation();
    const oncekiKayit = this.veriKopyala(dava);
    const tamamlanmaTarihi = new Date().toISOString();
    let k = { ...dava, durusmaTamamlandiMi: true, durusmaTamamlanmaTarihi: tamamlanmaTarihi };
    k = this.dosyayaTakvimKaydiEkle(k, 'Duruşma', 'Gerçekleşti', dava.durusmaTarihi, dava.durusmaSaati, 'Duruşma gerçekleşti olarak işlendi.', tamamlanmaTarihi);
    k = this.dosyayaIslemKaydiEkle(k, 'takvim', 'Duruşma gerçekleşti olarak işlendi', this.formatTarihSaat(dava.durusmaTarihi, dava.durusmaSaati), tamamlanmaTarihi);
    const kaydedildi = await this.davaKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Duruşma tamamlandı olarak işlendi',
      'Ajanda kaydı kapatıldı.',
      () => this.davaKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Duruşma kaydı geri alındı',
      'Duruşma yeniden önceki takvim durumuna döndürüldü.'
    );
  }
  async durusmaAjandayaGeriAl(dava: DavaDosyasi, event?: Event) {
    event?.stopPropagation();
    const oncekiKayit = this.veriKopyala(dava);
    let k = { ...dava, durusmaTamamlandiMi: false, durusmaTamamlanmaTarihi: '' };
    k = this.dosyayaTakvimKaydiEkle(k, 'Duruşma', 'Ajandaya Geri Alındı', dava.durusmaTarihi, dava.durusmaSaati, 'Duruşma yeniden aktif ajandaya alındı.');
    k = this.dosyayaIslemKaydiEkle(k, 'takvim', 'Duruşma ajandaya geri alındı', this.formatTarihSaat(dava.durusmaTarihi, dava.durusmaSaati));
    const kaydedildi = await this.davaKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Duruşma yeniden ajandaya alındı',
      'Takvim kaydı tekrar aktif hale getirildi.',
      () => this.davaKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Duruşma ajanda değişikliği geri alındı',
      'Duruşma önceki tamamlanma durumuna döndürüldü.'
    );
  }
  async toplantiTamamlandiIsaretle(arabuluculuk: ArabuluculukDosyasi, event?: Event) {
    event?.stopPropagation();
    const oncekiKayit = this.veriKopyala(arabuluculuk);
    const tamamlanmaTarihi = new Date().toISOString();
    let k = { ...arabuluculuk, toplantiTamamlandiMi: true, toplantiTamamlanmaTarihi: tamamlanmaTarihi };
    k = this.dosyayaTakvimKaydiEkle(k, 'Toplantı', 'Gerçekleşti', arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati, 'Toplantı gerçekleşti olarak işlendi.', tamamlanmaTarihi);
    k = this.dosyayaIslemKaydiEkle(k, 'takvim', 'Toplantı gerçekleşti olarak işlendi', this.formatTarihSaat(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati), tamamlanmaTarihi);
    const kaydedildi = await this.arabuluculukKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Toplantı tamamlandı olarak işlendi',
      'Ajanda kaydı kapatıldı.',
      () => this.arabuluculukKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Toplantı kaydı geri alındı',
      'Toplantı yeniden önceki takvim durumuna döndürüldü.'
    );
  }
  async toplantiAjandayaGeriAl(arabuluculuk: ArabuluculukDosyasi, event?: Event) {
    event?.stopPropagation();
    const oncekiKayit = this.veriKopyala(arabuluculuk);
    let k = { ...arabuluculuk, toplantiTamamlandiMi: false, toplantiTamamlanmaTarihi: '' };
    k = this.dosyayaTakvimKaydiEkle(k, 'Toplantı', 'Ajandaya Geri Alındı', arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati, 'Toplantı yeniden aktif ajandaya alındı.');
    k = this.dosyayaIslemKaydiEkle(k, 'takvim', 'Toplantı ajandaya geri alındı', this.formatTarihSaat(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati));
    const kaydedildi = await this.arabuluculukKaydetCloud(k);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Toplantı yeniden ajandaya alındı',
      'Takvim kaydı tekrar aktif hale getirildi.',
      () => this.arabuluculukKaydetCloud(this.veriKopyala(oncekiKayit)),
      'Toplantı ajanda değişikliği geri alındı',
      'Toplantı önceki tamamlanma durumuna döndürüldü.'
    );
  }
  evrakKaydiniGuncelle(evraklar: EvrakBaglantisi[] | undefined, evrakId: number, updater: (evrak: EvrakBaglantisi) => void): boolean {
    if (!evraklar) return false;
    for (const evrak of evraklar) {
      if (evrak.id === evrakId) { updater(evrak); return true; }
      if (this.evrakKaydiniGuncelle(evrak.ekler, evrakId, updater)) return true;
    }
    return false;
  }
  evrakGorevFormunuAc(evrakId: number) {
    this.acikEvrakGorevFormlari[evrakId] = true;
    this.yeniEvrakGorevMetinleri[evrakId] = this.yeniEvrakGorevMetinleri[evrakId] || '';
    if (this.duzenlenenEvrakGorevi?.evrakId !== evrakId) this.duzenlenenEvrakGorevi = null;
  }
  evrakGorevFormunuKapat(evrakId: number) {
    this.acikEvrakGorevFormlari[evrakId] = false;
    this.yeniEvrakGorevMetinleri[evrakId] = '';
    if (this.duzenlenenEvrakGorevi?.evrakId === evrakId) this.duzenlenenEvrakGorevi = null;
  }
  async evrakGoreviEkle(evrakId: number) {
    if (!this.aktifDosya) return;
    const metin = this.formatMetin(this.yeniEvrakGorevMetinleri[evrakId])?.trim();
    if (!metin) return;
    const k: any = this.veriKopyala(this.aktifDosya);
    let evrakIsmi = 'Evrak';
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, evrakId, (evrak) => {
      evrakIsmi = evrak.isim || evrakIsmi;
      if (!evrak.gorevler) evrak.gorevler = [];
      evrak.gorevler.push({ id: Date.now(), metin, tamamlandiMi: false, tamamlanmaTarihi: '' });
    });
    if (!bulundu) return;
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak görevi eklendi', `${evrakIsmi}: ${metin}`);
    const kaydedildi = await this.aktifDosyaKaydet(kayitli, 'Evrak görevi eklendi.');
    if (!kaydedildi) return;
    this.yeniEvrakGorevMetinleri[evrakId] = '';
    this.acikEvrakGorevFormlari[evrakId] = false;
  }
  evrakGoreviDuzenleBaslat(evrakId: number, gorev: EvrakGorevi) {
    this.acikEvrakGorevFormlari[evrakId] = true;
    this.yeniEvrakGorevMetinleri[evrakId] = '';
    this.duzenlenenEvrakGorevi = { evrakId, gorevId: gorev.id, metin: gorev.metin || '' };
  }
  evrakGoreviDuzenlemeIptal() {
    this.duzenlenenEvrakGorevi = null;
  }
  async evrakGoreviDuzenlemeKaydet() {
    if (!this.aktifDosya || !this.duzenlenenEvrakGorevi) return;
    const duzenleme = this.duzenlenenEvrakGorevi;
    const metin = this.formatMetin(duzenleme.metin)?.trim();
    if (!metin) return;
    const k: any = this.veriKopyala(this.aktifDosya);
    let evrakIsmi = 'Evrak';
    let gorevBulundu = false;
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, duzenleme.evrakId, (evrak) => {
      evrakIsmi = evrak.isim || evrakIsmi;
      const gorev = (evrak.gorevler || []).find((item) => item.id === duzenleme.gorevId);
      if (!gorev) return;
      gorev.metin = metin;
      gorevBulundu = true;
    });
    if (!bulundu || !gorevBulundu) return;
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak görevi güncellendi', `${evrakIsmi}: ${metin}`);
    const kaydedildi = await this.aktifDosyaKaydet(kayitli, 'Evrak görevi güncellendi.');
    if (!kaydedildi) return;
    this.duzenlenenEvrakGorevi = null;
    this.acikEvrakGorevFormlari[duzenleme.evrakId] = false;
  }
  async evrakGoreviSil(evrakId: number, gorevId: number) {
    if (!this.aktifDosya) return;
    const oncekiKayit = this.veriKopyala(this.aktifDosya);
    const kaydetFonk = this.aktifDetayKaydetFonksiyonu();
    const k: any = this.veriKopyala(this.aktifDosya);
    let evrakIsmi = 'Evrak';
    let gorevMetni = 'Görev';
    let silindi = false;
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, evrakId, (evrak) => {
      evrakIsmi = evrak.isim || evrakIsmi;
      const gorev = (evrak.gorevler || []).find((item) => item.id === gorevId);
      if (!gorev) return;
      gorevMetni = gorev.metin || gorevMetni;
      evrak.gorevler = (evrak.gorevler || []).filter((item) => item.id !== gorevId);
      silindi = true;
    });
    if (!bulundu || !silindi) return;
    if (this.duzenlenenEvrakGorevi?.evrakId === evrakId && this.duzenlenenEvrakGorevi.gorevId === gorevId) {
      this.duzenlenenEvrakGorevi = null;
    }
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak görevi silindi', `${evrakIsmi}: ${gorevMetni}`);
    const kaydedildi = await kaydetFonk(kayitli as any);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Evrak görevi silindi',
      'Görev evrak listesinden kaldırıldı.',
      () => kaydetFonk(this.veriKopyala(oncekiKayit) as any),
      'Evrak görevi geri yüklendi',
      'Silinen görev tekrar evrakın altına eklendi.'
    );
  }
  evrakGoreviDurumDegistir(evrakId: number, gorevId: number, tamamlandiMi: boolean) {
    if (!this.aktifDosya) return;
    const k: any = this.veriKopyala(this.aktifDosya);
    let evrakIsmi = 'Evrak';
    let gorevMetni = 'Görev';
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, evrakId, (evrak) => {
      evrakIsmi = evrak.isim || evrakIsmi;
      const gorev = (evrak.gorevler || []).find((item) => item.id === gorevId);
      if (!gorev) return;
      gorevMetni = gorev.metin || gorevMetni;
      gorev.tamamlandiMi = tamamlandiMi;
      gorev.tamamlanmaTarihi = tamamlandiMi ? new Date().toISOString() : '';
    });
    if (!bulundu) return;
    const kayitli = this.dosyayaIslemKaydiEkle(
      k,
      'evrak',
      tamamlandiMi ? 'Evrak görevi tamamlandı' : 'Evrak görevi yeniden açıldı',
      `${evrakIsmi}: ${gorevMetni}`
    );
    this.aktifDosyaKaydet(kayitli);
  }
  async sureliIsiTamamlandiIsaretle(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined, kaynak: AjandaKaynak, evrakId: number, event?: Event) {
    event?.stopPropagation();
    if (!dosya) return;
    const oncekiKayit = this.veriKopyala(dosya);
    const kaydetFonk = this.kaynakKaydetFonksiyonu(kaynak);
    let tamamlamaAciklamasi = 'Süreli iş tamamlandı olarak işlendi.';
    const k: any = JSON.parse(JSON.stringify(dosya));
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, evrakId, (evrak) => {
      evrak.tamamlandiMi = true;
      evrak.tamamlanmaTarihi = new Date().toISOString();
      tamamlamaAciklamasi = `${evrak.isim} süresi tamamlandı olarak işaretlendi.`;
    });
    if (!bulundu) return;
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Süreli iş tamamlandı', tamamlamaAciklamasi);
    const kaydedildi = await kaydetFonk(kayitli as any);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Süreli iş tamamlandı',
      'İş kaydı kapatıldı.',
      () => kaydetFonk(this.veriKopyala(oncekiKayit) as any),
      'Süreli iş geri açıldı',
      'İlgili süreli iş tekrar aktif hale getirildi.'
    );
  }
  ajandaKaydiTamamla(kayit: AjandaKaydi, event?: Event) {
    if (kayit.tur === 'ofisGorevi' && kayit.ofisGorevi) this.ofisGoreviTamamla(kayit.ofisGorevi, event);
    else if (kayit.tur === 'durusma') this.durusmaTamamlandiIsaretle(kayit.dosya as DavaDosyasi, event);
    else if (kayit.tur === 'toplanti') this.toplantiTamamlandiIsaretle(kayit.dosya as ArabuluculukDosyasi, event);
    else if (kayit.evrakId) this.sureliIsiTamamlandiIsaretle(kayit.dosya, kayit.kaynak, kayit.evrakId, event);
  }
  getAjandaTamamlaMetni(kayit: AjandaKaydi) {
    if (kayit.tur === 'durusma') return 'Duruşma Yapıldı';
    if (kayit.tur === 'toplanti') return 'Toplantı Yapıldı';
    if (kayit.tur === 'ofisGorevi') return 'Görev Bitti';
    return 'Tamamlandı';
  }

  getFinansalIslemTurSecenekleri() {
    if (this.aktifSayfa === 'arabuluculukDetay') {
      return [
        { value: 'Ödeme Talep Tarihi', label: 'Ödeme Talep Tarihi' },
        { value: 'Ödeme', label: 'Ödeme' }
      ];
    }
    return [
      { value: 'Vekalet Ücreti', label: 'Vekalet / Hizmet Tahsilatı' },
      { value: 'Masraf Avansı (Giriş)', label: 'Masraf Avansı' },
      { value: 'Masraf Harcaması (Çıkış)', label: 'Masraf Harcaması' }
    ];
  }
  finansalIslemFormunuSifirla(tur = this.getFinansalIslemTurSecenekleri()[0]?.value || 'Vekalet Ücreti') {
    this.yeniIslem = {
      tur,
      tarih: new Date().toISOString().split('T')[0],
      tutar: undefined,
      aciklama: '',
      makbuzUrl: '',
      makbuzStopajli: this.getArabuluculukMakbuzTipOnerisi(this.getAktifArabuluculukDosyasi()) === 'sirket'
    };
  }
  ornekArabuluculukMakbuzuGosterilebilirMi(islem?: Partial<FinansalIslem>) {
    return this.aktifSayfa === 'arabuluculukDetay' && Number(islem?.tutar || 0) > 0;
  }
  getArabuluculukMakbuzMuhatapKaydi(dosya?: ArabuluculukDosyasi | null) {
    if (!dosya?.muvekkilId) return undefined;
    return this.muvekkiller.find(muvekkil => muvekkil.id === dosya.muvekkilId);
  }
  getArabuluculukMakbuzTipOnerisi(dosya?: ArabuluculukDosyasi | null) {
    if (typeof dosya?.hizmetUcretiStopajli === 'boolean') return dosya.hizmetUcretiStopajli ? 'sirket' : 'sahis';
    const muhatap = this.getArabuluculukMakbuzMuhatapKaydi(dosya);
    return muhatap?.tip === 'Şirketler' ? 'sirket' : 'sahis';
  }
  getArabuluculukMakbuzTipEtiketi(tip: 'sirket' | 'sahis') {
    return tip === 'sirket' ? 'Şirket / Stopajlı' : 'Şahıs / Stopajsız';
  }
  hasArabuluculukMakbuzModuSecimi(islem?: Partial<FinansalIslem>, dosya?: Partial<ArabuluculukDosyasi> | null) {
    return typeof islem?.makbuzStopajli === 'boolean' || typeof dosya?.hizmetUcretiStopajli === 'boolean';
  }
  isArabuluculukMakbuzStopajli(islem?: Partial<FinansalIslem>, dosya?: Partial<ArabuluculukDosyasi> | null) {
    if (typeof islem?.makbuzStopajli === 'boolean') return islem.makbuzStopajli;
    return this.getArabuluculukMakbuzTipOnerisi((dosya as ArabuluculukDosyasi | null) || this.getAktifArabuluculukDosyasi()) === 'sirket';
  }
  getArabuluculukMakbuzHesabi(islem?: Partial<FinansalIslem>, dosya?: Partial<ArabuluculukDosyasi> | null) {
    const kdvDahilBrutTutar = Number(islem?.tutar || 0);
    if (!kdvDahilBrutTutar) return null;
    if (!this.hasArabuluculukMakbuzModuSecimi(islem, dosya)) {
      const legacyNetTutar = (islem?.tur === 'Vekalet Ücreti') ? (kdvDahilBrutTutar / 1.2) : kdvDahilBrutTutar;
      return {
        stopajli: false,
        legacyMi: true,
        brutTutar: legacyNetTutar,
        kdvTutari: Math.max(0, kdvDahilBrutTutar - legacyNetTutar),
        kdvDahilBrutTutar,
        stopajTutari: 0,
        netTutar: legacyNetTutar
      };
    }
    const brutTutar = kdvDahilBrutTutar / 1.2;
    const kdvTutari = kdvDahilBrutTutar - brutTutar;
    const stopajli = this.isArabuluculukMakbuzStopajli(islem, dosya);
    const stopajTutari = stopajli ? brutTutar * 0.2 : 0;
    const netTutar = kdvDahilBrutTutar - stopajTutari;
    return {
      stopajli,
      legacyMi: false,
      brutTutar,
      kdvTutari,
      kdvDahilBrutTutar,
      stopajTutari,
      netTutar
    };
  }
  getArabuluculukHizmetUcretiHesabi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    const kdvDahilBrutTutar = Number(dosya?.vekaletUcreti || 0);
    if (!kdvDahilBrutTutar) return null;
    if (typeof dosya?.hizmetUcretiStopajli !== 'boolean') {
      const legacyNetTutar = kdvDahilBrutTutar / 1.2;
      return {
        stopajli: false,
        legacyMi: true,
        brutTutar: legacyNetTutar,
        kdvTutari: Math.max(0, kdvDahilBrutTutar - legacyNetTutar),
        kdvDahilBrutTutar,
        stopajTutari: 0,
        netTutar: legacyNetTutar
      };
    }
    const brutTutar = kdvDahilBrutTutar / 1.2;
    const kdvTutari = kdvDahilBrutTutar - brutTutar;
    const stopajli = typeof dosya?.hizmetUcretiStopajli === 'boolean'
      ? !!dosya.hizmetUcretiStopajli
      : this.getArabuluculukMakbuzTipOnerisi((dosya as ArabuluculukDosyasi | null) || null) === 'sirket';
    const stopajTutari = stopajli ? brutTutar * 0.2 : 0;
    const netTutar = kdvDahilBrutTutar - stopajTutari;
    return {
      stopajli,
      legacyMi: false,
      brutTutar,
      kdvTutari,
      kdvDahilBrutTutar,
      stopajTutari,
      netTutar
    };
  }
  getFinansalIslemOzetMetni(islem?: Partial<FinansalIslem>) {
    if (!islem) return 'Finans kaydı';
    const parcalar = [
      islem.tur || 'Finans kaydı',
      this.formatPara(Number(islem.tutar || 0))
    ];
    if (islem.aciklama) parcalar.push(islem.aciklama);
    if (islem.makbuzUrl) parcalar.push('Makbuz linki eklendi');
    if (typeof islem.makbuzStopajli === 'boolean') parcalar.push(islem.makbuzStopajli ? 'Stopajlı makbuz' : 'Stopajsız makbuz');
    return parcalar.join(' * ');
  }
  finansalIslemDuzenlemeBaslat(islem: FinansalIslem) {
    this.duzenlenenFinansalIslemId = islem.id;
    this.duzenlenenFinansalIslem = {
      ...islem,
      makbuzUrl: islem.makbuzUrl || '',
      makbuzStopajli: typeof islem.makbuzStopajli === 'boolean' ? islem.makbuzStopajli : this.getArabuluculukMakbuzTipOnerisi(this.getAktifArabuluculukDosyasi()) === 'sirket'
    };
  }
  finansalIslemDuzenlemeIptal() {
    this.duzenlenenFinansalIslemId = null;
    this.duzenlenenFinansalIslem = {};
  }
  ornekArabuluculukMakbuzuGoster(islem?: Partial<FinansalIslem>) {
    const dosya = this.getAktifArabuluculukDosyasi();
    const hesap = this.getArabuluculukMakbuzHesabi(islem, dosya);
    if (!dosya || !hesap) {
      this.bildirimGoster('info', 'Örnek makbuz hazırlanamadı', 'Önce arabuluculuk tutarını girmeniz gerekiyor.');
      return;
    }
    if (typeof window === 'undefined') return;

    const { brutTutar, kdvTutari, kdvDahilBrutTutar, stopajTutari, netTutar, stopajli } = hesap;
    const tarih = this.formatTarih(islem?.tarih || new Date().toISOString().split('T')[0]);
    const muhatapKaydi = this.getArabuluculukMakbuzMuhatapKaydi(dosya);
    const muhatap = muhatapKaydi?.adSoyad || this.getArabuluculukMuvekkilAdi(dosya) || '-';
    const muhatapTipi = stopajli ? 'Stopajlı Makbuz' : 'Stopajsız Makbuz';
    const basvurucu = this.getArabuluculukTaraflari(dosya, 'Başvurucu') || '-';
    const digerTaraf = this.getArabuluculukTaraflari(dosya, 'Diğer Taraf') || '-';
    const islemTuru = islem?.tur || 'Ödeme';
    const aciklama = this.formatMetin(islem?.aciklama) || 'Arabuluculuk hizmet bedeli tahsilatı';

    const pencere = window.open('', '_blank', 'width=980,height=760');
    if (!pencere) {
      this.bildirimGoster('info', 'Önizleme penceresi açılamadı', 'Tarayıcı açılır pencereyi engelledi. Tekrar deneyin.');
      return;
    }

    const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Örnek Makbuz Önizlemesi</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f4f7fb; margin:0; color:#0f172a; }
    .page { max-width: 920px; margin: 0 auto; padding: 28px 22px 48px; }
    .toolbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }
    .toolbar button { border:0; border-radius:10px; padding:10px 16px; font-weight:700; cursor:pointer; }
    .print { background:#0f766e; color:white; }
    .close { background:#e2e8f0; color:#0f172a; }
    .sheet { background:white; border:1px solid #cbd5e1; border-radius:22px; box-shadow:0 18px 36px rgba(15,23,42,.08); overflow:hidden; }
    .header { background:#ecfdf5; border-bottom:1px solid #a7f3d0; padding:24px 28px; }
    .eyebrow { font-size:12px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#047857; }
    .title { margin:8px 0 0; font-size:30px; font-weight:800; color:#111827; }
    .note { margin-top:10px; font-size:13px; color:#b91c1c; font-weight:700; }
    .section { padding:24px 28px 0; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .card { border:1px solid #dbe4ee; border-radius:16px; padding:14px 16px; background:#f8fafc; }
    .label { font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#64748b; margin-bottom:6px; }
    .value { font-size:15px; line-height:1.6; font-weight:700; color:#0f172a; }
    .table { width:100%; border-collapse:collapse; margin-top:18px; }
    .table th, .table td { border:1px solid #dbe4ee; padding:12px 14px; text-align:left; }
    .table th { background:#f8fafc; font-size:12px; font-weight:800; text-transform:uppercase; color:#475569; }
    .table td.amount { text-align:right; font-weight:800; }
    .footer { padding:24px 28px 28px; }
    .sign { margin-top:32px; display:flex; justify-content:space-between; gap:18px; }
    .sign-box { flex:1; border-top:1px solid #94a3b8; padding-top:10px; font-size:12px; color:#475569; }
    @media print {
      body { background:white; }
      .toolbar { display:none; }
      .page { padding:0; max-width:none; }
      .sheet { box-shadow:none; border:0; border-radius:0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button class="print" onclick="window.print()">Yazdır</button>
      <button class="close" onclick="window.close()">Kapat</button>
    </div>
    <div class="sheet">
      <div class="header">
        <div class="eyebrow">Akyavaş Hukuk Bürosu</div>
        <div class="title">Örnek Makbuz Önizlemesi</div>
        <div class="note">Bu belge örnektir, resmî mali belge yerine geçmez.</div>
      </div>
      <div class="section">
        <div class="grid">
          <div class="card"><div class="label">Düzenleme Tarihi</div><div class="value">${this.htmlKacis(tarih)}</div></div>
          <div class="card"><div class="label">İşlem Türü</div><div class="value">${this.htmlKacis(islemTuru)}</div></div>
          <div class="card"><div class="label">Makbuz Senaryosu</div><div class="value">${this.htmlKacis(muhatapTipi)}</div></div>
          <div class="card"><div class="label">Arabuluculuk Referansı</div><div class="value">${this.htmlKacis(`${dosya.buroNo || '-'} / ${dosya.arabuluculukNo || '-'}`)}</div></div>
          <div class="card"><div class="label">Uyuşmazlık Türü</div><div class="value">${this.htmlKacis(dosya.uyusmazlikTuru || '-')}</div></div>
          <div class="card"><div class="label">Tahsilat Muhatabı</div><div class="value">${this.htmlKacis(muhatap)}</div></div>
          <div class="card"><div class="label">Büro</div><div class="value">${this.htmlKacis(dosya.buro || '-')}</div></div>
          <div class="card"><div class="label">Başvurucu</div><div class="value">${this.htmlKacis(basvurucu)}</div></div>
          <div class="card"><div class="label">Diğer Taraf</div><div class="value">${this.htmlKacis(digerTaraf)}</div></div>
          <div class="card"><div class="label">Muhatap Vergi / TC No</div><div class="value">${this.htmlKacis(muhatapKaydi?.tcKimlik || '-')}</div></div>
          <div class="card"><div class="label">Muhatap Vergi Dairesi</div><div class="value">${this.htmlKacis(muhatapKaydi?.vergiDairesi || '-')}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="label">Açıklama</div>
        <div class="card" style="background:#ffffff;"><div class="value" style="font-size:14px; font-weight:600;">${this.htmlKacis(aciklama)}</div></div>
        <table class="table">
          <thead>
            <tr><th>Kalem</th><th>Tutar</th></tr>
          </thead>
          <tbody>
            <tr><td>Brüt Tutar</td><td class="amount">${this.htmlKacis(this.formatPara(brutTutar))}</td></tr>
            <tr><td>KDV (%20)</td><td class="amount">${this.htmlKacis(this.formatPara(kdvTutari))}</td></tr>
            <tr><td>KDV Dahil Brüt Tutar</td><td class="amount">${this.htmlKacis(this.formatPara(kdvDahilBrutTutar))}</td></tr>
            <tr><td>Stopaj (%20)</td><td class="amount">${this.htmlKacis(this.formatPara(stopajTutari))}</td></tr>
            <tr><td><strong>Net Tutar</strong></td><td class="amount" style="font-size:18px; font-weight:900;">${this.htmlKacis(this.formatPara(netTutar))}</td></tr>
          </tbody>
        </table>
        <div class="card" style="margin-top:16px; background:#ffffff;">
          <div class="label">Hesap Notu</div>
          <div class="value" style="font-size:13px; font-weight:600;">
            ${this.htmlKacis(stopajli
              ? 'Bu önizlemede girilen tutar KDV dahil toplam kabul edilir. Stopaj %20 olarak ayrıca gösterilir ve net tutar toplamdan stopaj düşülerek hesaplanır.'
              : 'Bu önizlemede girilen tutar KDV dahil toplam kabul edilir. Stopaj uygulanmadığı için net tutar ile KDV dahil brüt tutar aynı kalır.')}
          </div>
        </div>
      </div>
      <div class="footer">
        <div class="sign">
          <div class="sign-box">Düzenleyen<br><strong>Akyavaş Hukuk Bürosu</strong></div>
          <div class="sign-box">Teslim Alan / Muhatap<br><strong>${this.htmlKacis(muhatap)}</strong></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    pencere.document.open();
    pencere.document.write(html);
    pencere.document.close();
    pencere.focus();
  }
  getMakbuzIsinTuruEtiketi() {
    if (this.aktifSayfa === 'icraDetay') return 'İcra';
    if (this.aktifSayfa === 'arabuluculukDetay') return 'Arabuluculuk';
    return 'Dava';
  }
  getMakbuzDosyaNo(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined) {
    if (!dosya) return '-';
    if (this.aktifSayfa === 'arabuluculukDetay') {
      const arabuluculuk = dosya as ArabuluculukDosyasi;
      return [arabuluculuk.buroNo, arabuluculuk.arabuluculukNo].filter(Boolean).join(' / ') || '-';
    }
    return (dosya.dosyaNo || (dosya.dosyaNumaralari || []).map(no => `${no.tur}: ${no.no}`).join(' / ') || '-');
  }
  getMakbuzDosyaTaraflari(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined) {
    if (!dosya) return '-';
    if (this.aktifSayfa === 'icraDetay') {
      const icra = dosya as IcraDosyasi;
      return `${icra.alacakli || 'Alacaklı yok'} / ${icra.borclu || 'Borçlu yok'}`;
    }
    if (this.aktifSayfa === 'arabuluculukDetay') return this.getArabuluculukTarafIsimMetni(dosya as ArabuluculukDosyasi);
    return this.getDavaTarafOzet(dosya as DavaDosyasi) || '-';
  }
  getMakbuzDosyaKonuMetni(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined) {
    if (!dosya) return '-';
    if (this.aktifSayfa === 'icraDetay') {
      const icra = dosya as IcraDosyasi;
      return [icra.takipTipi, icra.icraDairesi].filter(Boolean).join(' - ') || 'İcra takibi';
    }
    if (this.aktifSayfa === 'arabuluculukDetay') {
      const arabuluculuk = dosya as ArabuluculukDosyasi;
      return [arabuluculuk.basvuruTuru, arabuluculuk.uyusmazlikTuru].filter(Boolean).join(' - ') || 'Arabuluculuk işi';
    }
    const dava = dosya as DavaDosyasi;
    return [dava.konu, dava.mahkeme].filter(Boolean).join(' - ') || 'Dava dosyası';
  }
  getMakbuzHesapMuhatabi(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined) {
    const davaMuvekkilId = (dosya as DavaDosyasi | undefined)?.muvekkilId || (dosya as DavaDosyasi | undefined)?.muvekkiller?.find(kayit => kayit.muvekkilId)?.muvekkilId;
    const muvekkilId = (dosya as any)?.muvekkilId || davaMuvekkilId;
    const kayitli = muvekkilId ? this.muvekkiller.find(muvekkil => muvekkil.id === muvekkilId) : undefined;
    const arabuluculukBasvurucu = this.aktifSayfa === 'arabuluculukDetay'
      ? (dosya as ArabuluculukDosyasi | undefined)?.taraflar?.find(taraf => taraf.tip === 'Başvurucu')
      : undefined;
    const davaIlkMuvekkil = this.aktifSayfa === 'detay'
      ? (dosya as DavaDosyasi | undefined)?.muvekkiller?.find(kayit => kayit.isim || kayit.muvekkilId)
      : undefined;
    const adSoyad = this.formatMetin(kayitli?.adSoyad || davaIlkMuvekkil?.isim || (dosya as any)?.muvekkil || arabuluculukBasvurucu?.isim || '') || '';
    const adres = this.adresBilesenleriniHazirla({
      adres: kayitli?.adres || davaIlkMuvekkil?.adres || arabuluculukBasvurucu?.adres,
      il: kayitli?.il || davaIlkMuvekkil?.il || arabuluculukBasvurucu?.il,
      ilce: kayitli?.ilce || davaIlkMuvekkil?.ilce || arabuluculukBasvurucu?.ilce,
      acikAdres: kayitli?.acikAdres || davaIlkMuvekkil?.acikAdres || arabuluculukBasvurucu?.acikAdres
    });
    const sirketMi = this.makbuzMuhatabiSirketMi(kayitli, adSoyad);
    const kisiAdiSoyadi = this.kisiAdiSoyadiAyir(adSoyad);
    return {
      adSoyad,
      unvan: sirketMi ? adSoyad : '',
      ad: sirketMi ? '' : kisiAdiSoyadi.ad,
      soyad: sirketMi ? '' : kisiAdiSoyadi.soyad,
      tcVkn: kayitli?.tcKimlik || davaIlkMuvekkil?.tcKimlikVergiNo || arabuluculukBasvurucu?.tcVergiNo || '',
      vergiDairesi: kayitli?.vergiDairesi || davaIlkMuvekkil?.vergiDairesi || arabuluculukBasvurucu?.vergiDairesi || '',
      il: adres.il,
      ilce: adres.ilce,
      adres: adres.acikAdres
    };
  }
  makbuzMuhatabiSirketMi(kayitli?: Muvekkil, adSoyad = '') {
    if (kayitli?.tip === 'Şirketler') return true;
    return /\b(a\.?ş\.?|anonim|limited|ltd|şti|şirket|ticaret|sanayi|holding|bankası|bakanlığı|müdürlüğü|belediyesi)\b/i.test(adSoyad.toLocaleLowerCase('tr-TR'));
  }
  kisiAdiSoyadiAyir(adSoyad: string) {
    const parcalar = (adSoyad || '').trim().split(/\s+/).filter(Boolean);
    if (parcalar.length <= 1) return { ad: adSoyad || '', soyad: '' };
    return { ad: parcalar.slice(0, -1).join(' '), soyad: parcalar[parcalar.length - 1] };
  }
  adrestenIlIlceCikar(adres: string) {
    const temiz = (adres || '').replace(/\s+/g, ' ').trim();
    const slashParcalari = temiz.split('/').map(parca => parca.trim()).filter(Boolean);
    if (slashParcalari.length >= 2) {
      return {
        ilce: slashParcalari[slashParcalari.length - 2].replace(/[,.]$/g, ''),
        il: slashParcalari[slashParcalari.length - 1].replace(/[,.]$/g, '')
      };
    }
    return { il: '', ilce: '' };
  }
  getMakbuzExcelYerTutuculari(islem: FinansalIslem) {
    const dosya = this.aktifDosya as DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null;
    const isinTuru = this.getMakbuzIsinTuruEtiketi();
    const dosyaNo = this.getMakbuzDosyaNo(dosya);
    const taraflar = this.getMakbuzDosyaTaraflari(dosya);
    const konu = this.getMakbuzDosyaKonuMetni(dosya);
    const muhatap = this.getMakbuzHesapMuhatabi(dosya);
    const hizmetTutari = this.getMakbuzExcelHizmetTutari(islem, dosya);
    return {
      MAKBUZ_DUZENLEME_TARIHI: this.formatTarih(new Date().toISOString()),
      ISIN_TURU: isinTuru,
      MAKBUZ_ACIKLAMASI: `${dosyaNo} numaralı ${isinTuru.toLocaleLowerCase('tr-TR')} işi - ${taraflar} - ${konu}`,
      HESAP_MUHATABI_UNVANI: muhatap.unvan || '',
      HESAP_MUHATABI_ADI: muhatap.ad || '',
      HESAP_MUHATABI_SOYADI: muhatap.soyad || '',
      HESAP_MUHATABI_TC_VKN: muhatap.tcVkn || '',
      VERGI_DAIRESI: muhatap.vergiDairesi || '',
      HESAP_MUHATABI_IL: muhatap.il || '',
      HESAP_MUHATABI_ILCE: muhatap.ilce || '',
      HESAP_MUHATABI_ADRES: muhatap.adres || '',
      BRUT_TUTAR: this.formatTutarSayisiMetni(hizmetTutari),
      BRUT_TUTAR_YAZIYLA: this.turkceTutarYazisinaCevir(hizmetTutari),
      DOSYA_NO: dosyaNo,
      DOSYA_TARAFLARI: taraflar,
      FINANS_ISLEM_TURU: islem.tur || '-',
      FINANS_ISLEM_ACIKLAMASI: this.formatMetin(islem.aciklama) || '-'
    };
  }
  getMakbuzExcelHizmetTutari(islem: FinansalIslem, dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null) {
    if (this.aktifSayfa === 'arabuluculukDetay') {
      const hesap = this.getArabuluculukMakbuzHesabi(islem, dosya as ArabuluculukDosyasi | null);
      return hesap?.brutTutar ?? Number(islem.tutar || 0);
    }
    return Number(islem.tutar || 0);
  }
  excelYerTutuculariniDegistir(metin: string, yerTutucular: Record<string, string>) {
    return Object.entries(yerTutucular).reduce((sonuc, [anahtar, deger]) => {
      const desen = new RegExp(`{{\\s*${anahtar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
      return sonuc.replace(desen, deger ?? '');
    }, metin);
  }
  excelMakbuzDosyaAdiOlustur(islem: FinansalIslem) {
    const dosyaNo = this.getMakbuzDosyaNo(this.aktifDosya as any).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
    const tarih = new Date().toISOString().slice(0, 10);
    return `makbuz-${this.getMakbuzIsinTuruEtiketi().toLocaleLowerCase('tr-TR')}-${dosyaNo || 'dosya'}-${islem.id || tarih}.xlsx`;
  }
  async excelMakbuzOlustur(islem: FinansalIslem) {
    if (!this.aktifDosya) return;
    if (!Number(islem.tutar || 0)) {
      this.bildirimGoster('info', 'Excel makbuz oluşturulamadı', 'Bu finans kaydında tutar bulunmuyor.');
      return;
    }
    this.makbuzExcelOlusturuluyorId = islem.id;
    try {
      const response = await fetch(this.makbuzExcelSablonYolu);
      if (!response.ok) throw new Error('Makbuz şablonu bulunamadı.');
      const ExcelJSModule: any = await import('exceljs/dist/exceljs.min.js');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());
      const yerTutucular = this.getMakbuzExcelYerTutuculari(islem);
      workbook.eachSheet((worksheet: any) => {
        worksheet.eachRow((row: any) => {
          row.eachCell((cell: any) => {
            const deger: any = cell.value;
            if (typeof deger === 'string') {
              cell.value = this.excelYerTutuculariniDegistir(deger, yerTutucular);
            } else if (deger?.richText) {
              const metin = deger.richText.map((parca: any) => parca.text || '').join('');
              cell.value = this.excelYerTutuculariniDegistir(metin, yerTutucular);
            } else if (deger?.text) {
              cell.value = { ...deger, text: this.excelYerTutuculariniDegistir(deger.text, yerTutucular) };
            }
          });
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const onceki = this.hazirExcelMakbuzlar[islem.id];
      if (onceki?.url) URL.revokeObjectURL(onceki.url);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dosyaAdi = this.excelMakbuzDosyaAdiOlustur(islem);
      this.hazirExcelMakbuzlar = {
        ...this.hazirExcelMakbuzlar,
        [islem.id]: {
          url: URL.createObjectURL(blob),
          dosyaAdi,
          olusturmaTarihi: new Date().toISOString()
        }
      };
      this.bildirimGoster('success', 'Excel makbuz hazırlandı', 'İndirme bağlantısı finans işlem satırında görünüyor.');
    } catch (error: any) {
      this.bildirimGoster('error', 'Excel makbuz oluşturulamadı', error?.message || 'Şablon işlenirken beklenmeyen bir hata oluştu.');
    } finally {
      this.makbuzExcelOlusturuluyorId = null;
    }
  }
  finansalIslemGuncelle() {
    if (!this.aktifDosya || !this.duzenlenenFinansalIslemId) return;
    const tutar = Number(this.duzenlenenFinansalIslem.tutar);
    const aciklama = (this.duzenlenenFinansalIslem.aciklama || '').trim();
    if (!tutar || !aciklama) {
      this.bildirimGoster('info', 'Finans hareketi eksik', 'Tutar ve açıklama alanını doldurup tekrar deneyin.');
      return;
    }

    const k: any = { ...this.aktifDosya, finansalIslemler: [...(this.aktifDosya.finansalIslemler || [])] };
    const index = k.finansalIslemler.findIndex((islem: FinansalIslem) => islem.id === this.duzenlenenFinansalIslemId);
    if (index === -1) return;

    const guncellenenIslem: FinansalIslem = {
      ...k.finansalIslemler[index],
      tarih: this.duzenlenenFinansalIslem.tarih || new Date().toISOString().split('T')[0],
      tur: this.duzenlenenFinansalIslem.tur || this.getFinansalIslemTurSecenekleri()[0]?.value || 'Vekalet Ücreti',
      tutar,
      aciklama: this.formatMetin(aciklama),
      makbuzUrl: this.hazirBaglantiUrl(this.duzenlenenFinansalIslem.makbuzUrl),
      makbuzStopajli: this.isArabuluculukMakbuzStopajli(this.duzenlenenFinansalIslem)
    };
    k.finansalIslemler[index] = guncellenenIslem;

    const kayitli = this.dosyayaIslemKaydiEkle(k, 'finans', 'Finans hareketi güncellendi', this.getFinansalIslemOzetMetni(guncellenenIslem));
    this.finansalIslemDuzenlemeIptal();
    this.aktifDosyaKaydet(kayitli, 'Finans hareketi güncellendi.');
  }

  finansalIslemEkle() {
    if (!this.yeniIslem.tutar || !this.yeniIslem.aciklama || !this.aktifDosya) return;
    this.yeniIslem.aciklama = this.formatMetin(this.yeniIslem.aciklama);
    const makbuzUrl = this.hazirBaglantiUrl(this.yeniIslem.makbuzUrl);
    const makbuzStopajli = this.isArabuluculukMakbuzStopajli(this.yeniIslem);
    const k: any = {...this.aktifDosya}; if (!k.finansalIslemler) k.finansalIslemler = [];
    k.finansalIslemler.unshift({ id: Date.now(), tarih: this.yeniIslem.tarih || new Date().toISOString().split('T')[0], tur: this.yeniIslem.tur as any, tutar: this.yeniIslem.tutar, aciklama: this.yeniIslem.aciklama || '', makbuzUrl, makbuzStopajli });
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'finans', 'Finans hareketi eklendi', `${this.yeniIslem.tur}: ${this.formatPara(this.yeniIslem.tutar || 0)} * ${this.yeniIslem.aciklama || ''}${makbuzUrl ? ' * Makbuz linki eklendi' : ''}${makbuzStopajli ? ' * Stopajlı makbuz' : ' * Stopajsız makbuz'}`);
    this.finansalIslemDuzenlemeIptal();
    this.aktifDosyaKaydet(kayitli, 'Finans hareketi dosyaya eklendi.');
    this.finansalIslemFormunuSifirla(this.yeniIslem.tur as string);
  }
  async finansalIslemSil(id: number) {
    if(!this.aktifDosya) return;
    const oncekiKayit = this.veriKopyala(this.aktifDosya);
    const kaydetFonk = this.aktifDetayKaydetFonksiyonu();
    const k: any = {...this.aktifDosya};
    const silinen = (k.finansalIslemler || []).find((i:any) => i.id === id);
    k.finansalIslemler = k.finansalIslemler!.filter((i:any) => i.id !== id);
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'finans', 'Finans hareketi silindi', silinen ? `${silinen.tur}: ${this.formatPara(silinen.tutar || 0)} * ${silinen.aciklama || ''}${silinen.makbuzUrl ? ' * Makbuz linki vardı' : ''}` : 'Seçili finans hareketi kayıttan kaldırıldı.');
    if (this.duzenlenenFinansalIslemId === id) this.finansalIslemDuzenlemeIptal();
    const kaydedildi = await kaydetFonk(kayitli);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Finans hareketi silindi',
      'İşlem geçmişinden kaldırıldı.',
      () => kaydetFonk(this.veriKopyala(oncekiKayit)),
      'Finans hareketi geri yüklendi',
      'Silinen finans hareketi yeniden dosyaya işlendi.'
    );
  }

  klasorGecis(id: number) { this.acikKlasorler[id] = !this.acikKlasorler[id]; }
  googleDocsEntegrasyonuHazirMi() { return GOOGLE_DOCS_CONFIG.clientId.trim() !== ''; }
  sablonAramaMetniHazirla(metin?: string) { return (metin || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim(); }
  private evrakSablonAramayaUygun(evrak: EvrakBaglantisi) {
    const arama = this.sablonAramaMetniHazirla(this.sablonArama);
    if (!arama) return true;
    const ekMetni = (evrak.ekler || []).map(ek => [ek.isim, ek.url].filter(Boolean).join(' ')).join(' ');
    const kaynak = this.sablonAramaMetniHazirla([evrak.isim, evrak.url, ekMetni].filter(Boolean).join(' '));
    return kaynak.includes(arama);
  }
  get filtrelenmisAvukatlikSablonKayitlari(): ArabuluculukSablonListeKaydi[] {
    return this.sablonlar.avukatlik
      .map((evrak, index) => ({ evrak, index, ortakMi: false }))
      .filter(kayit => this.evrakSablonAramayaUygun(kayit.evrak));
  }
  get aktifSablonAramaSonucSayisi() {
    return this.aktifSablonSekmesi === 'arabuluculuk'
      ? this.getFiltrelenmisArabuluculukSablonKayitlari().length
      : this.filtrelenmisAvukatlikSablonKayitlari.length;
  }
  private isArabuluculukSablonBolumuDegeri(deger?: string | null): deger is ArabuluculukSablonBolumAnahtari {
    return deger === 'ihtiyari' || deger === 'dava_sarti';
  }
  private isArabuluculukSablonKategoriDegeri(deger?: string | null): deger is ArabuluculukSablonKategoriAnahtari {
    return deger === 'toplu' || deger === 'davet' || deger === 'bilgilendirme' || deger === 'belirleme' || deger === 'son_tutanak' || deger === 'anlasma';
  }
  private getVarsayilanArabuluculukSablonBolumu() {
    return this.acikArabuluculukSablonBolumu === 'ihtiyari' || this.acikArabuluculukSablonBolumu === 'dava_sarti'
      ? this.acikArabuluculukSablonBolumu
      : 'ihtiyari';
  }
  private getVarsayilanArabuluculukSablonKategorisi() {
    const bolum = this.getVarsayilanArabuluculukSablonBolumu();
    const seciliAltBolum = this.acikArabuluculukSablonAltBolumleri[bolum];
    return this.isArabuluculukSablonKategoriDegeri(seciliAltBolum) ? seciliAltBolum : 'toplu';
  }
  private getEvrakSablonBolumu(evrak?: Partial<EvrakBaglantisi> | null): ArabuluculukSablonBolumAnahtari | null {
    if (this.isArabuluculukSablonBolumuDegeri(evrak?.sablonBolumu)) return evrak!.sablonBolumu;
    return this.getArabuluculukSablonBolumAnahtari(evrak?.isim || '');
  }
  private getEvrakSablonKategorisi(evrak?: Partial<EvrakBaglantisi> | null): ArabuluculukSablonKategoriAnahtari | null {
    if (this.isArabuluculukSablonKategoriDegeri(evrak?.sablonKategori)) return evrak!.sablonKategori;
    return this.getArabuluculukSablonKategoriAnahtari(evrak?.isim);
  }
  private hazirlaArabuluculukSablonAlanlari(evrak?: Partial<EvrakBaglantisi> | null) {
    return {
      sablonBolumu: this.getEvrakSablonBolumu(evrak) || this.getVarsayilanArabuluculukSablonBolumu(),
      sablonKategori: this.getEvrakSablonKategorisi(evrak) || this.getVarsayilanArabuluculukSablonKategorisi()
    };
  }
  private getArabuluculukSablonKategoriAnahtari(isim?: string): ArabuluculukSablonKategoriAnahtari | null {
    const hedef = this.sablonAramaMetniHazirla(isim);
    if (!hedef) return null;
    if (hedef.includes('toplu belge') || hedef.includes('toplu dosya')) return 'toplu';
    if (hedef.includes('davet mektup')) return 'davet';
    if (hedef.includes('bilgilendirme')) return 'bilgilendirme';
    if (hedef.includes('belirleme')) return 'belirleme';
    if (hedef.includes('son tutanak')) return 'son_tutanak';
    if (hedef.includes('anlasma belge') || hedef.includes('anlaşma belge')) return 'anlasma';
    return null;
  }
  private getArabuluculukSablonBolumAnahtari(isim: string): ArabuluculukSablonBolumAnahtari | null {
    const hedef = this.sablonAramaMetniHazirla(isim);
    if (!hedef) return null;
    if (hedef.includes('ihtiyari')) return 'ihtiyari';
    if (hedef.includes('dava şart') || hedef.includes('dava sart')) return 'dava_sarti';
    return null;
  }
  private getArabuluculukSablonKayitlari() {
    return this.sablonlar.arabuluculuk.map((evrak, index) => {
      const kategori = this.getEvrakSablonKategorisi(evrak);
      const bolum = this.getEvrakSablonBolumu(evrak);
      return { evrak, index, kategori, bolum };
    });
  }
  private getFiltrelenmisArabuluculukSablonKayitlari() {
    return this.getArabuluculukSablonKayitlari().filter(kayit => this.evrakSablonAramayaUygun(kayit.evrak));
  }
  get arabuluculukSablonBolumGorunumu(): ArabuluculukSablonBolumGorunumu[] {
    const kayitlar = this.getFiltrelenmisArabuluculukSablonKayitlari();
    return this.arabuluculukSablonBolumTanimlari.map((bolum) => ({
      ...bolum,
      altBasliklar: this.arabuluculukSablonAltBolumTanimlari.map((altBaslik) => ({
        ...altBaslik,
        kayitlar: kayitlar
          .filter((kayit) => kayit.kategori === altBaslik.key && kayit.bolum === bolum.key)
          .map((kayit) => ({
            evrak: kayit.evrak,
            index: kayit.index,
            ortakMi: false
          }))
      }))
    }));
  }
  get siniflandirilmamisArabuluculukSablonlari(): ArabuluculukSablonListeKaydi[] {
    return this.getFiltrelenmisArabuluculukSablonKayitlari()
      .filter((kayit) => !kayit.kategori || !kayit.bolum)
      .map((kayit) => ({
        evrak: kayit.evrak,
        index: kayit.index,
        ortakMi: false
      }));
  }
  toggleArabuluculukSablonBolumu(bolum: ArabuluculukSablonBolumAnahtari | 'siniflandirilmamis') {
    this.acikArabuluculukSablonBolumu = this.acikArabuluculukSablonBolumu === bolum ? null : bolum;
    if (bolum === 'ihtiyari' || bolum === 'dava_sarti') {
      if (!this.acikArabuluculukSablonAltBolumleri[bolum]) {
        this.acikArabuluculukSablonAltBolumleri[bolum] = 'toplu';
      }
      this.yeniEvrak.sablonBolumu = bolum;
      this.yeniEvrak.sablonKategori = this.acikArabuluculukSablonAltBolumleri[bolum] || 'toplu';
    }
  }
  toggleArabuluculukSablonAltBolumu(bolum: ArabuluculukSablonBolumAnahtari, kategori: ArabuluculukSablonKategoriAnahtari) {
    this.acikArabuluculukSablonAltBolumleri[bolum] = this.acikArabuluculukSablonAltBolumleri[bolum] === kategori ? null : kategori;
    this.yeniEvrak.sablonBolumu = bolum;
    this.yeniEvrak.sablonKategori = this.acikArabuluculukSablonAltBolumleri[bolum] || kategori;
  }
  getArabuluculukSablonBolumKayitSayisi(bolum: ArabuluculukSablonBolumGorunumu) {
    return bolum.altBasliklar.reduce((toplam, altBaslik) => toplam + altBaslik.kayitlar.length, 0);
  }
  aktifDosyadaEvrakAdiVarMi(isim: string) {
    const hedef = this.sablonAramaMetniHazirla(isim);
    return (this.aktifDosya?.evraklar || []).some(evrak => this.sablonAramaMetniHazirla(evrak.isim) === hedef);
  }
  aktifDosyadaEvrakAdlarindanBiriVarMi(isimler: string[]) {
    const hedefler = new Set(
      (isimler || [])
        .map(isim => this.sablonAramaMetniHazirla(isim))
        .filter(Boolean)
    );
    if (!hedefler.size) return false;
    return (this.aktifDosya?.evraklar || []).some(evrak => hedefler.has(this.sablonAramaMetniHazirla(evrak.isim)));
  }
  arabuluculukSablonuBul(isim: string) {
    const hedef = this.sablonAramaMetniHazirla(isim);
    return this.sablonlar.arabuluculuk.find(sablon => this.sablonAramaMetniHazirla(sablon.isim) === hedef)
      || this.sablonlar.arabuluculuk.find(sablon => this.sablonAramaMetniHazirla(sablon.isim).includes(hedef))
      || null;
  }
  getDavetMektubuTurEtiketleri(dosya: ArabuluculukDosyasi | null) {
    const tur = dosya?.uyusmazlikTuru || '';
    if (tur === 'İşçi İşveren') return ['İşçi İşveren', 'İş'];
    return tur ? [tur] : [];
  }
  getDavetMektubuSablonAdaylari(dosya: ArabuluculukDosyasi | null) {
    const temel = GOOGLE_DOCS_CONFIG.davetMektubuTemplateName;
    const adaylar = this.getDavetMektubuTurEtiketleri(dosya).flatMap(tur => [
      `${temel} - ${tur}`,
      `${temel}: ${tur}`,
      `${tur} - ${temel}`,
      `${tur} ${temel}`
    ]);
    adaylar.push(temel);
    return [...new Set(adaylar.map(aday => aday.trim()).filter(Boolean))];
  }
  getDavetMektubuSablonu() {
    const dosya = this.getAktifArabuluculukDosyasi();
    for (const aday of this.getDavetMektubuSablonAdaylari(dosya)) {
      const sablon = this.arabuluculukSablonuBul(aday);
      if (sablon) return sablon;
    }
    return null;
  }
  getDavetMektubuSablonBeklentisi() {
    return this.getDavetMektubuSablonAdaylari(this.getAktifArabuluculukDosyasi())[0] || GOOGLE_DOCS_CONFIG.davetMektubuTemplateName;
  }
  getDavetMektubuSeciliSablonIsmi() {
    return this.getDavetMektubuSablonu()?.isim || this.getDavetMektubuSablonBeklentisi();
  }
  getBilgilendirmeTutanagiSablonu() {
    return this.arabuluculukSablonuBul(GOOGLE_DOCS_CONFIG.bilgilendirmeTutanagiTemplateName);
  }
  getBilgilendirmeTutanagiSeciliSablonIsmi() {
    return this.getBilgilendirmeTutanagiSablonu()?.isim || GOOGLE_DOCS_CONFIG.bilgilendirmeTutanagiTemplateName;
  }
  getAktifArabuluculukTarafSayisi() {
    return (this.getAktifArabuluculukDosyasi()?.taraflar || []).length;
  }
  getArabuluculukCokTarafliSablonAdaylari(temelIsim: string, tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    const sablonTarafSayisi = tarafSayisi >= 4 ? 4 : tarafSayisi;
    const adaylar = [temelIsim];
    if (sablonTarafSayisi >= 2) {
      adaylar.unshift(`${temelIsim} - ${sablonTarafSayisi} Taraflı`);
    }
    return [...new Set(adaylar)];
  }
  getArabuluculukCokTarafliSablonBeklentisi(temelIsim: string, tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    return this.getArabuluculukCokTarafliSablonAdaylari(temelIsim, tarafSayisi)[0] || temelIsim;
  }
  getArabuluculukCokTarafliSablonu(temelIsim: string, tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    for (const aday of this.getArabuluculukCokTarafliSablonAdaylari(temelIsim, tarafSayisi)) {
      const sablon = this.arabuluculukSablonuBul(aday);
      if (sablon) return sablon;
    }
    return null;
  }
  getArabuluculukCokTarafliSeciliSablonIsmi(temelIsim: string, tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    return this.getArabuluculukCokTarafliSablonu(temelIsim, tarafSayisi)?.isim
      || this.getArabuluculukCokTarafliSablonBeklentisi(temelIsim, tarafSayisi);
  }
  getArabuluculukBelirlemeTutanagiSablonu() {
    return this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName);
  }
  getArabuluculukBelirlemeTutanagiSeciliSablonIsmi() {
    return this.getArabuluculukCokTarafliSeciliSablonIsmi(GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName);
  }
  getSonTutanakIhtiyariAnlasmaSablonu() {
    return this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName);
  }
  getSonTutanakIhtiyariAnlasmaSeciliSablonIsmi() {
    return this.getArabuluculukCokTarafliSeciliSablonIsmi(GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName);
  }
  getIhtiyariAnlasmaBelgesiSablonu() {
    return this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName);
  }
  getIhtiyariAnlasmaBelgesiSeciliSablonIsmi() {
    return this.getArabuluculukCokTarafliSeciliSablonIsmi(GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName);
  }
  aktifArabuluculukDosyasiIhtiyariMi() {
    return this.getAktifArabuluculukDosyasi()?.basvuruTuru === 'İhtiyari';
  }
  googleYerTutucuMetni(anahtar: string) {
    const temiz = (anahtar || '').trim();
    if (!temiz) return '';
    return temiz.startsWith('{{') && temiz.endsWith('}}') ? temiz : `{{${temiz}}}`;
  }
  getArabuluculukTopluDosyaSablonBeklentisi(tarafSayisi: number) {
    return this.arabuluculukTopluDosyaSecenekleri.find(secenek => secenek.tarafSayisi === tarafSayisi)?.templateName || `Toplu Dosya Oluştur - ${tarafSayisi} Taraflı`;
  }
  getArabuluculukTopluDosyaSablonu(tarafSayisi: number) {
    return this.arabuluculukSablonuBul(this.getArabuluculukTopluDosyaSablonBeklentisi(tarafSayisi));
  }
  getArabuluculukTopluDosyaSeciliSablonIsmi(tarafSayisi: number) {
    return this.getArabuluculukTopluDosyaSablonu(tarafSayisi)?.isim || this.getArabuluculukTopluDosyaSablonBeklentisi(tarafSayisi);
  }
  arabuluculukBelgeSecenekMenusunuAcKapat(menu: 'belirleme' | 'sonTutanak' | 'anlasmaBelgesi') {
    this.topluDosyaSecenekleriAcik = false;
    this.arabuluculukBelgeSecenekMenusu = this.arabuluculukBelgeSecenekMenusu === menu ? null : menu;
  }
  arabuluculukBelgeSecenekMenusunuKapat() {
    this.arabuluculukBelgeSecenekMenusu = null;
  }
  turkceTutarSayisinaCevir(deger?: string | number | null) {
    if (typeof deger === 'number') return Number.isFinite(deger) ? deger : 0;
    const ham = `${deger || ''}`.trim();
    if (!ham) return 0;
    const temiz = ham
      .replace(/TL/gi, '')
      .replace(/[₺\s]/g, '')
      .replace(/\.(?=\d{3}([,.]|$))/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const sayi = Number(temiz);
    return Number.isFinite(sayi) ? sayi : 0;
  }
  formatTutarMetni(miktar?: number | null) {
    if (miktar === null || miktar === undefined || !Number.isFinite(miktar)) return '';
    const sayi = Number(miktar);
    return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sayi)} TL`;
  }
  formatTutarSayisiMetni(miktar?: number | null) {
    if (miktar === null || miktar === undefined || !Number.isFinite(miktar)) return '';
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(miktar));
  }
  turkceUcBasamakYaziyaCevir(sayi: number) {
    const birler = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
    const onlar = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
    if (!sayi) return '';
    const yuzler = Math.floor(sayi / 100);
    const onlarBasamagi = Math.floor((sayi % 100) / 10);
    const birlerBasamagi = sayi % 10;
    const parcalar: string[] = [];
    if (yuzler) parcalar.push(yuzler === 1 ? 'yüz' : `${birler[yuzler]} yüz`);
    if (onlarBasamagi) parcalar.push(onlar[onlarBasamagi]);
    if (birlerBasamagi) parcalar.push(birler[birlerBasamagi]);
    return parcalar.join(' ').trim();
  }
  turkceTamSayiYaziyaCevir(sayi: number) {
    if (!sayi) return 'sıfır';
    const gruplar = ['', 'bin', 'milyon', 'milyar', 'trilyon'];
    const parcalar: string[] = [];
    let kalan = Math.floor(Math.abs(sayi));
    let grupIndex = 0;
    while (kalan > 0) {
      const ucBasamak = kalan % 1000;
      if (ucBasamak) {
        if (grupIndex === 1 && ucBasamak === 1) parcalar.unshift('bin');
        else {
          const metin = this.turkceUcBasamakYaziyaCevir(ucBasamak);
          parcalar.unshift([metin, gruplar[grupIndex]].filter(Boolean).join(' ').trim());
        }
      }
      kalan = Math.floor(kalan / 1000);
      grupIndex += 1;
    }
    return parcalar.join(' ').replace(/\s+/g, ' ').trim();
  }
  ilkHarfiBuyut(metin: string) {
    if (!metin) return '';
    return metin.charAt(0).toLocaleUpperCase('tr-TR') + metin.slice(1);
  }
  turkceTutarYazisinaCevir(miktar?: number | null) {
    if (miktar === null || miktar === undefined || !Number.isFinite(miktar)) return '';
    const sayi = Math.abs(Number(miktar));
    const tamKisim = Math.floor(sayi);
    const kurus = Math.round((sayi - tamKisim) * 100);
    const liraMetni = `${this.turkceTamSayiYaziyaCevir(tamKisim)} Türk lirası`;
    const kurusMetni = kurus > 0 ? ` ${this.turkceTamSayiYaziyaCevir(kurus)} kuruş` : '';
    const negatifMetni = Number(miktar) < 0 ? 'eksi ' : '';
    return this.ilkHarfiBuyut(`${negatifMetni}${liraMetni}${kurusMetni}`.trim());
  }
  getArabuluculukAnlasmaKalemiTutarSayisi(dosya: Partial<ArabuluculukDosyasi> | null | undefined, alan: keyof ArabuluculukDosyasi) {
    return this.turkceTutarSayisinaCevir((dosya?.[alan] as string | number | undefined) || '');
  }
  getArabuluculukAnlasmaKalemlerindeDegerVarMi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return this.arabuluculukAnlasmaKalemleri.some(kalem => String(dosya?.[kalem.tutarAlan] || '').trim());
  }
  getArabuluculukOdenecekToplamTutarSayisi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return Number(this.arabuluculukAnlasmaKalemleri.reduce((toplam, kalem) => toplam + this.getArabuluculukAnlasmaKalemiTutarSayisi(dosya, kalem.tutarAlan), 0).toFixed(2));
  }
  getArabuluculukOdenecekToplamTutarRakamla(dosya?: Partial<ArabuluculukDosyasi> | null) {
    if (!this.getArabuluculukAnlasmaKalemlerindeDegerVarMi(dosya)) return '';
    return this.formatTutarMetni(this.getArabuluculukOdenecekToplamTutarSayisi(dosya));
  }
  getArabuluculukOdenecekToplamTutarYaziyla(dosya?: Partial<ArabuluculukDosyasi> | null) {
    if (!this.getArabuluculukAnlasmaKalemlerindeDegerVarMi(dosya)) return '';
    return this.turkceTutarYazisinaCevir(this.getArabuluculukOdenecekToplamTutarSayisi(dosya));
  }
  yeniArabuluculukTaksidi(sira: number, onceki?: Partial<ArabuluculukTaksit>): ArabuluculukTaksit {
    return {
      id: onceki?.id || this.yeniGecmisKaydiId(),
      sira,
      tutar: this.formatMetin(onceki?.tutar),
      odemeTarihi: onceki?.odemeTarihi || ''
    };
  }
  arabuluculukTaksitSayisiniSinirla(deger: any) {
    const sayi = Number(deger);
    if (!Number.isFinite(sayi)) return 2;
    return Math.min(this.maksimumArabuluculukTaksitSayisi, Math.max(2, Math.floor(sayi)));
  }
  arabuluculukTaksitSayisiDegisti(deger: any) {
    const taksitSayisi = this.arabuluculukTaksitSayisiniSinirla(deger);
    this.islemGorenArabuluculuk.taksitSayisi = taksitSayisi;
    const mevcut = Array.isArray(this.islemGorenArabuluculuk.taksitler) ? this.islemGorenArabuluculuk.taksitler : [];
    this.islemGorenArabuluculuk.taksitler = Array.from({ length: taksitSayisi }, (_, index) => this.yeniArabuluculukTaksidi(index + 1, mevcut[index]));
  }
  arabuluculukTaksitliOdemeDegisti(acik: boolean) {
    this.islemGorenArabuluculuk.taksitleOdeme = acik;
    if (!acik) {
      this.islemGorenArabuluculuk.taksitSayisi = 0;
      this.islemGorenArabuluculuk.taksitler = [];
      return;
    }
    this.arabuluculukTaksitSayisiDegisti(this.islemGorenArabuluculuk.taksitSayisi || 2);
  }
  arabuluculukTaksitleriniHazirla(taksitler?: ArabuluculukTaksit[] | null, taksitSayisi?: number | null) {
    const hedefSayi = this.arabuluculukTaksitSayisiniSinirla(taksitSayisi || taksitler?.length || 2);
    const liste = Array.isArray(taksitler) ? taksitler : [];
    return Array.from({ length: hedefSayi }, (_, index) => {
      const kayit = liste[index];
      return this.yeniArabuluculukTaksidi(index + 1, kayit);
    });
  }
  getArabuluculukTaksitToplami(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return Number(((dosya?.taksitler || []).reduce((toplam, taksit) => toplam + this.turkceTutarSayisinaCevir(taksit?.tutar), 0)).toFixed(2));
  }
  arabuluculukFormAlanDegeri(alan: keyof ArabuluculukDosyasi) {
    return (this.islemGorenArabuluculuk?.[alan] as string | number | undefined) || '';
  }
  arabuluculukFormAlanGuncelle(alan: keyof ArabuluculukDosyasi, deger: any) {
    (this.islemGorenArabuluculuk as any)[alan] = deger;
  }
  arabuluculukAlanMetni(dosya: Partial<ArabuluculukDosyasi> | null | undefined, alan: keyof ArabuluculukDosyasi) {
    return String(dosya?.[alan] || '').trim() || '-';
  }
  arabuluculukAlanTarihiMetni(dosya: Partial<ArabuluculukDosyasi> | null | undefined, alan: keyof ArabuluculukDosyasi) {
    const tarih = String(dosya?.[alan] || '').trim();
    return tarih ? this.formatTarih(tarih) : '-';
  }
  getArabuluculukTaksitlerDetayListesi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    const taksitler = (dosya?.taksitler || []).filter(taksit => String(taksit?.tutar || '').trim() || taksit?.odemeTarihi);
    if (!taksitler.length) return '-';
    return taksitler.map(taksit => `Taksit ${taksit.sira}: ${taksit.tutar || '-'} * ${taksit.odemeTarihi ? this.formatTarih(taksit.odemeTarihi) : '-'}`).join('\n');
  }
  arabuluculukOdemeAlanlariniHazirla(hedef: Partial<ArabuluculukDosyasi>) {
    hedef.anlasmaSartlari = this.formatMetin(hedef.anlasmaSartlari);
    hedef.odemeTarihi = hedef.odemeTarihi || '';
    hedef.arabulucuUcretiTutari = this.formatMetin(hedef.arabulucuUcretiTutari);
    hedef.arabulucuUcretiOdemeTarihi = hedef.arabulucuUcretiOdemeTarihi || '';
    this.arabuluculukAnlasmaKalemleri.forEach(kalem => {
      hedef[kalem.tutarAlan] = this.formatMetin(hedef[kalem.tutarAlan] as string | undefined) as any;
      hedef[kalem.tarihAlan] = ((hedef[kalem.tarihAlan] as string | undefined) || '') as any;
    });
    hedef.odenecekToplamTutarRakamla = this.getArabuluculukOdenecekToplamTutarRakamla(hedef);
    hedef.odenecekToplamTutarYaziyla = this.getArabuluculukOdenecekToplamTutarYaziyla(hedef);
    if (hedef.taksitleOdeme) {
      hedef.taksitler = this.arabuluculukTaksitleriniHazirla(hedef.taksitler, hedef.taksitSayisi);
      hedef.taksitSayisi = hedef.taksitler.length;
    } else {
      hedef.taksitleOdeme = false;
      hedef.taksitSayisi = 0;
      hedef.taksitler = [];
    }
  }
  arabuluculukAnlasmaOdemeBilgileriVarMi(dosya?: Partial<ArabuluculukDosyasi> | null) {
    return !!(
      dosya?.iseGirisTarihi ||
      dosya?.istenCikisTarihi ||
      dosya?.odemeTarihi ||
      dosya?.odenecekToplamTutarRakamla ||
      dosya?.odenecekToplamTutarYaziyla ||
      dosya?.arabulucuUcretiTutari ||
      dosya?.arabulucuUcretiOdemeTarihi ||
      dosya?.kidemTazminatiTutari ||
      dosya?.kidemTazminatiOdemeTarihi ||
      dosya?.ihbarTazminatiTutari ||
      dosya?.ihbarTazminatiOdemeTarihi ||
      dosya?.yillikUcretliIzinTutari ||
      dosya?.yillikUcretliIzinOdemeTarihi ||
      dosya?.bakiyeUcretAlacagi ||
      dosya?.bakiyeUcretAlacagiOdemeTarihi ||
      dosya?.primAlacagi ||
      dosya?.primAlacagiOdemeTarihi ||
      dosya?.iseBaslatmamaVeBostaGecenSureAlacagi ||
      dosya?.iseBaslatmamaVeBostaGecenSureOdemeTarihi ||
      dosya?.ekOdeme ||
      dosya?.ekOdemeOdemeTarihi ||
      dosya?.taksitleOdeme ||
      (dosya?.taksitler || []).some(taksit => String(taksit?.tutar || '').trim() || taksit?.odemeTarihi)
    );
  }
  googleDosyaIdAyikla(girdi?: string) {
    const deger = (girdi || '').trim();
    if (!deger) return '';

    const eslesmeler = [
      /\/document\/d\/([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/
    ];

    for (const desen of eslesmeler) {
      const eslesme = deger.match(desen);
      if (eslesme?.[1]) return eslesme[1];
    }

    return /^[a-zA-Z0-9_-]{20,}$/.test(deger) ? deger : '';
  }
  getArabuluculukTaraflari(dosya: ArabuluculukDosyasi, tip?: ArabuluculukTaraf['tip']) {
    const taraflar = (dosya.taraflar || [])
      .filter(taraf => !tip || taraf.tip === tip)
      .map(taraf => taraf.isim)
      .filter(Boolean);
    return taraflar.length > 0 ? taraflar.join(', ') : '-';
  }
  getArabuluculukTarafListesi(dosya: ArabuluculukDosyasi, tip?: ArabuluculukTaraf['tip']) {
    return (dosya.taraflar || []).filter(taraf => !tip || taraf.tip === tip);
  }
  arabuluculukTarafYerTutuculariniOlustur(onEk: string, taraflar: ArabuluculukTaraf[], maxTarafSayisi = 20) {
    const yerTutucular: Record<string, string> = {
      [`${onEk}_SAYISI`]: String(taraflar.length || 0)
    };

    for (let index = 0; index < maxTarafSayisi; index += 1) {
      const sira = index + 1;
      const taraf = taraflar[index];
      const adres = this.adresBilesenleriniHazirla(taraf);
      yerTutucular[`${onEk}_${sira}_AD`] = taraf?.isim || '-';
      yerTutucular[`${onEk}_${sira}_TC_VKN`] = taraf?.tcVergiNo || '-';
      yerTutucular[`${onEk}_${sira}_VERGI_DAIRESI`] = taraf?.vergiDairesi || '-';
      yerTutucular[`${onEk}_${sira}_ADRES`] = adres.adres || '-';
      yerTutucular[`${onEk}_${sira}_IL`] = adres.il || '-';
      yerTutucular[`${onEk}_${sira}_ILCE`] = adres.ilce || '-';
      yerTutucular[`${onEk}_${sira}_ACIK_ADRES`] = adres.acikAdres || '-';
      yerTutucular[`${onEk}_${sira}_TELEFON`] = taraf?.telefon || '-';
      yerTutucular[`${onEk}_${sira}_EPOSTA`] = taraf?.eposta || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL`] = taraf?.vekil || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_TELEFON`] = taraf?.vekilTelefon || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_EPOSTA`] = taraf?.vekilEposta || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_BARO`] = taraf?.vekilBaroBilgisi || '-';
    }

    return yerTutucular;
  }
  arabuluculukTaksitYerTutuculariniOlustur(taksitler: ArabuluculukTaksit[] = [], maxTaksitSayisi = this.maksimumArabuluculukTaksitSayisi) {
    const doluTaksitler = taksitler.filter(taksit => String(taksit?.tutar || '').trim() || taksit?.odemeTarihi);
    const yerTutucular: Record<string, string> = {
      TAKSITLI_ODEME: doluTaksitler.length ? 'Evet' : 'Hayır',
      TAKSIT_SAYISI: String(doluTaksitler.length || 0),
      TAKSITLER_DETAY_LISTESI: this.getArabuluculukTaksitlerDetayListesi({ taksitler: doluTaksitler })
    };
    for (let index = 0; index < maxTaksitSayisi; index += 1) {
      const sira = index + 1;
      const taksit = doluTaksitler[index];
      yerTutucular[`TAKSIT_${sira}_TUTARI`] = taksit?.tutar || '-';
      yerTutucular[`TAKSIT_${sira}_ODEME_TARIHI`] = taksit?.odemeTarihi ? this.formatTarih(taksit.odemeTarihi) : '-';
    }
    return yerTutucular;
  }
  arabuluculukTarafDetayListesiOlustur(taraflar: ArabuluculukTaraf[], tipEtiketi?: string) {
    if (!taraflar.length) return 'Kayıt bulunmuyor.';

    return taraflar.map((taraf, index) => {
      const baslik = `${index + 1}. ${tipEtiketi ? `${tipEtiketi}: ` : ''}${taraf.isim || '-'}`;
      const adres = this.adresBilesenleriniHazirla(taraf);
      const satirlar = [
        `TC No / Vergi No: ${taraf.tcVergiNo || '-'}`,
        `Vergi Dairesi: ${taraf.vergiDairesi || '-'}`,
        `Adres: ${adres.adres || '-'}`,
        `İl: ${adres.il || '-'}`,
        `İlçe: ${adres.ilce || '-'}`,
        `Açık Adres: ${adres.acikAdres || '-'}`,
        `Telefon: ${taraf.telefon || '-'}`,
        `E-posta: ${taraf.eposta || '-'}`,
        `Vekil: ${taraf.vekil || '-'}`,
        `Vekil Telefon: ${taraf.vekilTelefon || '-'}`,
        `Vekil E-posta: ${taraf.vekilEposta || '-'}`,
        `Vekil Baro Bilgisi: ${taraf.vekilBaroBilgisi || '-'}`
      ];
      return [baslik, ...satirlar].join('\n');
    }).join('\n\n');
  }
  getArabuluculukMuvekkilAdi(dosya: ArabuluculukDosyasi) {
    return this.muvekkiller.find(muvekkil => muvekkil.id === dosya.muvekkilId)?.adSoyad || this.getArabuluculukTaraflari(dosya, 'Başvurucu');
  }
  arabuluculukBelgeYerTutuculariniOlustur(dosya: ArabuluculukDosyasi) {
    const basvurucular = this.getArabuluculukTarafListesi(dosya, 'Başvurucu');
    const digerTaraflar = this.getArabuluculukTarafListesi(dosya, 'Diğer Taraf');
    const odemeYerTutuculari = this.arabuluculukAnlasmaKalemleri.reduce((yerTutucular, kalem) => {
      const tutarDegeri = (dosya[kalem.tutarAlan] as string | undefined) || '-';
      const tarihDegeri = (dosya[kalem.tarihAlan] as string | undefined) || '';
      yerTutucular[`${kalem.yerTutucuOnEki}_TUTARI`] = tutarDegeri || '-';
      yerTutucular[`${kalem.yerTutucuOnEki}_ODEME_TARIHI`] = tarihDegeri ? this.formatTarih(tarihDegeri) : '-';
      return yerTutucular;
    }, {} as Record<string, string>);

    return {
      BELGE_TARIHI: this.formatTarih(new Date().toISOString()),
      ARABULUCULUK_NO: dosya.arabuluculukNo || '-',
      BURO_NO: dosya.buroNo || '-',
      BURO: dosya.buro || '-',
      BASVURU_TURU: dosya.basvuruTuru || '-',
      BASVURU_KONUSU: dosya.basvuruKonusu || '-',
      ANLASMA_SARTLARI: dosya.anlasmaSartlari || '-',
      ISE_GIRIS_TARIHI: dosya.iseGirisTarihi ? this.formatTarih(dosya.iseGirisTarihi) : '-',
      ISTEN_CIKIS_TARIHI: dosya.istenCikisTarihi ? this.formatTarih(dosya.istenCikisTarihi) : '-',
      ODEME_TARIHI: dosya.odemeTarihi ? this.formatTarih(dosya.odemeTarihi) : '-',
      ODENECEK_TOPLAM_TUTAR_RAKAMLA: this.getArabuluculukOdenecekToplamTutarRakamla(dosya) || dosya.odenecekToplamTutarRakamla || '-',
      ODENECEK_TOPLAM_TUTAR_YAZIYLA: this.getArabuluculukOdenecekToplamTutarYaziyla(dosya) || dosya.odenecekToplamTutarYaziyla || '-',
      ARABULUCU_UCRETI_TUTARI: dosya.arabulucuUcretiTutari || '-',
      ARABULUCU_UCRETI_ODEME_TARIHI: dosya.arabulucuUcretiOdemeTarihi ? this.formatTarih(dosya.arabulucuUcretiOdemeTarihi) : '-',
      UYUSMAZLIK_TURU: dosya.uyusmazlikTuru || '-',
      MUVEKKIL: this.getArabuluculukMuvekkilAdi(dosya) || '-',
      BASVURUCU: this.getArabuluculukTaraflari(dosya, 'Başvurucu'),
      DIGER_TARAFLAR: this.getArabuluculukTaraflari(dosya, 'Diğer Taraf'),
      TARAFLAR: this.getArabuluculukTaraflari(dosya),
      BASVURUCU_DETAY_LISTESI: this.arabuluculukTarafDetayListesiOlustur(basvurucular),
      DIGER_TARAF_DETAY_LISTESI: this.arabuluculukTarafDetayListesiOlustur(digerTaraflar),
      TARAFLAR_DETAY_LISTESI: this.arabuluculukTarafDetayListesiOlustur([
        ...basvurucular.map(taraf => ({ ...taraf, isim: `Başvurucu - ${taraf.isim || '-'}` })),
        ...digerTaraflar.map(taraf => ({ ...taraf, isim: `Diğer Taraf - ${taraf.isim || '-'}` }))
      ]),
      TOPLANTI_TARIHI: dosya.toplantiTarihi ? this.formatTarih(dosya.toplantiTarihi) : '-',
      TOPLANTI_SAATI: dosya.toplantiSaati ? this.formatSaat(dosya.toplantiSaati) : '-',
      TOPLANTI_YONTEMI: dosya.toplantiYontemi || '-',
      ...odemeYerTutuculari,
      ...this.arabuluculukTaksitYerTutuculariniOlustur(dosya.taksitler || []),
      ...this.arabuluculukTarafYerTutuculariniOlustur('BASVURUCU', basvurucular),
      ...this.arabuluculukTarafYerTutuculariniOlustur('DIGER_TARAF', digerTaraflar)
    };
  }
  async googleGisHazirBekle() {
    if (typeof google !== 'undefined' && google?.accounts?.oauth2) return;

    await new Promise<void>((resolve, reject) => {
      let deneme = 0;
      const zamanlayici = window.setInterval(() => {
        if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
          window.clearInterval(zamanlayici);
          resolve();
          return;
        }

        deneme += 1;
        if (deneme >= 100) {
          window.clearInterval(zamanlayici);
          reject(new Error('Google oturum altyapısı yüklenemedi. Sayfayı yenileyip tekrar deneyin.'));
        }
      }, 100);
    });
  }
  async googleErisimBelirteciAl() {
    if (!this.googleDocsEntegrasyonuHazirMi()) {
      throw new Error('Google Docs ayarı henüz tamamlanmadı. Önce Google istemci kimliğini eklememiz gerekiyor.');
    }

    await this.googleGisHazirBekle();

    return await new Promise<string>((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DOCS_CONFIG.clientId,
        scope: GOOGLE_DOCS_CONFIG.scopes.join(' '),
        callback: (yanit: any) => {
          if (!yanit?.access_token) {
            reject(new Error(yanit?.error || 'Google yetkisi alınamadı.'));
            return;
          }

          this.googleDocsYetkiIstendi = true;
          resolve(yanit.access_token);
        },
        error_callback: () => reject(new Error('Google izin penceresi kapatıldı veya erişim reddedildi.'))
      });

      tokenClient.requestAccessToken({ prompt: this.googleDocsYetkiIstendi ? '' : 'consent' });
    });
  }
  async googleJsonIstek(url: string, token: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const yanit = await fetch(url, { ...init, headers });
    if (!yanit.ok) {
      const hataMetni = await yanit.text();
      throw new Error(hataMetni || 'Google servis isteği tamamlanamadı.');
    }

    return await yanit.json();
  }
  async arabuluculukGoogleBelgesiOlustur(dosya: ArabuluculukDosyasi, sablon: EvrakBaglantisi, varsayilanSablonIsmi: string, belgeBasligi: string) {
    const sablonDosyaId = this.googleDosyaIdAyikla(sablon.url);
    if (!sablonDosyaId) {
      throw new Error(`${belgeBasligi} şablonuna geçerli bir Google Docs bağlantısı girin.`);
    }

    const token = await this.googleErisimBelirteciAl();
    const belgeAdi = `${belgeBasligi} - ${dosya.buroNo ? `${dosya.buroNo} - ` : ''}${dosya.arabuluculukNo || dosya.id}`;
    const kopya = await this.googleJsonIstek(`https://www.googleapis.com/drive/v3/files/${sablonDosyaId}/copy?supportsAllDrives=true&fields=id,webViewLink`, token, {
      method: 'POST',
      body: JSON.stringify({ name: belgeAdi })
    });

    let alanlarDolduruldu = false;
    try {
      const yerTutucular = this.arabuluculukBelgeYerTutuculariniOlustur(dosya);
      const requests = Object.entries(yerTutucular).map(([anahtar, deger]) => ({
        replaceAllText: {
          containsText: {
            text: this.googleYerTutucuMetni(anahtar),
            matchCase: true
          },
          replaceText: deger || '-'
        }
      }));

      await this.googleJsonIstek(`https://docs.googleapis.com/v1/documents/${kopya.id}:batchUpdate`, token, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
      alanlarDolduruldu = true;
    } catch {
      alanlarDolduruldu = false;
    }

    const k: ArabuluculukDosyasi = JSON.parse(JSON.stringify(dosya));
    if (!k.evraklar) k.evraklar = [];
    k.evraklar.unshift({
      id: Date.now(),
      isim: sablon.isim || varsayilanSablonIsmi,
      url: kopya.webViewLink || `https://docs.google.com/document/d/${kopya.id}/edit`,
      tarih: new Date().toISOString(),
      tamamlandiMi: false,
      tamamlanmaTarihi: '',
      yaziRengi: this.getEvrakYaziRengi(sablon.yaziRengi)
    });

    const belgeBasligiKucuk = belgeBasligi.toLocaleLowerCase('tr-TR');
    const aciklama = alanlarDolduruldu
      ? `Google Docs şablonundan ${belgeBasligiKucuk} üretildi.`
      : 'Google Docs kopyası oluşturuldu, ancak bazı alanlar otomatik doldurulamadı.';
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', `${belgeBasligi} oluşturuldu`, aciklama);
    await this.arabuluculukKaydetCloud(
      kayitli,
      alanlarDolduruldu
        ? `${belgeBasligi} oluşturuldu ve evraklara eklendi.`
        : `${belgeBasligi} oluşturuldu. Evraklara eklendi, fakat bazı yer tutucular doldurulamadı.`
    );
  }
  async davetMektubuOlustur() {
    if (this.davetMektubuOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    const sablon = this.getDavetMektubuSablonu();
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne en az "${this.getDavetMektubuSablonBeklentisi()}" adlı Google Docs şablonu ekleyin. İsterseniz genel "Davet Mektubu" şablonu da kullanabilirsiniz.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdiVarMi(sablon.isim || GOOGLE_DOCS_CONFIG.davetMektubuTemplateName)) {
      this.bildirimGoster('info', 'Davet mektubu zaten var', 'Bu dosyada seçilen türe ait davet mektubu bağlantısı zaten bulunuyor.');
      return;
    }

    this.davetMektubuOlusturuluyor = true;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        GOOGLE_DOCS_CONFIG.davetMektubuTemplateName,
        'Davet Mektubu'
      );
    } catch (e: any) {
      this.bildirimGoster('error', 'Davet mektubu oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.davetMektubuOlusturuluyor = false;
      this.cdr.detectChanges();
    }
  }
  async bilgilendirmeTutanagiOlustur() {
    if (this.bilgilendirmeTutanagiOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    const sablon = this.getBilgilendirmeTutanagiSablonu();
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne "${GOOGLE_DOCS_CONFIG.bilgilendirmeTutanagiTemplateName}" adlı Google Docs şablonunu ekleyin.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdiVarMi(this.getBilgilendirmeTutanagiSeciliSablonIsmi())) {
      this.bildirimGoster('info', 'Bilgilendirme tutanağı zaten var', 'Bu dosyada bilgilendirme tutanağı bağlantısı zaten bulunuyor.');
      return;
    }

    this.bilgilendirmeTutanagiOlusturuluyor = true;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        GOOGLE_DOCS_CONFIG.bilgilendirmeTutanagiTemplateName,
        'Bilgilendirme Tutanağı'
      );
    } catch (e: any) {
      this.bildirimGoster('error', 'Bilgilendirme tutanağı oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.bilgilendirmeTutanagiOlusturuluyor = false;
      this.cdr.detectChanges();
    }
  }
  async arabuluculukBelirlemeTutanagiOlustur(tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    if (this.arabuluculukBelirlemeTutanagiOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    const sablon = this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName, tarafSayisi);
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne "${this.getArabuluculukCokTarafliSablonBeklentisi(GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName, tarafSayisi)}" adlı Google Docs şablonunu ekleyin. İsterseniz standart "${GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName}" şablonu da kullanılabilir.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdlarindanBiriVarMi(this.getArabuluculukCokTarafliSablonAdaylari(GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName, tarafSayisi))) {
      this.bildirimGoster('info', 'Arabuluculuk belirleme tutanağı zaten var', 'Bu dosyada arabuluculuk belirleme tutanağı bağlantısı zaten bulunuyor.');
      return;
    }

    this.arabuluculukBelirlemeTutanagiOlusturuluyor = true;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        GOOGLE_DOCS_CONFIG.arabuluculukBelirlemeTutanagiTemplateName,
        'Arabuluculuk Belirleme Tutanağı'
      );
      this.arabuluculukBelgeSecenekMenusunuKapat();
    } catch (e: any) {
      this.bildirimGoster('error', 'Arabuluculuk belirleme tutanağı oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.arabuluculukBelirlemeTutanagiOlusturuluyor = false;
      this.cdr.detectChanges();
    }
  }
  async sonTutanakIhtiyariAnlasmaOlustur(tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    if (this.sonTutanakIhtiyariAnlasmaOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    if (dosya.basvuruTuru !== 'İhtiyari') {
      this.bildirimGoster('info', 'Belge tipi uygun değil', 'Son Tutanak İhtiyari Anlaşma yalnız ihtiyari arabuluculuk dosyalarında oluşturulabilir.');
      return;
    }

    const sablon = this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName, tarafSayisi);
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne "${this.getArabuluculukCokTarafliSablonBeklentisi(GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName, tarafSayisi)}" adlı Google Docs şablonunu ekleyin. İsterseniz standart "${GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName}" şablonu da kullanılabilir.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdlarindanBiriVarMi(this.getArabuluculukCokTarafliSablonAdaylari(GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName, tarafSayisi))) {
      this.bildirimGoster('info', 'Son tutanak zaten var', 'Bu dosyada Son Tutanak İhtiyari Anlaşma bağlantısı zaten bulunuyor.');
      return;
    }

    this.sonTutanakIhtiyariAnlasmaOlusturuluyor = true;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        GOOGLE_DOCS_CONFIG.sonTutanakIhtiyariAnlasmaTemplateName,
        'Son Tutanak İhtiyari Anlaşma'
      );
      this.arabuluculukBelgeSecenekMenusunuKapat();
    } catch (e: any) {
      this.bildirimGoster('error', 'Son tutanak oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.sonTutanakIhtiyariAnlasmaOlusturuluyor = false;
      this.cdr.detectChanges();
    }
  }
  async ihtiyariAnlasmaBelgesiOlustur(tarafSayisi = this.getAktifArabuluculukTarafSayisi()) {
    if (this.ihtiyariAnlasmaBelgesiOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    if (dosya.basvuruTuru !== 'İhtiyari') {
      this.bildirimGoster('info', 'Belge tipi uygun değil', 'Anlaşma belgesi yalnız ihtiyari arabuluculuk dosyalarında oluşturulabilir.');
      return;
    }

    const sablon = this.getArabuluculukCokTarafliSablonu(GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName, tarafSayisi);
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne "${this.getArabuluculukCokTarafliSablonBeklentisi(GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName, tarafSayisi)}" adlı Google Docs şablonunu ekleyin. İsterseniz standart "${GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName}" şablonu da kullanılabilir.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdlarindanBiriVarMi(this.getArabuluculukCokTarafliSablonAdaylari(GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName, tarafSayisi))) {
      this.bildirimGoster('info', 'Anlaşma belgesi zaten var', 'Bu dosyada ihtiyari anlaşma belgesi bağlantısı zaten bulunuyor.');
      return;
    }

    this.ihtiyariAnlasmaBelgesiOlusturuluyor = true;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        GOOGLE_DOCS_CONFIG.ihtiyariAnlasmaBelgesiTemplateName,
        'İhtiyari Anlaşma Belgesi'
      );
      this.arabuluculukBelgeSecenekMenusunuKapat();
    } catch (e: any) {
      this.bildirimGoster('error', 'Anlaşma belgesi oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.ihtiyariAnlasmaBelgesiOlusturuluyor = false;
      this.cdr.detectChanges();
    }
  }
  async topluArabuluculukBelgesiOlustur(tarafSayisi: number) {
    if (this.topluDosyaOlusturuluyor) return;

    const dosya = this.getAktifArabuluculukDosyasi();
    if (!dosya) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası bulunamadı', 'Önce bir arabuluculuk dosyası açın.');
      return;
    }

    const sablon = this.getArabuluculukTopluDosyaSablonu(tarafSayisi);
    if (!sablon?.url) {
      this.bildirimGoster('error', 'Şablon eksik', `Şablonlar > Arabuluculuk bölümüne "${this.getArabuluculukTopluDosyaSablonBeklentisi(tarafSayisi)}" adlı Google Docs şablonunu ekleyin.`);
      return;
    }

    if (this.aktifDosyadaEvrakAdiVarMi(this.getArabuluculukTopluDosyaSeciliSablonIsmi(tarafSayisi))) {
      this.bildirimGoster('info', 'Toplu dosya zaten var', 'Bu dosyada seçtiğiniz taraf sayısına ait toplu belge bağlantısı zaten bulunuyor.');
      return;
    }

    this.topluDosyaOlusturuluyor = true;
    this.topluDosyaOlusturulanTarafSayisi = tarafSayisi;

    try {
      await this.arabuluculukGoogleBelgesiOlustur(
        dosya,
        sablon,
        this.getArabuluculukTopluDosyaSablonBeklentisi(tarafSayisi),
        `Toplu Dosya Oluştur - ${tarafSayisi} Taraflı`
      );
      this.topluDosyaSecenekleriAcik = false;
    } catch (e: any) {
      this.bildirimGoster('error', 'Toplu dosya oluşturulamadı', e?.message || 'Google Docs bağlantısını kontrol edip tekrar deneyin.');
    } finally {
      this.topluDosyaOlusturuluyor = false;
      this.topluDosyaOlusturulanTarafSayisi = null;
      this.cdr.detectChanges();
    }
  }

  evrakEkle() {
    if (!this.yeniEvrak.isim) return;
    this.yeniEvrak.isim = this.formatMetin(this.yeniEvrak.isim);
    let url = (this.yeniEvrak.url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const arabuluculukSablonAlanlari = this.aktifSayfa === 'sablonlar' && this.aktifSablonSekmesi === 'arabuluculuk'
      ? this.hazirlaArabuluculukSablonAlanlari(this.yeniEvrak)
      : {};
    const yeni = { id: Date.now(), isim: this.yeniEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), ekler: [], tebligTarihi: this.yeniEvrak.tebligTarihi, sonEylemTarihi: this.yeniEvrak.sonEylemTarihi, tamamlandiMi: false, tamamlanmaTarihi: '', yaziRengi: this.getEvrakYaziRengi(this.yeniEvrak.yaziRengi), ...arabuluculukSablonAlanlari };
    if (this.aktifSayfa === 'sablonlar') {
      this.sablonlar[this.aktifSablonSekmesi].unshift(yeni); this.sablonlariKaydetCloud('Yeni şablon listeye eklendi.');
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (!k.evraklar) k.evraklar = []; k.evraklar.unshift(yeni); const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak bağlantısı eklendi', `${yeni.isim}${yeni.sonEylemTarihi ? ' * Son eylem: ' + this.formatTarihKisa(yeni.sonEylemTarihi) : ''}`); this.aktifDosyaKaydet(kayitli, 'Evrak bağlantısı dosyaya eklendi.');
    }
    this.yeniEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi, ...this.hazirlaArabuluculukSablonAlanlari() };
  }
  
  evrakDuzenleBaslat(evrak: EvrakBaglantisi, parentId: number | null = null) { this.duzenlenenEvrakId = evrak.id; this.duzenlenenEvrakParentId = parentId; this.duzenlenenEvrakOrijinalSonEylemTarihi = evrak.sonEylemTarihi || ''; this.duzenlenenEvrak = { ...evrak, yaziRengi: this.getEvrakYaziRengi(evrak.yaziRengi), ...(this.aktifSayfa === 'sablonlar' && this.aktifSablonSekmesi === 'arabuluculuk' && !parentId ? this.hazirlaArabuluculukSablonAlanlari(evrak) : {}) }; }
  evrakDuzenleIptal() { this.duzenlenenEvrakId = null; this.duzenlenenEvrakParentId = null; this.duzenlenenEvrakOrijinalSonEylemTarihi = ''; this.duzenlenenEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi, ...this.hazirlaArabuluculukSablonAlanlari() }; }
  
  evrakGuncelleKaydet() {
    if (!this.duzenlenenEvrak.isim) return;
    this.duzenlenenEvrak.isim = this.formatMetin(this.duzenlenenEvrak.isim);
    let url = (this.duzenlenenEvrak.url || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url; this.duzenlenenEvrak.url = url; this.duzenlenenEvrak.yaziRengi = this.getEvrakYaziRengi(this.duzenlenenEvrak.yaziRengi);
    if (this.aktifSayfa === 'sablonlar' && this.aktifSablonSekmesi === 'arabuluculuk' && !this.duzenlenenEvrakParentId) {
      Object.assign(this.duzenlenenEvrak, this.hazirlaArabuluculukSablonAlanlari(this.duzenlenenEvrak));
    }
    if ((this.duzenlenenEvrak.sonEylemTarihi || '') !== this.duzenlenenEvrakOrijinalSonEylemTarihi) { this.duzenlenenEvrak.tamamlandiMi = false; this.duzenlenenEvrak.tamamlanmaTarihi = ''; }
    if (this.aktifSayfa === 'sablonlar') {
      const sl = this.sablonlar[this.aktifSablonSekmesi];
      if (this.duzenlenenEvrakParentId) { const p = sl.find((e:any) => e.id === this.duzenlenenEvrakParentId); if (p && p.ekler) { const i = p.ekler.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) p.ekler[i] = this.duzenlenenEvrak as EvrakBaglantisi; } } 
      else { const i = sl.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) sl[i] = this.duzenlenenEvrak as EvrakBaglantisi; }
      this.sablonlariKaydetCloud('Şablon bilgileri güncellendi.');
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya};
      if (this.duzenlenenEvrakParentId) { const p = k.evraklar!.find((e:any) => e.id === this.duzenlenenEvrakParentId); if (p && p.ekler) { const i = p.ekler.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) p.ekler[i] = this.duzenlenenEvrak as EvrakBaglantisi; } } 
      else { const i = k.evraklar!.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) k.evraklar![i] = this.duzenlenenEvrak as EvrakBaglantisi; }
      const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', this.duzenlenenEvrakParentId ? 'Alt evrak güncellendi' : 'Evrak bilgileri güncellendi', `${this.duzenlenenEvrak.isim || 'Evrak'} kaydı düzenlendi.`);
      this.aktifDosyaKaydet(kayitli, 'Evrak bilgileri güncellendi.');
    }
    this.evrakDuzenleIptal();
  }
  
  evrakYukari(index: number) { if (index === 0) return; if (this.aktifSayfa === 'sablonlar') { const sl = this.sablonlar[this.aktifSablonSekmesi]; [sl[index - 1], sl[index]] = [sl[index], sl[index - 1]]; this.sablonlariKaydetCloud(); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; [k.evraklar![index - 1], k.evraklar![index]] = [k.evraklar![index], k.evraklar![index - 1]]; this.aktifDosyaKaydet(k); } }
  evrakAsagi(index: number) { if (this.aktifSayfa === 'sablonlar') { const sl = this.sablonlar[this.aktifSablonSekmesi]; if (index === sl.length - 1) return; [sl[index + 1], sl[index]] = [sl[index], sl[index + 1]]; this.sablonlariKaydetCloud(); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (index === k.evraklar!.length - 1) return; [k.evraklar![index + 1], k.evraklar![index]] = [k.evraklar![index], k.evraklar![index + 1]]; this.aktifDosyaKaydet(k); } }
  ekEvrakYukari(parent: EvrakBaglantisi, index: number) { if (index === 0) return; if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parent.id); if (p && p.ekler) { [p.ekler[index - 1], p.ekler[index]] = [p.ekler[index], p.ekler[index - 1]]; this.sablonlariKaydetCloud(); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parent.id); if (p && p.ekler) { [p.ekler[index - 1], p.ekler[index]] = [p.ekler[index], p.ekler[index - 1]]; this.aktifDosyaKaydet(k); } } }
  ekEvrakAsagi(parent: EvrakBaglantisi, index: number) { if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parent.id); if (p && p.ekler && index < p.ekler.length - 1) { [p.ekler[index + 1], p.ekler[index]] = [p.ekler[index], p.ekler[index + 1]]; this.sablonlariKaydetCloud(); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parent.id); if (p && p.ekler && index < p.ekler.length - 1) { [p.ekler[index + 1], p.ekler[index]] = [p.ekler[index], p.ekler[index + 1]]; this.aktifDosyaKaydet(k); } } }
  ekEvrakFormAc(parentId: number) { this.ekEklenenEvrakId = parentId; this.yeniEkEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi }; this.evrakDuzenleIptal(); this.acikKlasorler[parentId] = true; }
  ekEvrakFormKapat() { this.ekEklenenEvrakId = null; this.yeniEkEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi }; }
  ekEvrakKaydet(parentId: number) {
    if (!this.yeniEkEvrak.isim) return;
    this.yeniEkEvrak.isim = this.formatMetin(this.yeniEkEvrak.isim);
    let url = (this.yeniEkEvrak.url || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const y = { id: Date.now(), isim: this.yeniEkEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), tebligTarihi: this.yeniEkEvrak.tebligTarihi, sonEylemTarihi: this.yeniEkEvrak.sonEylemTarihi, tamamlandiMi: false, tamamlanmaTarihi: '', yaziRengi: this.getEvrakYaziRengi(this.yeniEkEvrak.yaziRengi) };
    if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); this.sablonlariKaydetCloud('Alt şablon eklendi.'); } } 
    else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Alt evrak bağlantısı eklendi', `${p.isim} altına ${y.isim} eklendi.`); this.aktifDosyaKaydet(kayitli, 'Alt evrak bağlantısı eklendi.'); } }
    this.ekEvrakFormKapat();
  }
  async evrakSil(id: number) {
    if (this.aktifSayfa === 'sablonlar') {
      const oncekiSablonlar = this.veriKopyala(this.sablonlar);
      this.sablonlar[this.aktifSablonSekmesi] = this.sablonlar[this.aktifSablonSekmesi].filter((e:any) => e.id !== id);
      const kaydedildi = await this.sablonlariKaydetCloud();
      if (!kaydedildi) {
        this.sablonlar = oncekiSablonlar;
        return;
      }
      this.geriAlinabilirBasariBildirimiGoster(
        'Şablon kaldırıldı',
        'Şablon listesinden çıkarıldı.',
        async () => {
          this.sablonlar = this.veriKopyala(oncekiSablonlar);
          return this.sablonlariKaydetCloud();
        },
        'Şablon geri yüklendi',
        'Silinen şablon yeniden listeye alındı.'
      );
      return;
    }
    if(!this.aktifDosya) return;
    const oncekiKayit = this.veriKopyala(this.aktifDosya);
    const kaydetFonk = this.aktifDetayKaydetFonksiyonu();
    const k: any = {...this.aktifDosya};
    const silinen = k.evraklar!.find((e:any) => e.id === id);
    k.evraklar = k.evraklar!.filter((e:any) => e.id !== id);
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak bağlantısı silindi', silinen ? `${silinen.isim} kayıttan kaldırıldı.` : 'Seçili evrak kaydı kaldırıldı.');
    const kaydedildi = await kaydetFonk(kayitli);
    if (!kaydedildi) return;
    this.geriAlinabilirBasariBildirimiGoster(
      'Evrak bağlantısı silindi',
      'Kayıt dosyadan kaldırıldı.',
      () => kaydetFonk(this.veriKopyala(oncekiKayit)),
      'Evrak bağlantısı geri yüklendi',
      'Silinen evrak kaydı yeniden dosyaya işlendi.'
    );
  }
  async ekEvrakSil(parentId: number, ekId: number) {
    if (this.aktifSayfa === 'sablonlar') {
      const oncekiSablonlar = this.veriKopyala(this.sablonlar);
      const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId);
      if (p && p.ekler) {
        p.ekler = p.ekler.filter((e:any) => e.id !== ekId);
        const kaydedildi = await this.sablonlariKaydetCloud();
        if (!kaydedildi) {
          this.sablonlar = oncekiSablonlar;
          return;
        }
        this.geriAlinabilirBasariBildirimiGoster(
          'Alt şablon silindi',
          'Kayıt şablon listesinden çıkarıldı.',
          async () => {
            this.sablonlar = this.veriKopyala(oncekiSablonlar);
            return this.sablonlariKaydetCloud();
          },
          'Alt şablon geri yüklendi',
          'Silinen alt şablon yeniden listeye alındı.'
        );
      }
      return;
    }
    if(!this.aktifDosya) return;
    const oncekiKayit = this.veriKopyala(this.aktifDosya);
    const kaydetFonk = this.aktifDetayKaydetFonksiyonu();
    const k: any = {...this.aktifDosya};
    const p = k.evraklar!.find((e:any) => e.id === parentId);
    const silinen = p?.ekler?.find((e:any) => e.id === ekId);
    if (p && p.ekler) {
      p.ekler = p.ekler.filter((e:any) => e.id !== ekId);
      const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Alt evrak bağlantısı silindi', silinen ? `${p.isim} altından ${silinen.isim} kaldırıldı.` : 'Seçili alt evrak kaldırıldı.');
      const kaydedildi = await kaydetFonk(kayitli);
      if (!kaydedildi) return;
      this.geriAlinabilirBasariBildirimiGoster(
        'Alt evrak bağlantısı silindi',
        'Kayıt dosyadan kaldırıldı.',
        () => kaydetFonk(this.veriKopyala(oncekiKayit)),
        'Alt evrak bağlantısı geri yüklendi',
        'Silinen alt evrak yeniden dosyaya işlendi.'
      );
    }
  }

  getDosyaFinans(dosya: any) {
    let isArabuluculuk = dosya.buroNo !== undefined;
    let v = 0, g = 0, c = 0, t = 0;
    (dosya.finansalIslemler || []).forEach((i:any) => { 
      if (isArabuluculuk) {
        if (i.tur === 'Ödeme' || i.tur === 'Ödeme Tarihi' || i.tur === 'Vekalet Ücreti') {
          const hesap = this.getArabuluculukMakbuzHesabi(i, dosya);
          v += hesap?.netTutar || 0;
          t += hesap?.netTutar || 0;
        }
      } else {
        if (i.tur === 'Vekalet Ücreti') { v += i.tutar; t += i.tutar; } 
        if (i.tur === 'Masraf Avansı (Giriş)') g += i.tutar; 
        if (i.tur === 'Masraf Harcaması (Çıkış)') c += i.tutar; 
      }
    });
    let anaUcret = dosya.vekaletUcreti || 0; if (isArabuluculuk) anaUcret = this.getArabuluculukHizmetUcretiHesabi(dosya)?.netTutar || 0;
    return { kalanVekalet: Math.max(0, anaUcret - v), emanetBakiye: g - c, toplamTahsilat: t };
  }

  hesaplaMuvekkilFinans(mId: number) {
    let vb = 0, eb = 0;
    this.davalar
      .filter(d => d.muvekkilId === mId || (d.muvekkiller || []).some(kayit => kayit.muvekkilId === mId))
      .forEach(d => { const f = this.getDosyaFinans(d); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    this.icralar.filter(i => i.muvekkilId === mId).forEach(i => { const f = this.getDosyaFinans(i); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    this.arabuluculukDosyalar.filter(a => a.muvekkilId === mId).forEach(a => { const f = this.getDosyaFinans(a); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    return { kalanVekaletBorcu: vb, emanetMasrafBakiyesi: eb };
  }

  silmeOnayiIste(id: number, tur: 'dava'|'icra'|'arabuluculuk'|'muvekkil') { if(tur === 'dava') this.silinecekDavaId = id; else if(tur === 'icra') this.silinecekIcraId = id; else if(tur === 'arabuluculuk') this.silinecekArabuluculukId = id; else this.silinecekMuvekkilId = id; }
  silmeIptal() { this.silinecekDavaId = null; this.silinecekIcraId = null; this.silinecekArabuluculukId = null; this.silinecekMuvekkilId = null; }
  guvenliUrl(url: string) { return url; }
  bildirimGoster(tur: BildirimTur, baslik: string, mesaj = '', secenekler?: BildirimGosterSecenekleri) {
    const id = Date.now() + this.bildirimSayaci++;
    const geriAl = secenekler?.geriAl;
    const sure = secenekler?.sureMs ?? (geriAl ? (geriAl.sureSaniye || this.geriAlmaSuresiSaniye) * 1000 : (tur === 'error' ? 6000 : 3200));
    const bildirim: UygulamaBildirimi = {
      id,
      tur,
      baslik,
      mesaj,
      geriAlEtiketi: geriAl?.etiket,
      geriAlKalanSaniye: geriAl ? (geriAl.sureSaniye || this.geriAlmaSuresiSaniye) : undefined
    };

    this.bildirimler = [...this.bildirimler, bildirim];
    if (geriAl) this.aktifGeriAlBildirimiId = id;
    this.cdr.detectChanges();

    const kapatmaTimeri = setTimeout(() => this.bildirimKapat(id), sure);
    this.bildirimKapatmaTimerlari.set(id, kapatmaTimeri);

    if (geriAl) {
      const geriAlmaKaydi: GeriAlmaKaydi = {
        islem: geriAl.islem,
        basariBaslik: geriAl.basariBaslik || 'İşlem geri alındı',
        basariMesaj: geriAl.basariMesaj || 'Son işlem önceki haline döndürüldü.'
      };
      geriAlmaKaydi.geriSayimTimerId = setInterval(() => {
        const hedef = this.bildirimler.find(item => item.id === id);
        if (!hedef || !hedef.geriAlKalanSaniye) {
          if (geriAlmaKaydi.geriSayimTimerId) clearInterval(geriAlmaKaydi.geriSayimTimerId);
          return;
        }
        const kalan = hedef.geriAlKalanSaniye - 1;
        if (kalan <= 0) {
          if (geriAlmaKaydi.geriSayimTimerId) clearInterval(geriAlmaKaydi.geriSayimTimerId);
          return;
        }
        this.bildirimler = this.bildirimler.map(item => item.id === id ? { ...item, geriAlKalanSaniye: kalan } : item);
        this.cdr.detectChanges();
      }, 1000);
      this.geriAlmaKayitlari.set(id, geriAlmaKaydi);
    }
  }
  bildirimKapat(id: number) {
    const kapatmaTimeri = this.bildirimKapatmaTimerlari.get(id);
    if (kapatmaTimeri) {
      clearTimeout(kapatmaTimeri);
      this.bildirimKapatmaTimerlari.delete(id);
    }
    const geriAlmaKaydi = this.geriAlmaKayitlari.get(id);
    if (geriAlmaKaydi?.geriSayimTimerId) clearInterval(geriAlmaKaydi.geriSayimTimerId);
    this.geriAlmaKayitlari.delete(id);
    this.bildirimler = this.bildirimler.filter(b => b.id !== id);
    if (this.aktifGeriAlBildirimiId === id) this.aktifGeriAlBildirimiId = null;
    this.cdr.detectChanges();
  }
  async bildirimGeriAl(id: number) {
    const kayit = this.geriAlmaKayitlari.get(id);
    if (!kayit || kayit.isleniyor) return;
    kayit.isleniyor = true;
    this.bildirimKapat(id);
    try {
      const sonuc = await kayit.islem();
      if (sonuc === false) return;
      this.bildirimGoster('success', kayit.basariBaslik, kayit.basariMesaj, { sureMs: 4200 });
    } catch (e: any) {
      this.bildirimGoster('error', 'Geri alma tamamlanamadı', e?.message || 'İşlem eski haline döndürülemedi.');
    }
  }
  get aktifGeriAlBildirimi() {
    if (this.aktifGeriAlBildirimiId !== null) {
      const hedef = this.bildirimler.find(bildirim => bildirim.id === this.aktifGeriAlBildirimiId && !!bildirim.geriAlEtiketi);
      if (hedef) return hedef;
    }
    for (let i = this.bildirimler.length - 1; i >= 0; i--) {
      if (this.bildirimler[i].geriAlEtiketi) return this.bildirimler[i];
    }
    return null;
  }
  getBildirimClass(tur: BildirimTur) {
    if (tur === 'success') return 'border-emerald-200 bg-white/95';
    if (tur === 'error') return 'border-rose-200 bg-white/95';
    return 'border-blue-200 bg-white/95';
  }
  getBildirimIkonClass(tur: BildirimTur) {
    if (tur === 'success') return 'bg-emerald-100 text-emerald-700';
    if (tur === 'error') return 'bg-rose-100 text-rose-700';
    return 'bg-blue-100 text-blue-700';
  }
  getAktifDosyaKapakKartiClass() {
    return this.aktifSayfa === 'detay'
      ? 'border-blue-100 bg-gradient-to-br from-blue-100 via-sky-50 to-white'
      : this.aktifSayfa === 'icraDetay'
      ? 'border-emerald-100 bg-gradient-to-br from-emerald-100 via-teal-50 to-white'
      : 'border-violet-100 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-white';
  }
  getAktifDosyaTemaRozetClass() {
    return this.aktifSayfa === 'detay'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : this.aktifSayfa === 'icraDetay'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-violet-200 bg-violet-50 text-violet-700';
  }
  getAktifDosyaDurumSinifi() {
    if (!this.aktifDosya) return 'bg-slate-100 text-slate-600 border-slate-200';
    return this.aktifSayfa === 'detay'
      ? this.getDurumClass(this.aktifDosya.durum)
      : this.aktifSayfa === 'icraDetay'
      ? this.getIcraDurumClass(this.aktifDosya.durum)
      : this.getArabuluculukDurumClass(this.aktifDosya.durum);
  }
  getAktifDosyaTurEtiketi() {
    return this.aktifSayfa === 'detay' ? 'Dava Dosyası' : this.aktifSayfa === 'icraDetay' ? 'İcra Dosyası' : 'Arabuluculuk Dosyası';
  }
  getAktifDosyaReferansMetni() {
    const dosya = this.aktifDosya;
    if (!dosya) return 'Dosya bilgisi yok';
    if (this.aktifSayfa === 'detay') {
      const dava = dosya as DavaDosyasi;
      if (dava.dosyaNumaralari && dava.dosyaNumaralari.length > 0) return dava.dosyaNumaralari.map(num => `${num.tur}: ${num.no}`).join(' * ');
      return dava.dosyaNo || 'Dava dosyası';
    }
    if (this.aktifSayfa === 'icraDetay') {
      const icra = dosya as IcraDosyasi;
      return `${icra.icraDairesi || 'İcra Dairesi'} / ${icra.dosyaNo || 'Dosya No'}`;
    }
    const arabuluculuk = dosya as ArabuluculukDosyasi;
    return `${arabuluculuk.buroNo ? arabuluculuk.buroNo + ' / ' : ''}${arabuluculuk.arabuluculukNo || 'Arabuluculuk Dosyası'}`;
  }
  getAktifDosyaTarafOzeti() {
    const dosya = this.aktifDosya;
    if (!dosya) return 'Dosya tarafı bulunamadı.';
    if (this.aktifSayfa === 'detay') return this.getDavaTarafOzet(dosya);
    if (this.aktifSayfa === 'icraDetay') return `${dosya.alacakli || 'Alacaklı yok'} | ${dosya.borclu || 'Borçlu yok'} | Muhatap: ${dosya.muvekkil || '-'}`;
    return (dosya.taraflar || []).map((taraf: any) => taraf.isim).join(' | ') || 'Taraf bilgisi girilmemiş.';
  }
  getAktifDavaTarafMetni(tur: 'davaci' | 'davali') {
    const dava = this.getAktifDavaDosyasi();
    if (!dava) return '-';
    const taraflar = this.getDavaTarafKayitlari(dava);
    const liste = tur === 'davaci' ? taraflar.davacilar : taraflar.davalilar;
    return liste.map(taraf => taraf.isim).join(', ') || '-';
  }
  getAktifDavaTarafListesi(tur: 'davaci' | 'davali') {
    const dava = this.getAktifDavaDosyasi();
    if (!dava) return [];
    const taraflar = this.getDavaTarafKayitlari(dava);
    return tur === 'davaci' ? taraflar.davacilar : taraflar.davalilar;
  }
  davaTarafDetayiAc(tur: 'davaci' | 'davali', tarafId: number) {
    if (this.aktifDavaTarafDetayi?.tur === tur && this.aktifDavaTarafDetayi?.tarafId === tarafId) {
      this.aktifDavaTarafDetayi = null;
      return;
    }
    this.aktifDavaTarafDetayi = { tur, tarafId };
  }
  davaTarafDetayiKapat() {
    this.aktifDavaTarafDetayi = null;
  }
  aktifDavaTarafDetayiAcikMi(tur: 'davaci' | 'davali', tarafId: number) {
    return this.aktifDavaTarafDetayi?.tur === tur && this.aktifDavaTarafDetayi?.tarafId === tarafId;
  }
  getAktifDavaTarafDetayKaydi() {
    if (!this.aktifDavaTarafDetayi) return null;
    return this.getAktifDavaTarafListesi(this.aktifDavaTarafDetayi.tur).find(taraf => taraf.id === this.aktifDavaTarafDetayi!.tarafId) || null;
  }
  getAktifDavaTarafDetayRolEtiketi() {
    if (!this.aktifDavaTarafDetayi) return '';
    return this.aktifDavaTarafDetayi.tur === 'davaci' ? 'Davacı' : 'Davalı';
  }
  getDavaTarafGosterimBilgisi(taraf?: DavaTarafKaydi | null) {
    const bagliMuvekkil = this.davaTarafMuvekkilKaydiBul(taraf);
    const adres = this.adresBilesenleriniHazirla({
      adres: taraf?.adres || bagliMuvekkil?.adres,
      il: taraf?.il || bagliMuvekkil?.il,
      ilce: taraf?.ilce || bagliMuvekkil?.ilce,
      acikAdres: taraf?.acikAdres || bagliMuvekkil?.acikAdres
    });
    return {
      isim: this.formatMetin(bagliMuvekkil?.adSoyad || taraf?.isim) || '-',
      tcKimlikVergiNo: this.duzMetinTrimle(taraf?.tcKimlikVergiNo || bagliMuvekkil?.tcKimlik) || '-',
      vergiDairesi: this.formatMetin(taraf?.vergiDairesi || bagliMuvekkil?.vergiDairesi) || '-',
      telefon: this.duzMetinTrimle(taraf?.telefon || bagliMuvekkil?.telefon) || '-',
      eposta: this.epostaDegeriniTemizle(taraf?.eposta || bagliMuvekkil?.eposta) || '-',
      adres: this.adresGosterimMetniOlustur(adres),
      bagliMuvekkil
    };
  }
  davaTarafKayitlariEslesiyor(aranan?: DavaTarafKaydi | null, kayit?: DavaTarafKaydi | null) {
    if (!aranan || !kayit) return false;
    if ((aranan.tcKimlikVergiNo || '').trim() && (kayit.tcKimlikVergiNo || '').trim() && this.metinEsit(aranan.tcKimlikVergiNo, kayit.tcKimlikVergiNo)) return true;
    if (aranan.muvekkilId && kayit.muvekkilId && aranan.muvekkilId === kayit.muvekkilId) return true;
    const arananMuvekkil = this.davaTarafMuvekkilKaydiBul(aranan);
    if (arananMuvekkil && this.iliskiDosyaylaEslesiyor(arananMuvekkil, kayit.isim, kayit.muvekkilId)) return true;
    const kayitMuvekkil = this.davaTarafMuvekkilKaydiBul(kayit);
    if (kayitMuvekkil && this.iliskiDosyaylaEslesiyor(kayitMuvekkil, aranan.isim, aranan.muvekkilId)) return true;
    return this.metinEsit(aranan.isim, kayit.isim);
  }
  getDavaTarafIlgiliDavalar(taraf?: DavaTarafKaydi | null) {
    if (!taraf) return [];
    const bagliMuvekkil = this.davaTarafMuvekkilKaydiBul(taraf);
    const tarafEslesiyor = (isim?: string, muvekkilId?: number) => {
      if (bagliMuvekkil && this.iliskiDosyaylaEslesiyor(bagliMuvekkil, isim, muvekkilId)) return true;
      if (taraf.muvekkilId && muvekkilId && taraf.muvekkilId === muvekkilId) return true;
      return this.metinEsit(taraf.isim, isim);
    };

    return this.davalar
      .filter(dava =>
        tarafEslesiyor(dava.muvekkil, dava.muvekkilId)
        || this.davaMuvekkilleriniHazirla(dava.muvekkiller).some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit))
        || this.getDavaTarafKayitlari(dava).davacilar.some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit))
        || this.getDavaTarafKayitlari(dava).davalilar.some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit))
      )
      .sort((a, b) => b.id - a.id);
  }
  getDavaTarafIlgiliRolEtiketleri(dava: DavaDosyasi, taraf?: DavaTarafKaydi | null) {
    if (!taraf) return [];
    const etiketler: string[] = [];
    if (this.davaMuvekkilleriniHazirla(dava.muvekkiller).some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit)) || this.davaTarafKayitlariEslesiyor(taraf, { id: dava.id, isim: dava.muvekkil, muvekkilId: dava.muvekkilId })) {
      etiketler.push('Müvekkil');
    }
    const taraflar = this.getDavaTarafKayitlari(dava);
    if (taraflar.davacilar.some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit))) etiketler.push('Davacı');
    if (taraflar.davalilar.some(kayit => this.davaTarafKayitlariEslesiyor(taraf, kayit))) etiketler.push('Davalı');
    return [...new Set(etiketler)];
  }
  getDavaTarafRolRozetClass(etiket: string) {
    if (etiket === 'Davacı') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (etiket === 'Davalı') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }
  getAktifDosyaBirincilEtiket() { return this.aktifSayfa === 'detay' ? 'Mahkeme' : this.aktifSayfa === 'icraDetay' ? 'İcra Dairesi' : 'Büro'; }
  getAktifDosyaBirincilDeger() {
    const dosya = this.aktifDosya;
    if (!dosya) return '-';
    return this.aktifSayfa === 'detay' ? (dosya.mahkeme || '-') : this.aktifSayfa === 'icraDetay' ? (dosya.icraDairesi || '-') : (dosya.buro || '-');
  }
  getAktifDosyaIkincilEtiket() { return this.aktifSayfa === 'detay' ? 'Konu' : this.aktifSayfa === 'icraDetay' ? 'Takip Tipi' : 'Uyuşmazlık'; }
  getAktifDosyaIkincilDeger() {
    const dosya = this.aktifDosya;
    if (!dosya) return '-';
    return this.aktifSayfa === 'detay'
      ? (dosya.konu || '-')
      : this.aktifSayfa === 'icraDetay'
      ? (dosya.takipTipi || '-')
      : `${dosya.basvuruTuru || '-'} / ${dosya.uyusmazlikTuru || '-'}`;
  }
  getAktifDosyaBaglantiOzeti() {
    const dosya = this.aktifDosya;
    if (!dosya) return '';
    if (this.aktifSayfa === 'detay') {
      const ozet = this.getDavaBaglantiOzeti(dosya as DavaDosyasi);
      return ozet ? `Bağlantılar: ${ozet}` : '';
    }
    if (this.aktifSayfa === 'icraDetay' && dosya.baglantiliDavaId) return `Bağlantılı dava: ${this.getDavaNo(dosya.baglantiliDavaId)}`;
    if (this.aktifSayfa === 'arabuluculukDetay' && dosya.toplantiYontemi) return `Toplantı yöntemi: ${dosya.toplantiYontemi}`;
    return '';
  }
  getAktifDosyaKritikTarihEtiketi() {
    if (this.aktifSayfa === 'detay') return 'Sonraki Duruşma';
    if (this.aktifSayfa === 'icraDetay') return 'Takip Tarihi';
    return 'Toplantı Tarihi';
  }
  getAktifDosyaKritikTarih() {
    const dosya = this.aktifDosya;
    if (!dosya) return '';
    if (this.aktifSayfa === 'detay') return dosya.durusmaTarihi || '';
    if (this.aktifSayfa === 'icraDetay') return dosya.takipTarihi || '';
    return dosya.toplantiTarihi || '';
  }
  getAktifDosyaKritikSaat() {
    const dosya = this.aktifDosya;
    if (!dosya) return '';
    if (this.aktifSayfa === 'detay') return (dosya as DavaDosyasi).durusmaSaati || '';
    if (this.aktifSayfa === 'arabuluculukDetay') return (dosya as ArabuluculukDosyasi).toplantiSaati || '';
    return '';
  }
  getAktifDosyaKritikTarihMetni() {
    const tarih = this.getAktifDosyaKritikTarih();
    return tarih ? this.formatTarihSaatKisa(tarih, this.getAktifDosyaKritikSaat()) : 'Planlanmadı';
  }
  getAktifDosyaKritikTarihDurumu() {
    const tarih = this.getAktifDosyaKritikTarih();
    if (!tarih) return 'Takvim girilmedi';
    if (this.aktifSayfa === 'detay' && (this.aktifDosya as DavaDosyasi)?.durusmaTamamlandiMi) return 'Gerçekleşti';
    if (this.aktifSayfa === 'arabuluculukDetay' && (this.aktifDosya as ArabuluculukDosyasi)?.toplantiTamamlandiMi) return 'Gerçekleşti';
    if (this.aktifSayfa === 'icraDetay') return 'Takip açılış tarihi';
    return this.hesaplaKalanGun(tarih);
  }
  getAktifDosyaTakvimTamamlandiMi() {
    if (!this.aktifDosya) return false;
    if (this.aktifSayfa === 'detay') return !!(this.aktifDosya as DavaDosyasi).durusmaTamamlandiMi;
    if (this.aktifSayfa === 'arabuluculukDetay') return !!(this.aktifDosya as ArabuluculukDosyasi).toplantiTamamlandiMi;
    return false;
  }
  getAktifDavaDosyasi() { return this.aktifSayfa === 'detay' ? this.aktifDosya as DavaDosyasi : null; }
  getAktifArabuluculukDosyasi() { return this.aktifSayfa === 'arabuluculukDetay' ? this.aktifDosya as ArabuluculukDosyasi : null; }
  getAktifDavaDurusmaMetni() {
    const dava = this.getAktifDavaDosyasi();
    return this.formatTarihSaat(dava?.durusmaTarihi, dava?.durusmaSaati);
  }
  aktifDavaDurusmaTamamlandiMi() { return !!this.getAktifDavaDosyasi()?.durusmaTamamlandiMi; }
  aktifDavaDurusmaTamamla() { const dava = this.getAktifDavaDosyasi(); if (dava) this.durusmaTamamlandiIsaretle(dava); }
  aktifDavaDurusmaAjandayaGeriAl() { const dava = this.getAktifDavaDosyasi(); if (dava) this.durusmaAjandayaGeriAl(dava); }
  getAktifArabuluculukToplantiMetni() {
    const dosya = this.getAktifArabuluculukDosyasi();
    return this.formatTarihSaat(dosya?.toplantiTarihi, dosya?.toplantiSaati);
  }
  aktifArabuluculukToplantiTamamlandiMi() { return !!this.getAktifArabuluculukDosyasi()?.toplantiTamamlandiMi; }
  aktifArabuluculukToplantiyiTamamla() { const dosya = this.getAktifArabuluculukDosyasi(); if (dosya) this.toplantiTamamlandiIsaretle(dosya); }
  aktifArabuluculukToplantiyiAjandayaGeriAl() { const dosya = this.getAktifArabuluculukDosyasi(); if (dosya) this.toplantiAjandayaGeriAl(dosya); }
  getAktifDosyaToplamEvrakSayisi() {
    const dosya = this.aktifDosya;
    if (!dosya) return 0;
    return (dosya.evraklar || []).reduce((toplam: number, evrak: any) => toplam + 1 + ((evrak.ekler || []).length), 0);
  }
  getAktifDosyaGecmisSayisi() {
    return this.aktifDosyaIslemGecmisi.length + this.aktifDosyaTakvimGecmisi.length;
  }
  getDetayTabClass(sekme: DetaySekmesi) {
    if (this.aktifDetaySekmesi !== sekme) return 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70';
    return this.aktifSayfa === 'detay'
      ? 'border-blue-500 text-blue-700 bg-blue-50/70'
      : this.aktifSayfa === 'icraDetay'
      ? 'border-emerald-500 text-emerald-700 bg-emerald-50/70'
      : 'border-violet-500 text-violet-700 bg-violet-50/70';
  }
  getDosyaIslemKategoriClass(kategori: DosyaIslemKategori) {
    if (kategori === 'durum') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (kategori === 'takvim') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (kategori === 'evrak') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (kategori === 'finans') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (kategori === 'gorusme') return 'bg-violet-50 text-violet-700 border-violet-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }
  getDosyaIslemKategoriEtiketi(kategori: DosyaIslemKategori) {
    if (kategori === 'dosya') return 'Dosya';
    if (kategori === 'durum') return 'Durum';
    if (kategori === 'takvim') return 'Takvim';
    if (kategori === 'evrak') return 'Evrak';
    if (kategori === 'finans') return 'Finans';
    if (kategori === 'gorusme') return 'Görüşme';
    return kategori;
  }
  getTakvimGecmisiDurumClass(durum: TakvimGecmisiDurumu) {
    if (durum === 'Gerçekleşti') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (durum === 'Güncellendi') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (durum === 'Ajandaya Geri Alındı') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (durum === 'Kaldırıldı') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }
  getAktifDosyaBilgiKartiClass() {
    return this.aktifSayfa === 'detay'
      ? 'bg-gradient-to-br from-blue-50/80 via-white to-white border border-blue-100'
      : this.aktifSayfa === 'icraDetay'
      ? 'bg-gradient-to-br from-emerald-50/80 via-white to-white border border-emerald-100'
      : 'bg-gradient-to-br from-violet-50/80 via-white to-white border border-violet-100';
  }
  getEvrakYaziRengi(renk?: string) {
    const deger = (renk || '').trim();
    return this.evrakYaziRenkSecenekleri.some(renkSecenegi => renkSecenegi.deger === deger) ? deger : this.varsayilanEvrakYaziRengi;
  }
  
  getDurumClass(d: string) { return d === 'Derdest' ? 'bg-green-100 text-green-700 border-green-200' : d === 'İstinaf/Temyiz' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
  getIcraDurumClass(d: string) { return d === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : d === 'İtiraz Edildi' ? 'bg-orange-100 text-orange-700 border-orange-200' : d === 'Tehir-i İcra' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
  getArabuluculukDurumClass(d: string) { return d === 'Hazırlık' ? 'bg-sky-200 text-sky-950 border-sky-300' : d === 'Müzakere' ? 'bg-emerald-200 text-emerald-950 border-emerald-300' : d === 'İmza' ? 'bg-amber-200 text-amber-950 border-amber-300' : d === 'Tahsilat' ? 'bg-blue-800 text-white border-blue-900' : d === 'Evrak Yükleme' ? 'bg-violet-200 text-violet-950 border-violet-300' : 'bg-slate-300 text-slate-900 border-slate-400'; }
  getArabuluculukListeZeminClass(d: string) {
      if (d === 'Hazırlık') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-hazirlik';
      if (d === 'Müzakere') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-muzakere';
      if (d === 'İmza') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-imza';
      if (d === 'Tahsilat') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-tahsilat';
      if (d === 'Evrak Yükleme') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-evrak';
      if (d === 'Kapalı') return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-kapali';
      return 'arabuluculuk-liste-zemin arabuluculuk-liste-zemin-kapali';
    }
  getPozisyonClass(p?: string) { return p === 'Davacı' ? 'bg-emerald-50 text-emerald-600' : p === 'Davalı' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'; }
  
  birlestirTarihVeSaat(tarih?: string, saat?: string) {
    if (!tarih) return '';
    const temizSaat = (saat || '').trim().slice(0, 5);
    return temizSaat ? `${tarih}T${temizSaat}:00` : tarih;
  }
  formatSaat(saat?: string) { return saat ? saat.slice(0, 5) : ''; }
  formatTarih(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'; }
  formatTarihGun(str?: string) { return str ? new Date(str).getDate().toString() : ''; }
  formatTarihAy(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { month: 'short' }) : ''; }
  formatTarihKisa(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; }
  formatTarihSaatKisa(tarih?: string, saat?: string) {
    if (!tarih) return '';
    if (!saat && tarih.includes('T')) {
      const tamTarih = new Date(tarih);
      return tamTarih.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' *');
    }
    const tarihMetni = this.formatTarihKisa(tarih);
    return saat ? `${tarihMetni} * ${this.formatSaat(saat)}` : tarihMetni;
  }
  formatTarihSaat(tarih?: string, saat?: string) {
    if (!tarih) return '-';
    const tarihMetni = this.formatTarih(tarih);
    return saat ? `${tarihMetni} * ${this.formatSaat(saat)}` : tarihMetni;
  }
  formatPara(miktar: number) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(miktar || 0); }
  hesaplaKalanGun(str?: string) { if (!str) return ''; const d = new Date(str); const b = new Date(); b.setHours(0,0,0,0); const f = Math.ceil((d.getTime() - b.getTime()) / (1000 * 3600 * 24)); return f < 0 ? 'Süresi Geçti!' : (f === 0 ? 'Bugün Son!' : `${f} Gün Kaldı`); }
  getTaraflarMetni(is: any): string {
    if (!is || !is.dosya) return 'Bilinmeyen Dosya';
    if (is.tur === 'dava') return this.getDavaTarafOzet(is.dosya);
    if (is.tur === 'icra') return `${is.dosya.alacakli || 'Alacaklı'} - ${is.dosya.borclu && is.dosya.borclu !== '-' ? is.dosya.borclu : 'Borçlu'}`;
    if (is.tur === 'arabuluculuk') return is.dosya.taraflar?.map((t:any) => t.isim).join(' - ') || 'Taraflar Bilinmiyor';
    return 'Bilinmeyen Dosya';
  }
}

