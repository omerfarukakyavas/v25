import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  ArabuluculukTaraf,
  BildirimTur,
  DavaDosyasi,
  DavaTarafKaydi,
  DetaySekmesi,
  DosyaIslemKaydi,
  DosyaIslemKategori,
  DosyaNumarasi,
  EvrakBaglantisi,
  FinansalIslem,
  IcraDosyasi,
  IliskiDosyaKaydi,
  Muvekkil,
  MuvekkilGorusmeNotu,
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

type GeriAlmaKaydi = {
  islem: () => Promise<boolean | void> | boolean | void;
  basariBaslik: string;
  basariMesaj: string;
  geriSayimTimerId?: ReturnType<typeof setInterval>;
  isleniyor?: boolean;
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
  
  app: any; auth: any; db: any; user: User | null = null;
  authInitialized = false; yukleniyor = false; islemYapiyor = false; sistemHatasi = '';
  
  emailGiris = ''; sifreGiris = ''; authModu: 'giris' | 'kayit' = 'giris'; authHata = ''; authYukleniyor = false;
  bildirimler: UygulamaBildirimi[] = [];
  bildirimSayaci = 0;
  gecmisKaydiSayaci = 0;

  davalar: DavaDosyasi[] = []; icralar: IcraDosyasi[] = []; arabuluculukDosyalar: ArabuluculukDosyasi[] = []; muvekkiller: Muvekkil[] = [];
  aktifSayfa: SayfaTipi = 'dashboard'; seciliDava: DavaDosyasi | null = null; seciliIcra: IcraDosyasi | null = null; seciliArabuluculuk: ArabuluculukDosyasi | null = null;
  
  sablonlar: { avukatlik: EvrakBaglantisi[], arabuluculuk: EvrakBaglantisi[] } = { avukatlik: [], arabuluculuk: [] };
  aktifSablonSekmesi: 'avukatlik' | 'arabuluculuk' = 'avukatlik';

  aramaMetni = ''; durumFiltresi = 'Tümü';
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
  
  arabuluculukMuvekkilDropdownAcik = false;
  arabuluculukMuvekkilArama = '';
  hizliMuvekkilFormAcik = false;
  hizliMuvekkilKaydi: Partial<Muvekkil> = { tip: 'Müvekkil' };

  yetkiliSecimDropdownAcik = false;
  yetkiliSecimArama = '';

  davaFormAcik = false; icraFormAcik = false; arabuluculukFormAcik = false; muvekkilFormAcik = false; formModu: 'ekle' | 'duzenle' = 'ekle';
  islemGorenDava: Partial<DavaDosyasi> = {}; islemGorenIcra: Partial<IcraDosyasi> = {}; islemGorenArabuluculuk: Partial<ArabuluculukDosyasi> = {}; islemGorenMuvekkil: Partial<Muvekkil> = {};
  
  yeniIslem: Partial<FinansalIslem> = { tur: 'Vekalet Ücreti' }; 
  duzenlenenFinansalIslemId: number | null = null;
  duzenlenenFinansalIslem: Partial<FinansalIslem> = {};
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
  yeniEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi }; ekEklenenEvrakId: number | null = null;
  yeniEkEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi }; duzenlenenEvrakId: number | null = null;
  duzenlenenEvrakParentId: number | null = null; duzenlenenEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi };
  duzenlenenEvrakOrijinalSonEylemTarihi = '';
  acikKlasorler: Record<number, boolean> = {}; 
  davetMektubuOlusturuluyor = false;
  bilgilendirmeTutanagiOlusturuluyor = false;
  googleDocsYetkiIstendi = false;
  gunlukOzetYakinGunSayisi = 30;
  gunlukOzetMetni = '';
  gunlukOzetOlusturulmaTarihi = '';
  gunlukOzetKopyalaniyor = false;
  yeniMuvekkilGorusmeNotu: Partial<MuvekkilGorusmeNotu> = { tarih: new Date().toISOString().split('T')[0], saat: '', yontem: 'Telefon', notlar: '' };
  acikMuvekkilGorusmeNotlari: Record<number, boolean> = {};
  duzenlenenMuvekkilGorusmeNotuId: number | null = null;
  duzenlenenMuvekkilGorusmeNotu: Partial<MuvekkilGorusmeNotu> = {};
  silinecekMuvekkilGorusmeNotuId: number | null = null;
  aktifDavaTarafDetayi: { tur: 'davaci' | 'davali'; tarafId: number } | null = null;
  private readonly geriAlmaSuresiSaniye = 8;
  private bildirimKapatmaTimerlari = new Map<number, ReturnType<typeof setTimeout>>();
  private geriAlmaKayitlari = new Map<number, GeriAlmaKaydi>();
  aktifGeriAlBildirimiId: number | null = null;

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
          this.gunlukOzetMetni = '';
          this.gunlukOzetOlusturulmaTarihi = '';
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
    return `- [${etiket}] ${kayit.baslik} | ${kayit.taraflar} | ${tarih} | ${this.ajandaDurumMetni(kayit.tarih)}`;
  }

  gunlukOzetSureSatiri(sure: ArabuluculukSureSayaci) {
    const referans = `${sure.dosya.buroNo ? sure.dosya.buroNo + ' / ' : ''}${sure.dosya.arabuluculukNo}`;
    return `- [${sure.dosya.uyusmazlikTuru}] ${referans} | ${this.getArabuluculukTarafIsimMetni(sure.dosya)} | ${this.getArabuluculukSureKalanMetni(sure)} | Azami son: ${this.formatTarih(sure.azamiSonTarih)}`;
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

    const satirlar = [
      'Gunluk Bildirim Ozeti',
      `Olusturma tarihi: ${this.formatTarihSaatKisa(new Date().toISOString())}`,
      '',
      `Geciken kayit: ${gecikenKayitlar.length}`,
      `Bugun takip edilecek kayit: ${bugunkuKayitlar.length}`,
      `Onumuzdeki ${this.gunlukOzetYakinGunSayisi} gun: ${yaklasanKayitlar.length}`,
      `Arabuluculuk sure alarmi: ${sayacKayitlari.length}`,
      `Tahsilat bekleyen dosya: ${this.dashboardUyariOzet.tahsilat} (${this.formatPara(this.dashboardUyariOzet.tahsilatTutari)})`
    ];

    const bolumEkle = (baslik: string, satirListesi: string[], bosMesaji: string) => {
      satirlar.push('', baslik);
      if (satirListesi.length) satirlar.push(...satirListesi);
      else satirlar.push(`- ${bosMesaji}`);
    };

    bolumEkle('GECIKEN KAYITLAR', gecikenKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaSatiri(kayit)), 'Geciken kayit yok.');
    bolumEkle('BUGUN', bugunkuKayitlar.slice(0, 8).map(kayit => this.gunlukOzetAjandaSatiri(kayit)), 'Bugune ait kayit yok.');
    bolumEkle(
      `ONUMUZDEKI ${this.gunlukOzetYakinGunSayisi} GUN`,
      yaklasanKayitlar.slice(0, 12).map(kayit => this.gunlukOzetAjandaSatiri(kayit)),
      'Bu aralikta planli kayit yok.'
    );
    bolumEkle(
      'ARABULUCULUK SURE ALARMLARI',
      sayacKayitlari.slice(0, 8).map(sure => this.gunlukOzetSureSatiri(sure)),
      'Kritik sure alarmi gorunmuyor.'
    );

    this.gunlukOzetMetni = satirlar.join('\n');
    this.gunlukOzetOlusturulmaTarihi = new Date().toISOString();
    this.bildirimGoster(
      'success',
      'Gunluk ozet hazir',
      `${gecikenKayitlar.length} geciken, ${bugunkuKayitlar.length} bugun ve ${yaklasanKayitlar.length} yaklasan kayit toparlandi.`
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
  sayfaDegistir(s: SayfaTipi) {
    this.aktifSayfa = s;
    if (s !== 'detay') this.seciliDava = null;
    if (s !== 'icraDetay') this.seciliIcra = null;
    if (s !== 'arabuluculukDetay') this.seciliArabuluculuk = null;
    if (s !== 'detay') this.aktifDavaTarafDetayi = null;
    this.aramaMetni = '';
    if (s === 'davalar' || s === 'icralar' || s === 'arabuluculuk') {
      this.durumFiltresi = this.varsayilanDurumFiltresi(s);
    }
  }

  detayaGit(d: DavaDosyasi) { this.seciliDava = d; this.aktifSayfa = 'detay'; this.aktifDetaySekmesi = 'notlar'; this.aktifDavaTarafDetayi = null; this.finansalIslemFormunuSifirla('Vekalet Ücreti'); this.finansalIslemDuzenlemeIptal(); this.yeniMuvekkilGorusmeNotu = { tarih: new Date().toISOString().split('T')[0], saat: '', yontem: 'Telefon', notlar: '' }; this.acikMuvekkilGorusmeNotlari = {}; this.duzenlenenMuvekkilGorusmeNotuId = null; this.duzenlenenMuvekkilGorusmeNotu = {}; this.silinecekMuvekkilGorusmeNotuId = null; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  icraDetayinaGit(i: IcraDosyasi) { this.seciliIcra = i; this.aktifSayfa = 'icraDetay'; this.aktifDetaySekmesi = 'notlar'; this.finansalIslemFormunuSifirla('Vekalet Ücreti'); this.finansalIslemDuzenlemeIptal(); this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  arabuluculukDetayinaGit(a: ArabuluculukDosyasi) { this.seciliArabuluculuk = a; this.aktifSayfa = 'arabuluculukDetay'; this.aktifDetaySekmesi = 'notlar'; this.finansalIslemFormunuSifirla('Ödeme'); this.finansalIslemDuzenlemeIptal(); this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }

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
      { etiket: 'Taraflar', onceki: this.getArabuluculukTarafKayitOzeti(onceki?.taraflar), sonraki: this.getArabuluculukTarafKayitOzeti(sonraki.taraflar) },
      { etiket: 'Toplantı', onceki: this.birlestirTarihVeSaat(onceki?.toplantiTarihi, onceki?.toplantiSaati), sonraki: this.birlestirTarihVeSaat(sonraki.toplantiTarihi, sonraki.toplantiSaati) },
      { etiket: 'Arşiv yeri', onceki: onceki?.arsivYeri, sonraki: sonraki.arsivYeri },
      { etiket: 'Hizmet ücreti', onceki: onceki?.vekaletUcreti, sonraki: sonraki.vekaletUcreti }
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
    return Array.isArray(liste) ? liste.map(taraf => ({ ...taraf })) : [];
  }
  davaTarafBosOlustur(id = Date.now()): DavaTarafKaydi {
    return { id, isim: '', tcKimlikVergiNo: '', vergiDairesi: '', telefon: '', eposta: '', adres: '' };
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
    if (!sadeceBos || !(taraf.adres || '').trim()) taraf.adres = this.formatMetin(muvekkil.adres) || '';
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
        return { ...kayit, isim, muvekkilId: secilen?.id || kayit.muvekkilId };
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
        return {
          ...taraf,
          id: typeof taraf.id === 'number' ? taraf.id : Date.now() + index,
          isim: (this.formatMetin(secilen?.adSoyad || taraf.isim) || '').trim(),
          muvekkilId: secilen?.id ?? taraf.muvekkilId,
          tcKimlikVergiNo: this.duzMetinTrimle(taraf.tcKimlikVergiNo || secilen?.tcKimlik) || '',
          vergiDairesi: this.formatMetin(taraf.vergiDairesi || secilen?.vergiDairesi) || '',
          telefon: this.duzMetinTrimle(taraf.telefon || secilen?.telefon) || '',
          eposta: this.epostaDegeriniTemizle(taraf.eposta || secilen?.eposta) || '',
          adres: this.formatMetin(taraf.adres || secilen?.adres) || ''
        };
      })
      .filter(taraf => taraf.isim !== '');
  }
  getDavaTarafKayitOzeti(liste?: DavaTarafKaydi[]) {
    return (liste || [])
      .map(taraf => [taraf.isim, taraf.tcKimlikVergiNo, taraf.telefon, taraf.eposta, taraf.vergiDairesi, taraf.adres, taraf.muvekkilId].filter(Boolean).join(':'))
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
    return `${dava.muvekkil || 'Müvekkil yok'} | ${dava.karsiTaraf || 'Karşı taraf belirtilmedi'}`;
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

  get filtrelenmisDavalar() { return this.davalar.filter(d => { const s = this.aramaMetni.toLowerCase(); const mS = d.dosyaNo.toLowerCase().includes(s) || d.muvekkil.toLowerCase().includes(s) || this.getDavaKarsiTarafOzet(d).toLowerCase().includes(s) || d.mahkeme.toLowerCase().includes(s) || (d.eskiMahkeme || '').toLowerCase().includes(s) || (d.eskiEsasNo || '').toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || d.durum === this.durumFiltresi; return mS && mD; }); }
  get filtrelenmisIcralar() { return this.icralar.filter(i => { const s = this.aramaMetni.toLowerCase(); const mS = i.dosyaNo.toLowerCase().includes(s) || i.icraDairesi.toLowerCase().includes(s) || i.alacakli.toLowerCase().includes(s) || i.borclu.toLowerCase().includes(s) || (i.eskiMahkeme || '').toLowerCase().includes(s) || (i.eskiEsasNo || '').toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || i.durum === this.durumFiltresi; return mS && mD; }); }
  get filtrelenmisArabuluculuk() {
    return this.arabuluculukDosyalar.filter(a => {
      const s = this.aramaMetni.toLowerCase();
      const mS = a.buroNo.toLowerCase().includes(s)
        || a.arabuluculukNo.toLowerCase().includes(s)
        || this.getArabuluculukTarafAramaMetni(a.taraflar).includes(s);
      const mD = this.durumFiltresi === 'Tümü' || a.durum === this.durumFiltresi;
      return mS && mD;
    });
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
        if (islem.tur === 'Ödeme' || islem.tur === 'Ödeme Tarihi') odenen += islem.tutar; 
        else if (islem.tur === 'Vekalet Ücreti') odenen += (islem.tutar / 1.2); 
      });
      const netUcret = (a.vekaletUcreti || 0) / 1.2;
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
    if (fark < 0) return `${Math.abs(fark)} gun gecmis`;
    if (fark === 0) return 'Bugun';
    if (fark === 1) return 'Yarin';
    return `${fark} gun kaldi`;
  }

  getAjandaKalanGunClass(str?: string) {
    const fark = this.ajandaGunFarki(str);
    if (fark < 0) return 'bg-rose-100 text-rose-700';
    if (fark === 0) return 'bg-amber-100 text-amber-700';
    if (fark <= 7) return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
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

  getAjandaTurEtiketi(tur: AjandaTur) {
    if (tur === 'durusma') return 'Durusma';
    if (tur === 'toplanti') return 'Toplanti';
    return 'Sureli Is';
  }

  getAjandaTurClass(tur: AjandaTur) {
    if (tur === 'durusma') return 'bg-blue-100 text-blue-700';
    if (tur === 'toplanti') return 'bg-purple-100 text-purple-700';
    return 'bg-rose-100 text-rose-700';
  }

  getAjandaKaynakEtiketi(kaynak: AjandaKaynak) {
    if (kaynak === 'dava') return 'Dava';
    if (kaynak === 'icra') return 'Icra';
    return 'Arabuluculuk';
  }

  getAjandaKaynakClass(kaynak: AjandaKaynak) {
    if (kaynak === 'dava') return 'bg-slate-100 text-slate-700';
    if (kaynak === 'icra') return 'bg-emerald-100 text-emerald-700';
    return 'bg-violet-100 text-violet-700';
  }

  getAjandaDosyaOzeti(kaynak: AjandaKaynak, dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi) {
    if (kaynak === 'dava') {
      const dava = dosya as DavaDosyasi;
      return dava.dosyaNo || 'Dava dosyasi';
    }
    if (kaynak === 'icra') {
      const icra = dosya as IcraDosyasi;
      return `${icra.icraDairesi || ''} ${icra.dosyaNo || ''}`.trim() || 'Icra dosyasi';
    }
    const arabuluculuk = dosya as ArabuluculukDosyasi;
    return `${arabuluculuk.buroNo ? arabuluculuk.buroNo + ' / ' : ''}${arabuluculuk.arabuluculukNo || ''}`.trim() || 'Arabuluculuk dosyasi';
  }

  ajandaKaydinaGit(kayit: AjandaKaydi) {
    if (kayit.kaynak === 'dava') this.detayaGit(kayit.dosya as DavaDosyasi);
    else if (kayit.kaynak === 'icra') this.icraDetayinaGit(kayit.dosya as IcraDosyasi);
    else this.arabuluculukDetayinaGit(kayit.dosya as ArabuluculukDosyasi);

    if (kayit.tur === 'sureliIs') this.aktifDetaySekmesi = 'sureliIsler';
  }

  get ajandaKayitlariLegacy() {
    const kayitlar: AjandaKaydi[] = [];

    this.davalar.forEach(dava => {
      if (dava.durum === 'KapalÃ„Â±' || !dava.durusmaTarihi || dava.durusmaTamamlandiMi) return;
      kayitlar.push({
        id: `dava-durusma-${dava.id}`,
        tarih: this.birlestirTarihVeSaat(dava.durusmaTarihi, dava.durusmaSaati),
        saat: dava.durusmaSaati,
        tur: 'durusma',
        kaynak: 'dava',
        dosya: dava,
        baslik: dava.mahkeme || 'Dava Durusmasi',
        altBaslik: dava.konu || this.getAjandaDosyaOzeti('dava', dava),
        taraflar: this.getDavaTarafOzet(dava)
      });
    });

    this.arabuluculukDosyalar.forEach(arabuluculuk => {
      if (arabuluculuk.durum === 'KapalÃ„Â±' || !arabuluculuk.toplantiTarihi || arabuluculuk.toplantiTamamlandiMi) return;
      kayitlar.push({
        id: `arabuluculuk-toplanti-${arabuluculuk.id}`,
        tarih: this.birlestirTarihVeSaat(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati),
        saat: arabuluculuk.toplantiSaati,
        tur: 'toplanti',
        kaynak: 'arabuluculuk',
        dosya: arabuluculuk,
        baslik: this.getAjandaDosyaOzeti('arabuluculuk', arabuluculuk),
        altBaslik: arabuluculuk.toplantiYontemi ? `${arabuluculuk.buro || 'Arabuluculuk'} - ${arabuluculuk.toplantiYontemi}` : (arabuluculuk.buro || 'Arabuluculuk toplantisi'),
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
        baslik: is.evrak.isim || 'Sureli is',
        altBaslik: this.getAjandaDosyaOzeti(is.tur, is.dosya),
        taraflar: this.getTaraflarMetni(is),
        evrakId: is.evrak.id,
        evrakIsmi: is.evrak.isim,
        anaEvrakIsmi: is.anaEvrakIsim
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
        baslik: dava.mahkeme || 'Dava Durusmasi',
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
        altBaslik: arabuluculuk.toplantiYontemi ? `${arabuluculuk.buro || 'Arabuluculuk'} - ${arabuluculuk.toplantiYontemi}` : (arabuluculuk.buro || 'Arabuluculuk toplantisi'),
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
        baslik: is.evrak.isim || 'Sureli is',
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
      sureliIs: kayitlar.filter(kayit => kayit.tur === 'sureliIs').length
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
    if (!kayit?.tarih) return 'Tarih belirtilmedi';
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
  arabuluculukTarafBosOlustur(tip: ArabuluculukTaraf['tip'] = 'Diğer Taraf', id = Date.now()): ArabuluculukTaraf {
    return { id, tip, isim: '', tcVergiNo: '', vergiDairesi: '', adres: '', telefon: '', eposta: '', vekil: '', vekilTelefon: '', vekilEposta: '', vekilBaroBilgisi: '' };
  }
  arabuluculukTaraflariniHazirla(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .map((taraf, index) => ({
        ...taraf,
        id: typeof taraf.id === 'number' ? taraf.id : Date.now() + index,
        isim: this.formatMetin(taraf.isim),
        tcVergiNo: this.duzMetinTrimle(taraf.tcVergiNo) || '',
        vergiDairesi: this.formatMetin(taraf.vergiDairesi) || '',
        adres: this.formatMetin(taraf.adres) || '',
        telefon: this.duzMetinTrimle(taraf.telefon) || '',
        eposta: this.epostaDegeriniTemizle(taraf.eposta) || '',
        vekil: this.formatMetin(taraf.vekil) || '',
        vekilTelefon: this.duzMetinTrimle(taraf.vekilTelefon) || '',
        vekilEposta: this.epostaDegeriniTemizle(taraf.vekilEposta) || '',
        vekilBaroBilgisi: this.formatMetin(taraf.vekilBaroBilgisi) || ''
      }))
      .filter(taraf => taraf.isim && taraf.isim.trim() !== '');
  }
  getArabuluculukTarafKayitOzeti(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .map(taraf => [taraf.tip, taraf.isim, taraf.tcVergiNo, taraf.vekil].filter(Boolean).join(':'))
      .join('|');
  }
  getArabuluculukTarafAramaMetni(liste?: ArabuluculukTaraf[]) {
    return (liste || [])
      .flatMap(taraf => [taraf.tip, taraf.isim, taraf.tcVergiNo, taraf.vergiDairesi, taraf.adres, taraf.telefon, taraf.eposta, taraf.vekil, taraf.vekilTelefon, taraf.vekilEposta, taraf.vekilBaroBilgisi])
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
    if (i) { this.formModu = 'duzenle'; this.islemGorenIcra = { ...i }; } 
    else { this.formModu = 'ekle'; this.islemGorenIcra = { durum: 'Aktif', muvekkilId: undefined, takipTipi: 'İlamsız' }; }
    this.icraFormAcik = true;
  }
  icraFormKapat() { this.icraFormAcik = false; }
  
  icraKaydet() {
    if (!this.islemGorenIcra.icraDairesi || !this.islemGorenIcra.dosyaNo || !this.islemGorenIcra.muvekkilId || !this.islemGorenIcra.takipTipi) { this.formHata = "Daire, Dosya No, Muhatap ve Takip Tipi zorunludur."; return; }
    
    this.islemGorenIcra.icraDairesi = this.formatMetin(this.islemGorenIcra.icraDairesi);
    this.islemGorenIcra.eskiMahkeme = this.formatMetin(this.islemGorenIcra.eskiMahkeme);
    this.islemGorenIcra.eskiEsasNo = this.formatMetin(this.islemGorenIcra.eskiEsasNo);
    this.islemGorenIcra.alacakli = this.formatMetin(this.islemGorenIcra.alacakli);
    this.islemGorenIcra.borclu = this.formatMetin(this.islemGorenIcra.borclu);
    this.islemGorenIcra.arsivYeri = this.formatMetin(this.islemGorenIcra.arsivYeri);

    const m = this.muvekkiller.find(x => x.id == this.islemGorenIcra.muvekkilId);
    if (this.formModu === 'ekle') {
      let y: IcraDosyasi = { id: Date.now(), icraDairesi: this.islemGorenIcra.icraDairesi || '', dosyaNo: this.islemGorenIcra.dosyaNo || '', eskiMahkeme: this.islemGorenIcra.eskiMahkeme || '', eskiEsasNo: this.islemGorenIcra.eskiEsasNo || '', muvekkilId: m?.id, muvekkil: m?.adSoyad || 'Bilinmiyor', alacakli: this.islemGorenIcra.alacakli || '-', borclu: this.islemGorenIcra.borclu || '-', takipTipi: this.islemGorenIcra.takipTipi || '', takipTarihi: this.islemGorenIcra.takipTarihi || '', durum: this.islemGorenIcra.durum as any, baglantiliDavaId: this.islemGorenIcra.baglantiliDavaId, arsivYeri: this.islemGorenIcra.arsivYeri || '', vekaletUcreti: this.islemGorenIcra.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [], islemGecmisi: [], takvimGecmisi: [] };
      y = this.dosyayaIslemKaydiEkle(y, 'dosya', 'İcra dosyası açıldı', `${y.icraDairesi} / ${y.dosyaNo} referansıyla yeni takip oluşturuldu.`);
      this.icraKaydetCloud(y, 'Yeni icra dosyası buluta eklendi.');
    } else {
      let g = { ...this.islemGorenIcra, muvekkil: m?.adSoyad || this.islemGorenIcra.muvekkil } as IcraDosyasi;
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
    if (a) { 
      this.formModu = 'duzenle'; 
      this.islemGorenArabuluculuk = { ...a, taraflar: Array.isArray(a.taraflar) ? a.taraflar.map(t => ({...t})) : [] }; 
    }
    else { this.formModu = 'ekle'; this.islemGorenArabuluculuk = { durum: 'Hazırlık', basvuruTuru: 'Dava Şartı', uyusmazlikTuru: 'İşçi İşveren', basvuruKonusu: '', buro: 'İstanbul Anadolu', buroyaBasvuruTarihi: '', arabulucuGorevlendirmeTarihi: '', tutanakDuzenlemeTarihi: '', toplantiSaati: '', toplantiTamamlandiMi: false, taraflar: [this.arabuluculukTarafBosOlustur('Başvurucu', Date.now()), this.arabuluculukTarafBosOlustur('Diğer Taraf', Date.now() + 1)] }; }
    this.arabuluculukFormAcik = true;
  }
  arabuluculukFormKapat() { this.arabuluculukFormAcik = false; }
  tarafEkle() { if (!this.islemGorenArabuluculuk.taraflar) this.islemGorenArabuluculuk.taraflar = []; this.islemGorenArabuluculuk.taraflar.push(this.arabuluculukTarafBosOlustur()); }
  tarafSil(i: number) { if (this.islemGorenArabuluculuk.taraflar) this.islemGorenArabuluculuk.taraflar.splice(i, 1); }
  arabuluculukKaydet() {
    const t = this.arabuluculukTaraflariniHazirla(this.islemGorenArabuluculuk.taraflar);
    const isDavaSarti = this.islemGorenArabuluculuk.basvuruTuru === 'Dava Şartı';
    if ((isDavaSarti && !this.islemGorenArabuluculuk.buroNo) || !this.islemGorenArabuluculuk.arabuluculukNo || !this.islemGorenArabuluculuk.buro || !this.islemGorenArabuluculuk.buroyaBasvuruTarihi || !this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || t.length === 0 || !this.islemGorenArabuluculuk.muvekkilId) { this.formHata = "Zorunlu alanları, büroya başvuru ve görevlendirme tarihlerini, taraf ismini ve Hesap Muhatabını doldurun."; return; }
    
    this.islemGorenArabuluculuk.buro = this.formatMetin(this.islemGorenArabuluculuk.buro);
    this.islemGorenArabuluculuk.basvuruKonusu = this.formatMetin(this.islemGorenArabuluculuk.basvuruKonusu);
    this.islemGorenArabuluculuk.arsivYeri = this.formatMetin(this.islemGorenArabuluculuk.arsivYeri);

    if (this.formModu === 'ekle') {
      let y: ArabuluculukDosyasi = { id: Date.now(), buroNo: this.islemGorenArabuluculuk.buroNo || '', arabuluculukNo: this.islemGorenArabuluculuk.arabuluculukNo || '', buro: this.islemGorenArabuluculuk.buro || '', basvuruTuru: this.islemGorenArabuluculuk.basvuruTuru as any, uyusmazlikTuru: this.islemGorenArabuluculuk.uyusmazlikTuru as any, basvuruKonusu: this.islemGorenArabuluculuk.basvuruKonusu || '', taraflar: t, muvekkilId: this.islemGorenArabuluculuk.muvekkilId, buroyaBasvuruTarihi: this.islemGorenArabuluculuk.buroyaBasvuruTarihi || '', arabulucuGorevlendirmeTarihi: this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || '', tutanakDuzenlemeTarihi: this.islemGorenArabuluculuk.tutanakDuzenlemeTarihi || '', toplantiTarihi: this.islemGorenArabuluculuk.toplantiTarihi, toplantiSaati: this.islemGorenArabuluculuk.toplantiSaati || '', toplantiTamamlandiMi: false, toplantiTamamlanmaTarihi: '', toplantiYontemi: this.islemGorenArabuluculuk.toplantiYontemi, durum: this.islemGorenArabuluculuk.durum as any, arsivYeri: this.islemGorenArabuluculuk.arsivYeri || '', vekaletUcreti: this.islemGorenArabuluculuk.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [], islemGecmisi: [], takvimGecmisi: [] };
      y = this.dosyayaIslemKaydiEkle(y, 'dosya', 'Arabuluculuk dosyası açıldı', `${y.arabuluculukNo} referansıyla yeni arabuluculuk kaydı oluşturuldu.`);
      if (y.toplantiTarihi) {
        y = this.dosyayaTakvimKaydiEkle(y, 'Toplantı', 'Planlandı', y.toplantiTarihi, y.toplantiSaati, 'İlk toplantı planı kaydedildi.');
        y = this.dosyayaIslemKaydiEkle(y, 'takvim', 'Toplantı takvimi oluşturuldu', this.formatTarihSaat(y.toplantiTarihi, y.toplantiSaati));
      }
      this.arabuluculukKaydetCloud(y, 'Yeni arabuluculuk dosyası buluta eklendi.');
    } else {
      const mevcut = this.arabuluculukDosyalar.find(x => x.id === this.islemGorenArabuluculuk.id);
      const toplantiDegisti = (mevcut?.toplantiTarihi || '') !== (this.islemGorenArabuluculuk.toplantiTarihi || '') || (mevcut?.toplantiSaati || '') !== (this.islemGorenArabuluculuk.toplantiSaati || '');
      let g = { ...this.islemGorenArabuluculuk, buroNo: this.islemGorenArabuluculuk.buroNo || '', basvuruKonusu: this.islemGorenArabuluculuk.basvuruKonusu || '', buroyaBasvuruTarihi: this.islemGorenArabuluculuk.buroyaBasvuruTarihi || '', arabulucuGorevlendirmeTarihi: this.islemGorenArabuluculuk.arabulucuGorevlendirmeTarihi || '', tutanakDuzenlemeTarihi: this.islemGorenArabuluculuk.tutanakDuzenlemeTarihi || '', taraflar: t } as ArabuluculukDosyasi;
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
    this.islemGorenMuvekkil = m ? { ...m, yetkililer: Array.isArray(m.yetkililer) ? m.yetkililer.map(y => ({...y})) : [] } : { tip: this.aktifIliskiSekmesi, yetkililer: [] }; 
    this.muvekkilFormAcik = true; 
  }
  muvekkilFormKapat() { this.muvekkilFormAcik = false; this.yetkiliSecimDropdownAcik = false; this.yetkiliSecimArama = ''; }
  hizliMuvekkilKaydiAc() {
    this.formHata = '';
    this.hizliMuvekkilFormAcik = true;
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
  }
  hizliMuvekkilKaydiIptal() {
    this.hizliMuvekkilFormAcik = false;
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
      bankaBilgileri: '',
      vergiDairesi: '',
      vekaletnameUrl: '',
      yetkililer: []
    };
    this.muvekkilKaydetCloud(yeni, 'Yeni müvekkil dava ekranından oluşturuldu.');
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
    this.islemGorenMuvekkil.adres = this.formatMetin(this.islemGorenMuvekkil.adres);
    this.islemGorenMuvekkil.vergiDairesi = this.formatMetin(this.islemGorenMuvekkil.vergiDairesi);
    yList.forEach(y => {
       y.adSoyad = this.formatMetin(y.adSoyad);
       y.pozisyon = this.formatMetin(y.pozisyon);
    });

    let vUrl = this.islemGorenMuvekkil.vekaletnameUrl ? this.islemGorenMuvekkil.vekaletnameUrl.trim() : '';
    if (vUrl && !/^https?:\/\//i.test(vUrl)) vUrl = 'https://' + vUrl;

    if (this.formModu === 'ekle') {
      const y: Muvekkil = { id: Date.now(), tip: this.islemGorenMuvekkil.tip as any, _isNewDiger: this.islemGorenMuvekkil.tip === 'Diğer', adSoyad: this.islemGorenMuvekkil.adSoyad || '', tcKimlik: this.islemGorenMuvekkil.tcKimlik || '', telefon: this.islemGorenMuvekkil.telefon || '', eposta: this.islemGorenMuvekkil.eposta || '', adres: this.islemGorenMuvekkil.adres || '', bankaBilgileri: this.islemGorenMuvekkil.bankaBilgileri || '', vergiDairesi: this.islemGorenMuvekkil.vergiDairesi || '', vekaletnameUrl: vUrl, yetkililer: yList };
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
    if (kayit.tur === 'durusma') this.durusmaTamamlandiIsaretle(kayit.dosya as DavaDosyasi, event);
    else if (kayit.tur === 'toplanti') this.toplantiTamamlandiIsaretle(kayit.dosya as ArabuluculukDosyasi, event);
    else if (kayit.evrakId) this.sureliIsiTamamlandiIsaretle(kayit.dosya, kayit.kaynak, kayit.evrakId, event);
  }
  getAjandaTamamlaMetni(kayit: AjandaKaydi) {
    if (kayit.tur === 'durusma') return 'Duruşma Yapıldı';
    if (kayit.tur === 'toplanti') return 'Toplantı Yapıldı';
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
    this.yeniIslem = { tur, tarih: new Date().toISOString().split('T')[0], tutar: undefined, aciklama: '', makbuzUrl: '' };
  }
  getFinansalIslemOzetMetni(islem?: Partial<FinansalIslem>) {
    if (!islem) return 'Finans kaydı';
    const parcalar = [
      islem.tur || 'Finans kaydı',
      this.formatPara(Number(islem.tutar || 0))
    ];
    if (islem.aciklama) parcalar.push(islem.aciklama);
    if (islem.makbuzUrl) parcalar.push('Makbuz linki eklendi');
    return parcalar.join(' * ');
  }
  finansalIslemDuzenlemeBaslat(islem: FinansalIslem) {
    this.duzenlenenFinansalIslemId = islem.id;
    this.duzenlenenFinansalIslem = { ...islem, makbuzUrl: islem.makbuzUrl || '' };
  }
  finansalIslemDuzenlemeIptal() {
    this.duzenlenenFinansalIslemId = null;
    this.duzenlenenFinansalIslem = {};
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
      makbuzUrl: this.hazirBaglantiUrl(this.duzenlenenFinansalIslem.makbuzUrl)
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
    const k: any = {...this.aktifDosya}; if (!k.finansalIslemler) k.finansalIslemler = [];
    k.finansalIslemler.unshift({ id: Date.now(), tarih: this.yeniIslem.tarih || new Date().toISOString().split('T')[0], tur: this.yeniIslem.tur as any, tutar: this.yeniIslem.tutar, aciklama: this.yeniIslem.aciklama || '', makbuzUrl });
    const kayitli = this.dosyayaIslemKaydiEkle(k, 'finans', 'Finans hareketi eklendi', `${this.yeniIslem.tur}: ${this.formatPara(this.yeniIslem.tutar || 0)} * ${this.yeniIslem.aciklama || ''}${makbuzUrl ? ' * Makbuz linki eklendi' : ''}`);
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
  aktifDosyadaEvrakAdiVarMi(isim: string) {
    const hedef = this.sablonAramaMetniHazirla(isim);
    return (this.aktifDosya?.evraklar || []).some(evrak => this.sablonAramaMetniHazirla(evrak.isim) === hedef);
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
      yerTutucular[`${onEk}_${sira}_AD`] = taraf?.isim || '-';
      yerTutucular[`${onEk}_${sira}_TC_VKN`] = taraf?.tcVergiNo || '-';
      yerTutucular[`${onEk}_${sira}_VERGI_DAIRESI`] = taraf?.vergiDairesi || '-';
      yerTutucular[`${onEk}_${sira}_ADRES`] = taraf?.adres || '-';
      yerTutucular[`${onEk}_${sira}_TELEFON`] = taraf?.telefon || '-';
      yerTutucular[`${onEk}_${sira}_EPOSTA`] = taraf?.eposta || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL`] = taraf?.vekil || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_TELEFON`] = taraf?.vekilTelefon || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_EPOSTA`] = taraf?.vekilEposta || '-';
      yerTutucular[`${onEk}_${sira}_VEKIL_BARO`] = taraf?.vekilBaroBilgisi || '-';
    }

    return yerTutucular;
  }
  arabuluculukTarafDetayListesiOlustur(taraflar: ArabuluculukTaraf[], tipEtiketi?: string) {
    if (!taraflar.length) return 'Kayıt bulunmuyor.';

    return taraflar.map((taraf, index) => {
      const baslik = `${index + 1}. ${tipEtiketi ? `${tipEtiketi}: ` : ''}${taraf.isim || '-'}`;
      const satirlar = [
        `TC No / Vergi No: ${taraf.tcVergiNo || 'Belirtilmedi'}`,
        `Vergi Dairesi: ${taraf.vergiDairesi || 'Belirtilmedi'}`,
        `Adres: ${taraf.adres || 'Belirtilmedi'}`,
        `Telefon: ${taraf.telefon || 'Belirtilmedi'}`,
        `E-posta: ${taraf.eposta || 'Belirtilmedi'}`,
        `Vekil: ${taraf.vekil || 'Belirtilmedi'}`,
        `Vekil Telefon: ${taraf.vekilTelefon || 'Belirtilmedi'}`,
        `Vekil E-posta: ${taraf.vekilEposta || 'Belirtilmedi'}`,
        `Vekil Baro Bilgisi: ${taraf.vekilBaroBilgisi || 'Belirtilmedi'}`
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

    return {
      BELGE_TARIHI: this.formatTarih(new Date().toISOString()),
      ARABULUCULUK_NO: dosya.arabuluculukNo || '-',
      BURO_NO: dosya.buroNo || '-',
      BURO: dosya.buro || '-',
      BASVURU_TURU: dosya.basvuruTuru || '-',
      BASVURU_KONUSU: dosya.basvuruKonusu || '-',
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
      TOPLANTI_TARIHI: dosya.toplantiTarihi ? this.formatTarih(dosya.toplantiTarihi) : 'Belirtilmedi',
      TOPLANTI_SAATI: dosya.toplantiSaati ? this.formatSaat(dosya.toplantiSaati) : 'Belirtilmedi',
      TOPLANTI_YONTEMI: dosya.toplantiYontemi || 'Belirtilmedi',
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
            text: `{{${anahtar}}}`,
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

  evrakEkle() {
    if (!this.yeniEvrak.isim) return;
    this.yeniEvrak.isim = this.formatMetin(this.yeniEvrak.isim);
    let url = (this.yeniEvrak.url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const yeni = { id: Date.now(), isim: this.yeniEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), ekler: [], tebligTarihi: this.yeniEvrak.tebligTarihi, sonEylemTarihi: this.yeniEvrak.sonEylemTarihi, tamamlandiMi: false, tamamlanmaTarihi: '', yaziRengi: this.getEvrakYaziRengi(this.yeniEvrak.yaziRengi) };
    if (this.aktifSayfa === 'sablonlar') {
      this.sablonlar[this.aktifSablonSekmesi].unshift(yeni); this.sablonlariKaydetCloud('Yeni şablon listeye eklendi.');
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (!k.evraklar) k.evraklar = []; k.evraklar.unshift(yeni); const kayitli = this.dosyayaIslemKaydiEkle(k, 'evrak', 'Evrak bağlantısı eklendi', `${yeni.isim}${yeni.sonEylemTarihi ? ' * Son eylem: ' + this.formatTarihKisa(yeni.sonEylemTarihi) : ''}`); this.aktifDosyaKaydet(kayitli, 'Evrak bağlantısı dosyaya eklendi.');
    }
    this.yeniEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi };
  }
  
  evrakDuzenleBaslat(evrak: EvrakBaglantisi, parentId: number | null = null) { this.duzenlenenEvrakId = evrak.id; this.duzenlenenEvrakParentId = parentId; this.duzenlenenEvrakOrijinalSonEylemTarihi = evrak.sonEylemTarihi || ''; this.duzenlenenEvrak = { ...evrak, yaziRengi: this.getEvrakYaziRengi(evrak.yaziRengi) }; }
  evrakDuzenleIptal() { this.duzenlenenEvrakId = null; this.duzenlenenEvrakParentId = null; this.duzenlenenEvrakOrijinalSonEylemTarihi = ''; this.duzenlenenEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi }; }
  
  evrakGuncelleKaydet() {
    if (!this.duzenlenenEvrak.isim) return;
    this.duzenlenenEvrak.isim = this.formatMetin(this.duzenlenenEvrak.isim);
    let url = (this.duzenlenenEvrak.url || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url; this.duzenlenenEvrak.url = url; this.duzenlenenEvrak.yaziRengi = this.getEvrakYaziRengi(this.duzenlenenEvrak.yaziRengi);
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
        if (i.tur === 'Ödeme' || i.tur === 'Ödeme Tarihi') { v += i.tutar; t += i.tutar; }
        else if (i.tur === 'Vekalet Ücreti') { v += (i.tutar / 1.2); t += (i.tutar / 1.2); }
      } else {
        if (i.tur === 'Vekalet Ücreti') { v += i.tutar; t += i.tutar; } 
        if (i.tur === 'Masraf Avansı (Giriş)') g += i.tutar; 
        if (i.tur === 'Masraf Harcaması (Çıkış)') c += i.tutar; 
      }
    });
    let anaUcret = dosya.vekaletUcreti || 0; if (isArabuluculuk) anaUcret = anaUcret / 1.2;
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
    return {
      isim: this.formatMetin(bagliMuvekkil?.adSoyad || taraf?.isim) || '-',
      tcKimlikVergiNo: this.duzMetinTrimle(taraf?.tcKimlikVergiNo || bagliMuvekkil?.tcKimlik) || '-',
      vergiDairesi: this.formatMetin(taraf?.vergiDairesi || bagliMuvekkil?.vergiDairesi) || 'Belirtilmedi',
      telefon: this.duzMetinTrimle(taraf?.telefon || bagliMuvekkil?.telefon) || 'Belirtilmedi',
      eposta: this.epostaDegeriniTemizle(taraf?.eposta || bagliMuvekkil?.eposta) || 'Belirtilmedi',
      adres: this.formatMetin(taraf?.adres || bagliMuvekkil?.adres) || 'Adres girilmedi',
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
      ? (dosya.takipTipi || 'Belirtilmedi')
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
  getArabuluculukDurumClass(d: string) { return d === 'Hazırlık' ? 'bg-slate-100 text-slate-700 border-slate-200' : d === 'Müzakere' ? 'bg-blue-100 text-blue-700 border-blue-200' : d === 'İmza' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : d === 'Tahsilat' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
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

