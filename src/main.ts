import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';

// --- TASARIM (TAILWIND CSS) YÜKLEYİCİ ---
if (!document.getElementById('tailwind-cdn')) {
  const tailwindScript = document.createElement('script');
  tailwindScript.id = 'tailwind-cdn';
  tailwindScript.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(tailwindScript);
}

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- SİZİN FIREBASE AYARLARINIZ ---
const KENDI_FIREBASE_AYARLARIM = {
  apiKey: "AIzaSyBVq3Hvr_3g2giEu7zPnEDKgkWKaBrzsBY",
  authDomain: "akyavas-hts.firebaseapp.com",
  projectId: "akyavas-hts",
  storageBucket: "akyavas-hts.firebasestorage.app",
  messagingSenderId: "245455357063",
  appId: "1:245455357063:web:b3d296b985695094266422"
};

const appId = 'akyavas-hts';

declare const __firebase_config: any;
declare const __initial_auth_token: any;

const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }
  return KENDI_FIREBASE_AYARLARIM;
};

// --- VERİ MODELLERİ ---
interface FinansalIslem { id: number; tarih: string; tur: string; tutar: number; aciklama: string; }
interface EvrakBaglantisi { id: number; isim: string; url: string; tarih: string; tebligTarihi?: string; sonEylemTarihi?: string; tamamlandiMi?: boolean; tamamlanmaTarihi?: string; yaziRengi?: string; ekler?: EvrakBaglantisi[]; } 
interface DosyaNumarasi { tur: string; no: string; }
interface ArabuluculukTaraf { id: number; tip: 'Başvurucu' | 'Diğer Taraf'; isim: string; }

interface DavaDosyasi { 
  id: number; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil: string; muvekkilId?: number; karsiTaraf: string; mahkeme: string; konu: string; durum: string; istinafMahkemesi?: string; durusmaTarihi?: string; durusmaSaati?: string; durusmaTamamlandiMi?: boolean; durusmaTamamlanmaTarihi?: string; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; baglantiliIcraId?: number; muvekkilPozisyonu?: string; arsivYeri?: string;
  icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: string;
}

interface IcraDosyasi {
  id: number; icraDairesi: string; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkilId?: number; muvekkil: string; alacakli: string; borclu: string; takipTipi?: string; takipTarihi: string; durum: string; baglantiliDavaId?: number; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; arsivYeri?: string;
  karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; durusmaSaati?: string; durusmaTamamlandiMi?: boolean; durusmaTamamlanmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: string;
}

interface ArabuluculukDosyasi {
  id: number; buroNo: string; arabuluculukNo: string; buro: string; basvuruTuru: 'Dava Şartı' | 'İhtiyari'; uyusmazlikTuru: 'Kira' | 'İşçi İşveren' | 'Ticari' | 'Boşanma' | 'Ortaklığın Giderilmesi' | 'Tüketici'; taraflar: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiSaati?: string; toplantiTamamlandiMi?: boolean; toplantiTamamlanmaTarihi?: string; toplantiYontemi?: 'Yüzyüze' | 'Videokonferans' | 'Telekonferans'; durum: string; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; muvekkilId?: number; arsivYeri?: string;
  dosyaNo?: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil?: string; karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string; icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
}

interface Muvekkil { id: number; tip?: 'Müvekkil' | 'Şirketler' | 'Borçlular' | 'Diğer'; _isNewDiger?: boolean; adSoyad: string; tcKimlik: string; telefon: string; eposta: string; adres: string; bankaBilgileri: string; vergiDairesi?: string; vekaletnameUrl?: string; yetkililer?: { id: number; adSoyad: string; telefon: string; eposta?: string; pozisyon: string; }[]; }

type AjandaKaynak = 'dava' | 'icra' | 'arabuluculuk';
type AjandaTur = 'durusma' | 'toplanti' | 'sureliIs';

interface AjandaKaydi {
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

type BildirimTur = 'success' | 'error' | 'info';

interface UygulamaBildirimi {
  id: number;
  tur: BildirimTur;
  baslik: string;
  mesaj?: string;
}

type SayfaTipi = 'dashboard' | 'davalar' | 'icralar' | 'arabuluculuk' | 'sablonlar' | 'muhasebe' | 'iliskiler' | 'ajanda' | 'detay' | 'icraDetay' | 'arabuluculukDetay';
type DetaySekmesi = 'notlar' | 'evraklar' | 'sureliIsler';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!authInitialized) {
      <div class="flex h-screen w-screen items-center justify-center bg-slate-900 text-white flex-col gap-4 font-sans">
         <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         <h2 class="text-xl font-bold tracking-widest uppercase italic">Akyavaş HTS</h2>
      </div>
    } 
    @else if (!user) {
      <div class="flex h-screen w-screen items-center justify-center bg-slate-900 font-sans p-4 relative overflow-hidden">
        <div class="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10 z-10 relative">
          <div class="flex flex-col items-center mb-8">
             <div class="w-16 h-16 bg-slate-900 rounded-2xl text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-900/30">
                <svg viewBox="0 0 100 100" fill="currentColor" class="w-10 h-10"><polygon points="45,5 51,5 36,45 30,45" /><polygon points="28,52 34,52 14,95 8,95" /><polygon points="53,5 59,5 78,50 71,53" /><polygon points="51,56 83,68 78,80 46,68" /><polygon points="60,70 65,72 50,105 45,103" /><rect x="65" y="85" width="25" height="2" /><rect x="62" y="89" width="31" height="2" /><rect x="59" y="93" width="37" height="3" /></svg>
             </div>
             <h2 class="text-2xl font-black text-slate-800 uppercase tracking-widest">Akyavaş</h2>
             <p class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">Hukuk Takip Sistemi</p>
          </div>

          <h3 class="text-lg font-bold text-slate-700 mb-6 text-center">{{ authModu === 'giris' ? 'Sisteme Giriş Yapın' : 'Yeni Hesap Oluşturun' }}</h3>
          @if(authHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium mb-4 text-center">{{ authHata }}</div> }
          <div class="space-y-4">
            <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">E-Posta Adresiniz</label><input [(ngModel)]="emailGiris" type="email" placeholder="ornek@mail.com" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-medium"></div>
            <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider">Şifreniz</label><input [(ngModel)]="sifreGiris" (keyup.enter)="authIslemi()" type="password" placeholder="••••••••" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 font-medium"></div>
            <button (click)="authIslemi()" [disabled]="authYukleniyor" class="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all">{{ authModu === 'giris' ? 'Giriş Yap' : 'Hesabımı Oluştur' }}</button>
          </div>
          <div class="mt-8 text-center pt-6 border-t border-slate-100">
            <p class="text-xs text-slate-500 font-medium">{{ authModu === 'giris' ? 'Sistemde henüz hesabınız yok mu?' : 'Zaten bir hesabınız var mı?' }}<button (click)="authModDegistir()" class="text-blue-600 font-bold hover:underline ml-1 uppercase tracking-wider">{{ authModu === 'giris' ? 'Kayıt Olun' : 'Giriş Yapın' }}</button></p>
          </div>
        </div>
      </div>
    } 
    @else {
      <div class="flex h-screen bg-slate-50 font-sans overflow-hidden">
        <aside class="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10 hidden md:flex shrink-0">
          <div class="p-8 border-b border-slate-800 flex flex-col items-center text-center">
            <div class="w-24 h-24 text-white drop-shadow-xl mb-4">
              <svg viewBox="0 0 100 100" fill="currentColor" class="w-full h-full"><polygon points="45,5 51,5 36,45 30,45" /><polygon points="28,52 34,52 14,95 8,95" /><polygon points="53,5 59,5 78,50 71,53" /><polygon points="51,56 83,68 78,80 46,68" /><polygon points="60,70 65,72 50,105 45,103" /><rect x="65" y="85" width="25" height="2" /><rect x="62" y="89" width="31" height="2" /><rect x="59" y="93" width="37" height="3" /></svg>
            </div>
            <div class="flex flex-col justify-center">
              <h1 class="text-[20px] font-medium tracking-[0.3em] lowercase leading-none font-mono">akyavaş</h1>
              <p class="text-[12px] tracking-[0.2em] text-slate-400 mt-2 lowercase font-mono">hukuk bürosu</p>
            </div>
          </div>
          <nav class="flex-1 p-4 space-y-2 cursor-pointer overflow-y-auto custom-scrollbar">
            <a (click)="sayfaDegistir('dashboard')" [class]="getMenuClass('dashboard')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group">
              <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span>Genel Özet</span>
            </a>
            <a (click)="sayfaDegistir('davalar')" [class]="getMenuClass('davalar')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Dava Dosyaları</span></a>
            <a (click)="sayfaDegistir('icralar')" [class]="getMenuClass('icralar')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>İcra Takipleri</span></a>
            <a (click)="sayfaDegistir('arabuluculuk')" [class]="getMenuClass('arabuluculuk')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span>Arabuluculuk</span></a>
            <a (click)="sayfaDegistir('sablonlar')" [class]="getMenuClass('sablonlar')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg><span>Şablonlar</span></a>
            <a (click)="sayfaDegistir('muhasebe')" [class]="getMenuClass('muhasebe')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Muhasebe</span></a>
            <a (click)="sayfaDegistir('iliskiler')" [class]="getMenuClass('iliskiler')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg><span>İlişkiler</span></a>
            <a (click)="sayfaDegistir('ajanda')" [class]="getMenuClass('ajanda')" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"><svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Ajanda</span></a>
          </nav>
          <div class="p-4 border-t border-slate-800 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>
              <div class="overflow-hidden"><p class="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{{ user.email }}</p><p class="text-xs font-medium flex items-center gap-1 text-emerald-400">Bulut Aktif</p></div>
            </div>
            <button (click)="cikisYap()" class="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all" title="Çıkış Yap"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
          </div>
        </aside>

        <main class="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
          <header class="bg-white border-b border-slate-200 min-h-16 flex flex-col gap-3 px-4 py-3 shadow-sm flex-shrink-0 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h2 class="text-lg sm:text-2xl font-bold text-slate-800 leading-tight">
              @switch (aktifSayfa) {
                @case ('dashboard') { Genel Özet ve İstatistikler }
                @case ('davalar') { Dava Dosyaları } @case ('icralar') { İcra Takipleri } @case ('arabuluculuk') { Arabuluculuk Dosyaları }
                @case ('sablonlar') { Belge Şablonları } @case ('muhasebe') { Muhasebe ve Finans } @case ('iliskiler') { İlişkiler Yönetimi }
                @case ('ajanda') { Duruşma Takvimi } @case ('detay') { Dava Yönetimi ve Finans } @case ('icraDetay') { İcra Yönetimi ve Finans }
                @case ('arabuluculukDetay') { Arabuluculuk Yönetimi ve Finans }
              }
            </h2>
            <div class="flex flex-wrap gap-2 sm:gap-3 justify-end">
              <button (click)="cikisYap()" class="md:hidden px-3 py-2 text-slate-600 font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Çıkış
              </button>
              @if (aktifSayfa === 'davalar') { <button (click)="dosyaFormunuAc()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni Dosya</button> }
              @else if (aktifSayfa === 'icralar') { <button (click)="icraFormunuAc()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni İcra Takibi</button> }
              @else if (aktifSayfa === 'arabuluculuk') { <button (click)="arabuluculukFormAc()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni Arabuluculuk</button> }
              @else if (aktifSayfa === 'iliskiler') { <button (click)="muvekkilFormunuAc()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg> Yeni Kayıt</button> }
              @else if (aktifSayfa === 'detay' && seciliDava) { <button (click)="dosyaFormunuAc(seciliDava)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Dosyayı Düzenle</button> }
              @else if (aktifSayfa === 'icraDetay' && seciliIcra) { <button (click)="icraFormunuAc(seciliIcra)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> İcrayı Düzenle</button> }
              @else if (aktifSayfa === 'arabuluculukDetay' && seciliArabuluculuk) { <button (click)="arabuluculukFormAc(seciliArabuluculuk)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Dosyayı Düzenle</button> }
            </div>
          </header>

          <div class="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 overflow-x-auto custom-scrollbar">
            <div class="flex gap-2 min-w-max">
              <button (click)="sayfaDegistir('dashboard')" [class]="getMobilMenuClass('dashboard')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Genel Özet</button>
              <button (click)="sayfaDegistir('davalar')" [class]="getMobilMenuClass('davalar')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Davalar</button>
              <button (click)="sayfaDegistir('icralar')" [class]="getMobilMenuClass('icralar')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">İcralar</button>
              <button (click)="sayfaDegistir('arabuluculuk')" [class]="getMobilMenuClass('arabuluculuk')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Arabuluculuk</button>
              <button (click)="sayfaDegistir('ajanda')" [class]="getMobilMenuClass('ajanda')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Ajanda</button>
              <button (click)="sayfaDegistir('muhasebe')" [class]="getMobilMenuClass('muhasebe')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Muhasebe</button>
              <button (click)="sayfaDegistir('iliskiler')" [class]="getMobilMenuClass('iliskiler')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">İlişkiler</button>
              <button (click)="sayfaDegistir('sablonlar')" [class]="getMobilMenuClass('sablonlar')" class="shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all">Şablonlar</button>
            </div>
          </div>

          <div class="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar relative">
            @switch (aktifSayfa) {
              
              <!-- === YENİ: DASHBOARD (ÖZET EKRANI) === -->
              @case ('dashboard') {
                <div class="space-y-6 max-w-7xl mx-auto pb-10">
                  <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                    <div class="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                    <h2 class="text-3xl font-black mb-2 relative z-10">Hoş Geldiniz.</h2>
                    <p class="text-slate-300 font-medium relative z-10">Büronuzun güncel durumunu ve önemli gelişmeleri aşağıdan takip edebilirsiniz.</p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div class="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Bekleyen Alacak</p></div>
                        <p class="text-2xl font-black text-slate-800">{{ formatPara(muhasebeOzet.toplam) }}</p>
                     </div>
                     <div class="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" (click)="sayfaDegistir('davalar')">
                        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg></div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Dava Dosyaları</p></div>
                        <p class="text-2xl font-black text-slate-800">{{istatistikler.totalDava}} <span class="text-xs font-medium text-slate-400">Kayıt</span></p>
                     </div>
                     <div class="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" (click)="sayfaDegistir('icralar')">
                        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">İcra Takipleri</p></div>
                        <p class="text-2xl font-black text-slate-800">{{istatistikler.totalIcra}} <span class="text-xs font-medium text-slate-400">Kayıt</span></p>
                     </div>
                     <div class="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" (click)="sayfaDegistir('arabuluculuk')">
                        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Arabuluculuk</p></div>
                        <p class="text-2xl font-black text-slate-800">{{istatistikler.totalArb}} <span class="text-xs font-medium text-slate-400">Kayıt</span></p>
                     </div>
                  </div>

                  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-[0.22em] flex items-center gap-2">
                          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.66 18h16.68a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z"></path></svg>
                          Akıllı Uyarı Merkezi
                        </h3>
                        <p class="mt-2 text-sm leading-6 text-slate-500">Gecikmiş işler, bugün yapılacaklar, 7 gün içindeki kritik kayıtlar ve tahsilat bekleyen dosyalar tek merkezde toplandı.</p>
                      </div>
                      <div class="flex gap-3">
                        <button (click)="sayfaDegistir('ajanda')" class="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">Ajandayı Aç</button>
                        <button (click)="sayfaDegistir('muhasebe')" class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">Tahsilatı Gör</button>
                      </div>
                    </div>

                    <div class="p-6 space-y-6">
                      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <button (click)="sayfaDegistir('ajanda')" class="text-left rounded-2xl border border-rose-100 bg-rose-50/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-rose-700">Gecikmiş</p>
                          <p class="mt-3 text-3xl font-black text-rose-700">{{ dashboardUyariOzet.gecmis }}</p>
                          <p class="mt-2 text-sm font-medium leading-6 text-rose-900/80">Süresi geçmiş ajanda ve evrak kaydı</p>
                        </button>
                        <button (click)="sayfaDegistir('ajanda')" class="text-left rounded-2xl border border-amber-100 bg-amber-50/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Bugün</p>
                          <p class="mt-3 text-3xl font-black text-amber-700">{{ dashboardUyariOzet.bugun }}</p>
                          <p class="mt-2 text-sm font-medium leading-6 text-amber-900/80">Bugün takip edilmesi gereken kayıt</p>
                        </button>
                        <button (click)="sayfaDegistir('ajanda')" class="text-left rounded-2xl border border-blue-100 bg-blue-50/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">7 Gün İçinde</p>
                          <p class="mt-3 text-3xl font-black text-blue-700">{{ dashboardUyariOzet.yediGun }}</p>
                          <p class="mt-2 text-sm font-medium leading-6 text-blue-900/80">Yaklaşan duruşma, toplantı veya süreli iş</p>
                        </button>
                        <button (click)="sayfaDegistir('muhasebe')" class="text-left rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Tahsilat Bekleyen</p>
                          <p class="mt-3 text-3xl font-black text-emerald-700">{{ dashboardUyariOzet.tahsilat }}</p>
                          <p class="mt-2 text-sm font-medium leading-6 text-emerald-900/80">Toplam {{ formatPara(dashboardUyariOzet.tahsilatTutari) }} bekleyen alacak</p>
                        </button>
                      </div>

                      <div class="grid grid-cols-1 xl:grid-cols-[1.35fr,0.65fr] gap-6">
                        <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <div class="flex items-center justify-between mb-4">
                            <div>
                              <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Öncelikli Ajanda</h4>
                              <p class="text-xs text-slate-500 mt-1">Önce gecikmiş, sonra bugün ve yakın tarihli kayıtlar listelenir.</p>
                            </div>
                            <span class="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider">{{ oncelikliAjandaKayitlari.length }} kayıt</span>
                          </div>

                          <div class="space-y-3">
                            @for (kayit of oncelikliAjandaKayitlari; track kayit.id) {
                              <button (click)="ajandaKaydinaGit(kayit)" class="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                  <span [class]="getAjandaTurClass(kayit.tur)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ getAjandaTurEtiketi(kayit.tur) }}</span>
                                  <span [class]="getAjandaKaynakClass(kayit.kaynak)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ getAjandaKaynakEtiketi(kayit.kaynak) }}</span>
                                  <span [class]="getAjandaKalanGunClass(kayit.tarih)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ ajandaDurumMetni(kayit.tarih) }}</span>
                                </div>
                                <p class="text-sm font-bold text-slate-800">{{ kayit.baslik }}</p>
                                <p class="text-xs text-slate-500 mt-1">{{ kayit.taraflar }}</p>
                                <p class="text-[11px] text-slate-400 mt-2">{{ kayit.altBaslik }}</p>
                              </button>
                            } @empty {
                              <div class="rounded-2xl border border-emerald-100 border-dashed bg-emerald-50/70 p-5 text-sm font-medium text-emerald-700">Şu an kritik ajanda kaydı görünmüyor. Güzel gidiyorsunuz.</div>
                            }
                          </div>
                        </div>

                        <div class="space-y-4">
                          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                            <div class="flex items-center justify-between mb-4">
                              <div>
                                <h4 class="text-sm font-black text-emerald-800 uppercase tracking-[0.2em]">Tahsilat Önceliği</h4>
                                <p class="text-xs text-emerald-700/80 mt-1">En yüksek kalan bakiyeler üstte gösterilir.</p>
                              </div>
                              <span class="px-3 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-black uppercase tracking-wider">{{ oncelikliTahsilatKayitlari.length }} dosya</span>
                            </div>

                            <div class="space-y-3">
                              @for (islem of oncelikliTahsilatKayitlari; track islem.id + islem.tip) {
                                <button (click)="islem.detayFonk()" class="w-full text-left rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                  <div class="flex items-start justify-between gap-3">
                                    <div>
                                      <p class="text-sm font-bold text-slate-800">{{ islem.isim }}</p>
                                      <p class="text-xs text-slate-500 mt-1">{{ islem.muvekkil }}</p>
                                    </div>
                                    <span class="text-sm font-black text-emerald-700">{{ formatPara(islem.kalan) }}</span>
                                  </div>
                                  <p class="text-[11px] text-slate-400 mt-2">{{ islem.tip }} dosyası</p>
                                </button>
                              } @empty {
                                <div class="rounded-2xl border border-emerald-100 border-dashed bg-white/80 p-4 text-sm font-medium text-emerald-700">Bekleyen tahsilat görünmüyor.</div>
                              }
                            </div>
                          </div>

                          <div class="rounded-2xl border border-slate-200 bg-white p-5">
                            <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-4">Ajanda Dağılımı</h4>
                            <div class="grid grid-cols-3 gap-3">
                              <div class="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
                                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Duruşma</p>
                                <p class="mt-2 text-2xl font-black text-blue-700">{{ ajandaOzet.durusma }}</p>
                              </div>
                              <div class="rounded-2xl bg-purple-50 border border-purple-100 p-4 text-center">
                                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">Toplantı</p>
                                <p class="mt-2 text-2xl font-black text-purple-700">{{ ajandaOzet.toplanti }}</p>
                              </div>
                              <div class="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-center">
                                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Süreli İş</p>
                                <p class="mt-2 text-2xl font-black text-rose-700">{{ ajandaOzet.sureliIs }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2">
                       <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg> Dosya Durum Özetleri</h3>
                       <div class="space-y-6">
                         <div>
                           <div class="flex justify-between mb-1.5 text-sm font-medium"><span class="text-blue-700 font-bold">Dava Dosyaları</span><span class="text-slate-500">{{istatistikler.davaAcik}} Derdest / {{istatistikler.davaKapali}} Kapalı</span></div>
                           <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                              <div class="bg-blue-500 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalDava ? (istatistikler.davaAcik / istatistikler.totalDava) * 100 : 0"></div>
                              <div class="bg-slate-300 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalDava ? (istatistikler.davaKapali / istatistikler.totalDava) * 100 : 0"></div>
                           </div>
                         </div>
                         <div>
                           <div class="flex justify-between mb-1.5 text-sm font-medium"><span class="text-emerald-700 font-bold">İcra Takipleri</span><span class="text-slate-500">{{istatistikler.icraAcik}} Aktif / {{istatistikler.icraKapali}} Kapalı</span></div>
                           <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                              <div class="bg-emerald-500 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalIcra ? (istatistikler.icraAcik / istatistikler.totalIcra) * 100 : 0"></div>
                              <div class="bg-slate-300 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalIcra ? (istatistikler.icraKapali / istatistikler.totalIcra) * 100 : 0"></div>
                           </div>
                         </div>
                         <div>
                           <div class="flex justify-between mb-1.5 text-sm font-medium"><span class="text-purple-700 font-bold">Arabuluculuk</span><span class="text-slate-500">{{istatistikler.arbAcik}} Aktif / {{istatistikler.arbKapali}} Kapalı</span></div>
                           <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                              <div class="bg-purple-500 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalArb ? (istatistikler.arbAcik / istatistikler.totalArb) * 100 : 0"></div>
                              <div class="bg-slate-300 h-3 transition-all duration-1000" [style.width.%]="istatistikler.totalArb ? (istatistikler.arbKapali / istatistikler.totalArb) * 100 : 0"></div>
                           </div>
                         </div>
                       </div>
                    </div>

                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                       <h3 class="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-2"><svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Acil / Süreli İşler</h3>
                       <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                         @for(is of tumAcilSureliIsler.slice(0, 5); track $index) {
                            <div class="bg-red-50/50 border border-red-100 p-3 rounded-lg cursor-pointer hover:bg-red-50 transition-colors group" (click)="sayfaDegistir(is.tur === 'dava' ? 'davalar' : (is.tur === 'icra' ? 'icralar' : 'arabuluculuk'))">
                              <div class="flex justify-between items-start mb-1">
                                <p class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate pr-2" title="{{ getTaraflarMetni(is) }}">{{ getTaraflarMetni(is) }}</p>
                                <span class="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded shrink-0">{{ hesaplaKalanGun(is.evrak.sonEylemTarihi) }}</span>
                              </div>
                              <p class="text-[11px] text-slate-600 font-medium truncate" title="{{ is.evrak.isim }}">{{ is.evrak.isim }}</p>
                            </div>
                         } @empty {
                            <div class="text-center py-8 text-emerald-500 font-medium text-xs border border-emerald-100 border-dashed rounded-lg bg-emerald-50/30 flex flex-col items-center gap-2">
                              <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              Şu an için acil bir işiniz yok.
                            </div>
                         }
                       </div>
                    </div>
                  </div>
                </div>
              }

              @case ('davalar') {
                <div class="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 shadow-sm">
                  <h3 class="text-red-800 font-bold flex items-center gap-2 mb-4 text-sm uppercase tracking-wider"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Süresi Yaklaşan İşler (Dava, İcra, Arabuluculuk)</h3>
                  @if (tumAcilSureliIsler.length > 0) {
                    <div class="flex overflow-x-auto gap-4 custom-scrollbar pb-2">
                      @for(is of tumAcilSureliIsler; track $index) {
                        <div class="bg-white border border-red-100 p-4 rounded-xl min-w-[260px] shadow-sm cursor-pointer hover:border-red-300 transition-colors" (click)="is.tur === 'dava' ? detayaGit(is.dosya) : (is.tur === 'icra' ? icraDetayinaGit(is.dosya) : arabuluculukDetayinaGit(is.dosya)); aktifDetaySekmesi = 'sureliIsler'">
                           <div class="flex justify-between items-start mb-2"><p class="text-xs font-black text-slate-800 truncate pr-2" title="{{ getTaraflarMetni(is) }}">{{ getTaraflarMetni(is) }}</p><span class="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded shrink-0">{{ hesaplaKalanGun(is.evrak.sonEylemTarihi) }}</span></div>
                           <p class="text-sm text-slate-600 font-medium truncate" title="{{ is.evrak.isim }}">{{ is.evrak.isim }}</p>
                           @if (is.anaEvrakIsim) { <p class="text-[10px] text-slate-400 truncate mt-0.5">Ek: {{ is.anaEvrakIsim }}</p> }
                        </div>
                      }
                    </div>
                  } @else { <div class="text-center py-6 bg-white rounded-lg border border-red-100 border-dashed text-red-500 font-medium text-sm">Şu an için süresi yaklaşan veya bekleyen bir işiniz bulunmuyor. Harika! 🎉</div> }
                </div>

                <div class="bg-gradient-to-r from-blue-50 via-white to-sky-50 p-4 rounded-xl shadow-sm border border-blue-100 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Dosya No, Muhatap veya Mahkeme ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Derdest">Derdest Dosyalar</option><option value="İstinaf/Temyiz">İstinaf/Temyizdekiler</option><option value="Kapalı">Kapalı Dosyalar</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                  <div class="md:hidden border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-4 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">Mobil Liste</p>
                        <h4 class="text-sm font-semibold text-slate-800">Dava kayıtları daha okunur görünümde</h4>
                      </div>
                      <span class="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700">{{ filtrelenmisDavalar.length }} kayıt</span>
                    </div>
                  </div>
                  <div class="space-y-3 p-3 md:hidden">
                    @for (dava of filtrelenmisDavalar; track dava.id) {
                      <div class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 shadow-sm">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="min-w-0 flex-1">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Dosya Numaraları</p>
                            <div class="mt-2 flex flex-wrap gap-1.5">
                              @if (dava.dosyaNumaralari && dava.dosyaNumaralari.length > 0) {
                                @for (num of dava.dosyaNumaralari; track $index) {
                                  <div class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    <span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">{{ num.tur }}</span>
                                    <span>{{ num.no }}</span>
                                  </div>
                                }
                              } @else {
                                <div class="inline-flex items-center rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">{{ dava.dosyaNo }}</div>
                              }
                            </div>
                          </div>
                          <div class="relative w-full sm:w-auto sm:min-w-[150px]">
                            <select [ngModel]="dava.durum" (ngModelChange)="durumGuncelle(dava, $event)" [class]="getDurumClass(dava.durum)" class="w-full appearance-none rounded-full border px-3 py-2 pr-8 text-xs font-bold shadow-sm outline-none transition-all">
                              <option value="Derdest" class="text-slate-700 bg-white">Derdest</option><option value="İstinaf/Temyiz" class="text-slate-700 bg-white">İstinaf/Temyiz</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 opacity-60"><svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                          </div>
                        </div>

                        <div class="mt-4 grid gap-3">
                          <div class="rounded-2xl border border-blue-100 bg-white/90 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Müvekkil</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">{{ dava.muvekkil }}</p>
                            @if (dava.muvekkilPozisyonu) {
                              <div [class]="getPozisyonClass(dava.muvekkilPozisyonu)" class="mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase">{{ dava.muvekkilPozisyonu }}</div>
                            }
                          </div>

                          <div class="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-600">Mahkeme ve Konu</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">{{ dava.mahkeme }}</p>
                            <p class="mt-1 text-xs leading-5 text-slate-600">{{ dava.konu }}</p>
                          </div>

                          <div class="rounded-2xl border border-blue-100 bg-white px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Sonraki Duruşma</p>
                            @if (dava.durusmaTarihi) {
                              <div class="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                                <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                {{ formatTarihSaat(dava.durusmaTarihi, dava.durusmaSaati) }}
                              </div>
                            } @else {
                              <p class="mt-2 text-sm font-medium text-slate-400">Henüz duruşma tarihi girilmedi.</p>
                            }
                          </div>
                        </div>

                        <div class="mt-4">
                          @if (silinecekDavaId === dava.id) {
                            <div class="rounded-2xl border border-red-200 bg-red-50 p-3">
                              <p class="text-sm font-semibold text-red-700">Bu dava kaydı silinsin mi?</p>
                              <div class="mt-3 grid grid-cols-2 gap-2">
                                <button (click)="dosyaSil(dava.id)" class="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">Onayla</button>
                                <button (click)="silmeIptal()" class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">İptal</button>
                              </div>
                            </div>
                          } @else {
                            <div class="grid grid-cols-3 gap-2">
                              <button (click)="detayaGit(dava)" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">Detay</button>
                              <button (click)="dosyaFormunuAc(dava)" class="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100">Düzenle</button>
                              <button (click)="silmeOnayiIste(dava.id, 'dava')" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100">Sil</button>
                            </div>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm font-medium text-slate-500">Kriterlere uygun dava dosyası bulunamadı.</div>
                    }
                  </div>
                  <div class="hidden md:block">
                    <div class="overflow-x-auto custom-scrollbar">
                      <table class="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr class="bg-blue-50/80 border-b border-blue-100 text-blue-700 uppercase text-xs font-semibold tracking-wider">
                            <th class="p-5">Dosya Numaraları</th><th class="p-5">Müvekkil</th><th class="p-5">Mahkeme / Konu</th><th class="p-5">Sonraki Duruşma</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (dava of filtrelenmisDavalar; track dava.id) {
                            <tr class="hover:bg-blue-50/40 transition-colors group">
                              <td class="p-5">
                                <div class="flex items-start gap-3">
                                  <div class="w-1 self-stretch rounded-full bg-blue-500"></div>
                                  <div class="flex flex-col gap-1.5">
                                    @if (dava.dosyaNumaralari && dava.dosyaNumaralari.length > 0) {
                                      @for (num of dava.dosyaNumaralari; track $index) {
                                        <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5"><span class="text-[9px] font-bold text-blue-700 uppercase bg-blue-100 px-1.5 py-0.5 rounded">{{num.tur}}</span><span>{{num.no}}</span></div>
                                      }
                                    } @else { <div class="text-xs font-medium text-slate-700">{{dava.dosyaNo}}</div> }
                                  </div>
                                </div>
                              </td>
                              <td class="p-5">
                                <div class="inline-flex min-w-[170px] flex-col rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                                  <div class="text-slate-700 font-medium">{{ dava.muvekkil }}</div>
                                  @if(dava.muvekkilPozisyonu) { <div [class]="getPozisyonClass(dava.muvekkilPozisyonu)" class="text-[10px] font-bold uppercase mt-1 inline-block px-1.5 py-0.5 rounded w-fit">{{dava.muvekkilPozisyonu}}</div> }
                                </div>
                              </td>
                              <td class="p-5"><div class="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2"><div class="text-slate-800 font-medium">{{ dava.mahkeme }}</div><div class="text-xs text-slate-500 mt-1">{{ dava.konu }}</div></div></td>
                              <td class="p-5 text-slate-600">
                               @if(dava.durusmaTarihi) { <span class="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-blue-700 font-semibold shadow-sm"><svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarihSaat(dava.durusmaTarihi, dava.durusmaSaati) }}</span> } 
                               @else { <span class="text-slate-400 text-sm">-</span> }
                              </td>
                              <td class="p-5">
                                <div class="relative inline-block">
                                  <select [ngModel]="dava.durum" (ngModelChange)="durumGuncelle(dava, $event)" [class]="getDurumClass(dava.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                    <option value="Derdest" class="text-slate-700 bg-white">Derdest</option><option value="İstinaf/Temyiz" class="text-slate-700 bg-white">İstinaf/Temyiz</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                                  </select>
                                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                </div>
                              </td>
                              <td class="p-5 text-right">
                                <div class="flex items-center justify-end gap-1">
                                  @if (silinecekDavaId === dava.id) {
                                    <span class="text-xs font-medium text-red-500 mr-2">Silinsin mi?</span>
                                    <button (click)="dosyaSil(dava.id)" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded transition-colors" title="Evet, Sil">Onayla</button>
                                    <button (click)="silmeIptal()" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded transition-colors" title="İptal">İptal</button>
                                  } @else {
                                    <button (click)="detayaGit(dava)" class="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                                    <button (click)="dosyaFormunuAc(dava)" class="text-amber-500 hover:bg-amber-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                                    <button (click)="silmeOnayiIste(dava.id, 'dava')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                  }
                                </div>
                              </td>
                            </tr>
                          } @empty { <tr><td colspan="6" class="p-10 text-center text-slate-400">Kriterlere uygun dava dosyası bulunamadı.</td></tr> }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              }

              @case ('icralar') {
                <div class="bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 rounded-xl shadow-sm border border-emerald-100 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Daire, Dosya No, Alacaklı veya Borçlu ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Aktif">Aktif Dosyalar</option><option value="İtiraz Edildi">İtiraz Edilenler</option><option value="Tehir-i İcra">Tehir-i İcra</option><option value="İnfaz/Kapalı">Kapalı Dosyalar</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                  <div class="md:hidden border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-4 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Mobil Liste</p>
                        <h4 class="text-sm font-semibold text-slate-800">İcra kayıtları daha rahat okunur</h4>
                      </div>
                      <span class="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">{{ filtrelenmisIcralar.length }} kayıt</span>
                    </div>
                  </div>
                  <div class="space-y-3 p-3 md:hidden">
                    @for (icra of filtrelenmisIcralar; track icra.id) {
                      <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="min-w-0 flex-1 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">İcra Dosyası</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">{{ icra.icraDairesi }}</p>
                            <p class="mt-1 text-xs font-medium text-slate-500">{{ icra.dosyaNo }}</p>
                            @if (icra.takipTipi) {
                              <div class="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">{{ icra.takipTipi }}</div>
                            }
                          </div>
                          <div class="relative w-full sm:w-auto sm:min-w-[165px]">
                            <select [ngModel]="icra.durum" (ngModelChange)="icraDurumGuncelle(icra, $event)" [class]="getIcraDurumClass(icra.durum)" class="w-full appearance-none rounded-full border px-3 py-2 pr-8 text-xs font-bold shadow-sm outline-none transition-all">
                              <option value="Aktif" class="text-slate-700 bg-white">Aktif</option><option value="İtiraz Edildi" class="text-slate-700 bg-white">İtiraz Edildi</option><option value="Tehir-i İcra" class="text-slate-700 bg-white">Tehir-i İcra</option><option value="İnfaz/Kapalı" class="text-slate-700 bg-white">İnfaz/Kapalı</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 opacity-60"><svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                          </div>
                        </div>

                        <div class="mt-4 grid gap-3">
                          <div class="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">Taraflar</p>
                            <div class="mt-2 space-y-2">
                              <div>
                                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Alacaklı</p>
                                <p class="mt-1 text-sm font-semibold text-slate-900">{{ icra.alacakli }}</p>
                              </div>
                              <div>
                                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Borçlu</p>
                                <p class="mt-1 text-sm font-semibold text-slate-900">{{ icra.borclu }}</p>
                              </div>
                            </div>
                          </div>

                          <div class="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Takip Tarihi</p>
                            <div class="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                              <svg class="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              {{ formatTarih(icra.takipTarihi) }}
                            </div>
                          </div>
                        </div>

                        <div class="mt-4">
                          @if (silinecekIcraId === icra.id) {
                            <div class="rounded-2xl border border-red-200 bg-red-50 p-3">
                              <p class="text-sm font-semibold text-red-700">Bu icra kaydı silinsin mi?</p>
                              <div class="mt-3 grid grid-cols-2 gap-2">
                                <button (click)="icraSil(icra.id)" class="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">Onayla</button>
                                <button (click)="silmeIptal()" class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">İptal</button>
                              </div>
                            </div>
                          } @else {
                            <div class="grid grid-cols-3 gap-2">
                              <button (click)="icraDetayinaGit(icra)" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">Detay</button>
                              <button (click)="icraFormunuAc(icra)" class="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100">Düzenle</button>
                              <button (click)="silmeOnayiIste(icra.id, 'icra')" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100">Sil</button>
                            </div>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-8 text-center text-sm font-medium text-slate-500">İcra dosyası bulunamadı.</div>
                    }
                  </div>
                  <div class="hidden md:block">
                    <div class="overflow-x-auto custom-scrollbar">
                      <table class="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr class="bg-emerald-50/80 border-b border-emerald-100 text-emerald-700 uppercase text-xs font-semibold tracking-wider">
                            <th class="p-5">İcra Dairesi / No</th><th class="p-5">Alacaklı</th><th class="p-5">Borçlu</th><th class="p-5">Takip Tarihi</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (icra of filtrelenmisIcralar; track icra.id) {
                            <tr class="hover:bg-emerald-50/40 transition-colors group">
                              <td class="p-5">
                                 <div class="flex items-start gap-3">
                                   <div class="w-1 self-stretch rounded-full bg-emerald-500"></div>
                                   <div class="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 min-w-[190px]">
                                     <div class="text-sm font-bold text-slate-800">{{icra.icraDairesi}}</div>
                                     <div class="text-xs font-medium text-slate-500 mt-0.5">{{icra.dosyaNo}}</div>
                                     @if(icra.takipTipi) { <div class="text-[10px] font-bold text-emerald-700 uppercase mt-1">{{icra.takipTipi}}</div> }
                                   </div>
                                 </div>
                              </td>
                              <td class="p-5"><div class="rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-2 text-slate-700 font-medium">{{ icra.alacakli }}</div></td>
                              <td class="p-5"><div class="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-slate-700 font-medium">{{ icra.borclu }}</div></td>
                              <td class="p-5 text-slate-600"><span class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-emerald-700 font-semibold shadow-sm"><svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarih(icra.takipTarihi) }}</span></td>
                              <td class="p-5">
                                <div class="relative inline-block">
                                  <select [ngModel]="icra.durum" (ngModelChange)="icraDurumGuncelle(icra, $event)" [class]="getIcraDurumClass(icra.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                    <option value="Aktif" class="text-slate-700 bg-white">Aktif</option><option value="İtiraz Edildi" class="text-slate-700 bg-white">İtiraz Edildi</option><option value="Tehir-i İcra" class="text-slate-700 bg-white">Tehir-i İcra</option><option value="İnfaz/Kapalı" class="text-slate-700 bg-white">İnfaz/Kapalı</option>
                                  </select>
                                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                </div>
                              </td>
                              <td class="p-5 text-right">
                                <div class="flex items-center justify-end gap-1">
                                  @if (silinecekIcraId === icra.id) {
                                    <span class="text-xs font-medium text-red-500 mr-2">Silinsin mi?</span>
                                    <button (click)="icraSil(icra.id)" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded transition-colors" title="Evet, Sil">Onayla</button>
                                    <button (click)="silmeIptal()" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded transition-colors" title="İptal">İptal</button>
                                  } @else {
                                    <button (click)="icraDetayinaGit(icra)" class="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                                    <button (click)="icraFormunuAc(icra)" class="text-amber-500 hover:bg-amber-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                                    <button (click)="silmeOnayiIste(icra.id, 'icra')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                  }
                                </div>
                              </td>
                            </tr>
                          } @empty { <tr><td colspan="6" class="p-10 text-center text-slate-400">İcra dosyası bulunamadı.</td></tr> }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              }

              @case ('arabuluculuk') {
                <div class="bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-4 rounded-xl shadow-sm border border-violet-100 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Büro No, Arabuluculuk No veya Taraf ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Hazırlık">Hazırlık</option><option value="Müzakere">Müzakere</option><option value="İmza">İmza</option><option value="Tahsilat">Tahsilat</option><option value="Kapalı">Kapalı</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-violet-100 overflow-hidden">
                  <div class="md:hidden border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-4 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">Mobil Liste</p>
                        <h4 class="text-sm font-semibold text-slate-800">Arabuluculuk kayıtları daha seçilebilir</h4>
                      </div>
                      <span class="shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-violet-700">{{ filtrelenmisArabuluculuk.length }} kayıt</span>
                    </div>
                  </div>
                  <div class="space-y-3 p-3 md:hidden">
                    @for (arb of filtrelenmisArabuluculuk; track arb.id) {
                      <div class="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="min-w-0 flex-1 rounded-2xl border border-violet-100 bg-white/90 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Numaralar</p>
                            <div class="mt-2 flex flex-wrap gap-2">
                              <div class="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                <span class="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-violet-700">Büro</span>
                                <span>{{ arb.buroNo || '-' }}</span>
                              </div>
                              <div class="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                <span class="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-fuchsia-700">ARB</span>
                                <span>{{ arb.arabuluculukNo }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="relative w-full sm:w-auto sm:min-w-[150px]">
                            <select [ngModel]="arb.durum" (ngModelChange)="arabuluculukDurumGuncelle(arb, $event)" [class]="getArabuluculukDurumClass(arb.durum)" class="w-full appearance-none rounded-full border px-3 py-2 pr-8 text-xs font-bold shadow-sm outline-none transition-all">
                              <option value="Hazırlık" class="text-slate-700 bg-white">Hazırlık</option><option value="Müzakere" class="text-slate-700 bg-white">Müzakere</option><option value="İmza" class="text-slate-700 bg-white">İmza</option><option value="Tahsilat" class="text-slate-700 bg-white">Tahsilat</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 opacity-60"><svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                          </div>
                        </div>

                        <div class="mt-4 grid gap-3">
                          <div class="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700">Taraflar</p>
                            <div class="mt-2 space-y-2">
                              @for (taraf of arb.taraflar; track taraf.id) {
                                <div class="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                                  <span [class]="taraf.tip === 'Başvurucu' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'" class="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase">{{ taraf.tip }}</span>
                                  <span class="min-w-0 text-sm font-semibold text-slate-900">{{ taraf.isim }}</span>
                                </div>
                              }
                            </div>
                          </div>

                          <div class="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-700">Büro ve Tür</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">{{ arb.buro }}</p>
                            <p class="mt-1 text-xs leading-5 text-slate-600">{{ arb.basvuruTuru }} - {{ arb.uyusmazlikTuru }}</p>
                          </div>

                          <div class="rounded-2xl border border-violet-100 bg-white px-4 py-3">
                            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Toplantı</p>
                            @if (arb.toplantiTarihi) {
                              <div class="mt-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                                <svg class="h-4 w-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                {{ formatTarihSaat(arb.toplantiTarihi, arb.toplantiSaati) }}
                              </div>
                              @if (arb.toplantiYontemi) {
                                <div class="mt-2 inline-flex rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase text-purple-600">{{ arb.toplantiYontemi }}</div>
                              }
                            } @else {
                              <p class="mt-2 text-sm font-medium text-slate-400">Henüz toplantı tarihi girilmedi.</p>
                            }
                          </div>
                        </div>

                        <div class="mt-4">
                          @if (silinecekArabuluculukId === arb.id) {
                            <div class="rounded-2xl border border-red-200 bg-red-50 p-3">
                              <p class="text-sm font-semibold text-red-700">Bu arabuluculuk kaydı silinsin mi?</p>
                              <div class="mt-3 grid grid-cols-2 gap-2">
                                <button (click)="arabuluculukSil(arb.id)" class="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">Onayla</button>
                                <button (click)="silmeIptal()" class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">İptal</button>
                              </div>
                            </div>
                          } @else {
                            <div class="grid grid-cols-3 gap-2">
                              <button (click)="arabuluculukDetayinaGit(arb)" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">Detay</button>
                              <button (click)="arabuluculukFormAc(arb)" class="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100">Düzenle</button>
                              <button (click)="silmeOnayiIste(arb.id, 'arabuluculuk')" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100">Sil</button>
                            </div>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center text-sm font-medium text-slate-500">Arabuluculuk dosyası bulunamadı.</div>
                    }
                  </div>
                  <div class="hidden md:block">
                    <div class="overflow-x-auto custom-scrollbar">
                      <table class="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr class="bg-violet-50/80 border-b border-violet-100 text-violet-700 uppercase text-xs font-semibold tracking-wider">
                            <th class="p-5">Numaralar</th><th class="p-5">Taraflar</th><th class="p-5">Büro / Türü</th><th class="p-5">Toplantı</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (arb of filtrelenmisArabuluculuk; track arb.id) {
                            <tr class="hover:bg-violet-50/40 transition-colors group">
                              <td class="p-5">
                                 <div class="flex items-start gap-3">
                                   <div class="w-1 self-stretch rounded-full bg-violet-500"></div>
                                   <div>
                                     <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5"><span class="text-[9px] font-bold text-violet-700 uppercase bg-violet-100 px-1.5 py-0.5 rounded">BÜRO</span><span>{{arb.buroNo || '-'}}</span></div>
                                     <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-1.5"><span class="text-[9px] font-bold text-fuchsia-700 uppercase bg-fuchsia-100 px-1.5 py-0.5 rounded">ARB</span><span>{{arb.arabuluculukNo}}</span></div>
                                   </div>
                                 </div>
                              </td>
                              <td class="p-5">
                                <div class="flex flex-col gap-1 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2">
                                  @for (taraf of arb.taraflar; track taraf.id) {
                                    <div class="flex items-center gap-1.5 text-sm">
                                      <span [class]="taraf.tip === 'Başvurucu' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'" class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{{taraf.tip}}</span>
                                      <span class="text-slate-700 font-medium truncate max-w-[150px]">{{ taraf.isim }}</span>
                                    </div>
                                  }
                                </div>
                              </td>
                              <td class="p-5">
                                <div class="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 px-3 py-2">
                                  <div class="text-slate-800 font-bold text-sm">{{ arb.buro }}</div>
                                  <div class="text-xs font-medium text-slate-500 mt-1">{{ arb.basvuruTuru }} - {{ arb.uyusmazlikTuru }}</div>
                                </div>
                              </td>
                              <td class="p-5 text-slate-600">
                                 @if(arb.toplantiTarihi) { 
                                 <span class="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm"><svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarihSaat(arb.toplantiTarihi, arb.toplantiSaati) }}</span> 
                                   @if(arb.toplantiYontemi) { <div class="text-[10px] text-purple-600 font-bold bg-purple-50 inline-block px-1.5 py-0.5 rounded mt-1">{{ arb.toplantiYontemi }}</div> }
                                 } @else { <span class="text-slate-400 text-sm">-</span> }
                              </td>
                              <td class="p-5">
                                <div class="relative inline-block">
                                  <select [ngModel]="arb.durum" (ngModelChange)="arabuluculukDurumGuncelle(arb, $event)" [class]="getArabuluculukDurumClass(arb.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                    <option value="Hazırlık" class="text-slate-700 bg-white">Hazırlık</option><option value="Müzakere" class="text-slate-700 bg-white">Müzakere</option><option value="İmza" class="text-slate-700 bg-white">İmza</option><option value="Tahsilat" class="text-slate-700 bg-white">Tahsilat</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                                  </select>
                                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                                </div>
                              </td>
                              <td class="p-5 text-right">
                                <div class="flex items-center justify-end gap-1">
                                  @if (silinecekArabuluculukId === arb.id) {
                                    <span class="text-xs font-medium text-red-500 mr-2">Silinsin mi?</span>
                                    <button (click)="arabuluculukSil(arb.id)" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded transition-colors">Onayla</button>
                                    <button (click)="silmeIptal()" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded transition-colors">İptal</button>
                                  } @else {
                                    <button (click)="arabuluculukDetayinaGit(arb)" class="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                                    <button (click)="arabuluculukFormAc(arb)" class="text-amber-500 hover:bg-amber-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                                    <button (click)="silmeOnayiIste(arb.id, 'arabuluculuk')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                  }
                                </div>
                              </td>
                            </tr>
                          } @empty { <tr><td colspan="6" class="p-10 text-center text-slate-400">Arabuluculuk dosyası bulunamadı.</td></tr> }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              }

              @case ('ajanda') {
                <div class="space-y-6 max-w-7xl mx-auto pb-10">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl shadow-sm text-white">
                      <p class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Toplam Ajanda</p>
                      <p class="text-3xl font-black">{{ ajandaOzet.toplam }}</p>
                      <p class="text-xs text-slate-400 mt-2">Dava, arabuluculuk ve sureli isler tek listede.</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-amber-100">
                      <p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Bugun</p>
                      <p class="text-3xl font-black text-slate-800">{{ ajandaOzet.bugun }}</p>
                      <p class="text-xs text-slate-500 mt-2">Bugune denk gelen kayit</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
                      <p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">7 Gun Icinde</p>
                      <p class="text-3xl font-black text-slate-800">{{ ajandaOzet.yakin }}</p>
                      <p class="text-xs text-slate-500 mt-2">Yaklasan is ve toplanti</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-rose-100">
                      <p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Gecikmis</p>
                      <p class="text-3xl font-black text-slate-800">{{ ajandaOzet.gecmis }}</p>
                      <p class="text-xs text-slate-500 mt-2">Tarihi gecmis kayit</p>
                    </div>
                  </div>

                  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-3">
                    <div class="flex-1">
                      <input [(ngModel)]="ajandaArama" type="text" placeholder="Taraf, dosya, evrak veya mahkeme ara..." class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    </div>
                    <div class="lg:w-52">
                      <select [(ngModel)]="ajandaZamanFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-700">
                        <option value="all">Tum Tarihler</option>
                        <option value="today">Sadece Bugun</option>
                        <option value="7days">7 Gun Icinde</option>
                        <option value="30days">30 Gun Icinde</option>
                        <option value="overdue">Gecikmisler</option>
                      </select>
                    </div>
                    <div class="lg:w-52">
                      <select [(ngModel)]="ajandaTurFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium text-slate-700">
                        <option value="all">Tum Kayitlar</option>
                        <option value="durusma">Durusmalar</option>
                        <option value="toplanti">Toplantilar</option>
                        <option value="sureliIs">Sureli Isler</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div class="xl:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Ajanda Akisi</h3>
                          <p class="text-xs text-slate-500 mt-1">Bir satira tiklayarak dogrudan ilgili dosya detayina gidebilirsiniz.</p>
                        </div>
                        <div class="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 w-fit">
                          {{ filtrelenmisAjandaKayitlari.length }} kayit
                        </div>
                      </div>

                      <div class="divide-y divide-slate-100">
                        @for (kayit of filtrelenmisAjandaKayitlari; track kayit.id) {
                          <div (click)="ajandaKaydinaGit(kayit)" class="w-full cursor-pointer text-left px-5 py-4 hover:bg-slate-50 transition-colors group">
                            <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                              <div class="shrink-0 flex items-center gap-3">
                                <div class="w-16 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center shadow-sm">
                                  <div class="text-[10px] uppercase font-black text-slate-400">{{ formatTarihAy(kayit.tarih) }}</div>
                                  <div class="text-2xl font-black text-slate-800 leading-none mt-1">{{ formatTarihGun(kayit.tarih) }}</div>
                                </div>
                                <div class="hidden sm:flex flex-col gap-2 min-w-[120px]">
                                  <span [class]="getAjandaTurClass(kayit.tur)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-center">{{ getAjandaTurEtiketi(kayit.tur) }}</span>
                                  <span [class]="getAjandaKaynakClass(kayit.kaynak)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-center">{{ getAjandaKaynakEtiketi(kayit.kaynak) }}</span>
                                </div>
                              </div>

                              <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                  <span [class]="getAjandaTurClass(kayit.tur)" class="sm:hidden px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ getAjandaTurEtiketi(kayit.tur) }}</span>
                                  <span [class]="getAjandaKaynakClass(kayit.kaynak)" class="sm:hidden px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ getAjandaKaynakEtiketi(kayit.kaynak) }}</span>
                                  <span [class]="getAjandaKalanGunClass(kayit.tarih)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ ajandaDurumMetni(kayit.tarih) }}</span>
                                  @if (kayit.saat) {
                                    <span class="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">Saat {{ formatSaat(kayit.saat) }}</span>
                                  }
                                </div>
                                <h3 class="text-base font-black text-slate-800 group-hover:text-blue-700 transition-colors">{{ kayit.baslik }}</h3>
                                <p class="text-sm text-slate-600 font-medium mt-1">{{ kayit.taraflar }}</p>
                                <p class="text-xs text-slate-500 mt-2">{{ kayit.altBaslik }}</p>
                                @if (kayit.anaEvrakIsmi) {
                                  <p class="text-xs text-slate-400 mt-1">Bagli evrak: {{ kayit.anaEvrakIsmi }}</p>
                                }
                              </div>

                              <div class="lg:text-right shrink-0 lg:min-w-[190px]">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</p>
                                <p class="text-sm font-bold text-slate-800 mt-1">{{ formatTarih(kayit.tarih) }}</p>
                                @if (kayit.saat) {
                                  <p class="text-xs font-bold text-slate-500 mt-1">Saat {{ formatSaat(kayit.saat) }}</p>
                                }
                                <p class="text-xs text-slate-500 mt-1">{{ getAjandaDosyaOzeti(kayit.kaynak, kayit.dosya) }}</p>
                                <div class="mt-3 flex flex-col items-start gap-2 lg:items-end">
                                  <button type="button" (click)="ajandaKaydiTamamla(kayit, $event)" class="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-800">{{ getAjandaTamamlaMetni(kayit) }}</button>
                                  <p class="text-xs text-blue-600 font-bold group-hover:underline">Detaya git</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        } @empty {
                          <div class="px-6 py-16 text-center">
                            <div class="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </div>
                            <p class="text-lg font-bold text-slate-700">Bu filtrelerle gorunen bir ajanda kaydi yok.</p>
                            <p class="text-sm text-slate-500 mt-2">Zaman filtresini genisletmeyi veya farkli bir arama yapmayi deneyin.</p>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="xl:col-span-4 space-y-6">
                      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Yaklasan 5 Kayit</h3>
                        <div class="space-y-3">
                          @for (kayit of yaklasanAjandaKayitlari; track kayit.id) {
                            <button (click)="ajandaKaydinaGit(kayit)" class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-colors">
                              <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                  <p class="text-xs font-black text-slate-800 truncate">{{ kayit.baslik }}</p>
                                  <p class="text-[11px] text-slate-500 mt-1 truncate">{{ kayit.taraflar }}</p>
                                  @if (kayit.saat) { <p class="text-[10px] font-bold text-slate-400 mt-1">Saat {{ formatSaat(kayit.saat) }}</p> }
                                </div>
                                <span [class]="getAjandaKalanGunClass(kayit.tarih)" class="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">{{ ajandaDurumMetni(kayit.tarih) }}</span>
                              </div>
                              <div class="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                                <span>{{ getAjandaTurEtiketi(kayit.tur) }}</span>
                                <span>{{ formatTarihKisa(kayit.tarih) }}</span>
                              </div>
                            </button>
                          } @empty {
                            <div class="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">Yaklasan bir kayit bulunmuyor.</div>
                          }
                        </div>
                      </div>

                      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Dagilim</h3>
                        <div class="space-y-3">
                          <div class="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <div>
                              <p class="text-xs font-black text-blue-700 uppercase tracking-wider">Durusmalar</p>
                              <p class="text-xs text-blue-600 mt-1">Dava dosyalarindaki durusma tarihleri</p>
                            </div>
                            <span class="text-2xl font-black text-blue-700">{{ ajandaOzet.durusma }}</span>
                          </div>
                          <div class="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                            <div>
                              <p class="text-xs font-black text-purple-700 uppercase tracking-wider">Toplantilar</p>
                              <p class="text-xs text-purple-600 mt-1">Arabuluculuk gorusmeleri</p>
                            </div>
                            <span class="text-2xl font-black text-purple-700">{{ ajandaOzet.toplanti }}</span>
                          </div>
                          <div class="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
                            <div>
                              <p class="text-xs font-black text-rose-700 uppercase tracking-wider">Sureli Isler</p>
                              <p class="text-xs text-rose-600 mt-1">Son eylem tarihi girilen evraklar</p>
                            </div>
                            <span class="text-2xl font-black text-rose-700">{{ ajandaOzet.sureliIs }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              @case ('sablonlar') {
                <div class="space-y-6 max-w-5xl mx-auto pb-10">
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px]">
                    <div class="flex border-b border-slate-200 bg-slate-50">
                       <button (click)="aktifSablonSekmesi = 'avukatlik'" [class.border-blue-500]="aktifSablonSekmesi === 'avukatlik'" [class.text-blue-600]="aktifSablonSekmesi === 'avukatlik'" [class.border-transparent]="aktifSablonSekmesi !== 'avukatlik'" [class.text-slate-500]="aktifSablonSekmesi !== 'avukatlik'" class="flex-1 py-4 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2">Avukatlık Şablonları</button>
                       <button (click)="aktifSablonSekmesi = 'arabuluculuk'" [class.border-blue-500]="aktifSablonSekmesi === 'arabuluculuk'" [class.text-blue-600]="aktifSablonSekmesi === 'arabuluculuk'" [class.border-transparent]="aktifSablonSekmesi !== 'arabuluculuk'" [class.text-slate-500]="aktifSablonSekmesi !== 'arabuluculuk'" class="flex-1 py-4 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2">Arabuluculuk Şablonları</button>
                    </div>
                    <div class="p-6 flex-1 flex flex-col h-full bg-slate-50/50">
                      <div class="flex flex-col h-full">
                         <div class="flex flex-col gap-3 mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                            <p class="text-[10px] font-black uppercase text-blue-600 tracking-wider">Yeni Şablon Ekle</p>
                            <div class="flex gap-2 w-full">
                              <input [(ngModel)]="yeniEvrak.isim" type="text" placeholder="Şablon Adı (Örn: İhtarname Şablonu, Dava Şartı Başvuru Formu)" class="w-1/3 px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                              <input [(ngModel)]="yeniEvrak.url" (keyup.enter)="evrakEkle()" type="text" placeholder="Bağlantı URL (Google Drive, vs)" class="flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                              <button (click)="evrakEkle()" class="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0 h-[42px]">Listeye Ekle</button>
                            </div>
                         </div>
                         <div class="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 custom-scrollbar">
                            @for (evrak of sablonlar[aktifSablonSekmesi]; track evrak.id; let i = $index) {
                              <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:border-blue-300">
                                <div class="flex items-center justify-between p-3" [class.bg-blue-50]="duzenlenenEvrakId === evrak.id">
                                  @if (duzenlenenEvrakId === evrak.id && !duzenlenenEvrakParentId) {
                                     <div class="flex flex-col w-full gap-2">
                                        <div class="flex gap-2">
                                          <input [(ngModel)]="duzenlenenEvrak.isim" class="w-1/3 px-2 py-1.5 text-sm border border-blue-400 rounded outline-none">
                                          <input [(ngModel)]="duzenlenenEvrak.url" class="flex-1 px-2 py-1.5 text-sm border border-blue-400 rounded outline-none">
                                          <button (click)="evrakGuncelleKaydet()" class="px-4 py-1.5 bg-green-500 text-white rounded text-xs font-bold shadow-sm">Kaydet</button>
                                          <button (click)="evrakDuzenleIptal()" class="px-4 py-1.5 bg-slate-300 text-slate-700 rounded text-xs font-bold">İptal</button>
                                        </div>
                                     </div>
                                  } @else {
                                     <div class="flex items-center gap-3">
                                       <div class="w-7 h-7 flex items-center justify-center">
                                         @if (evrak.ekler && evrak.ekler.length > 0) {
                                           <button (click)="klasorGecis(evrak.id)" class="w-full h-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"><svg class="w-4 h-4 transition-transform" [class.rotate-180]="acikKlasorler[evrak.id]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg></button>
                                         }
                                       </div>
                                       <div class="flex flex-col bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                         <button (click)="evrakYukari(i)" [disabled]="i === 0" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 leading-none py-0.5">▲</button>
                                         <button (click)="evrakAsagi(i)" [disabled]="i === sablonlar[aktifSablonSekmesi].length - 1" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 leading-none py-0.5 border-t border-slate-200">▼</button>
                                       </div>
                                       <p class="font-bold text-sm text-slate-800">{{ evrak.isim }}</p>
                                     </div>
                                     <div class="flex items-center gap-2 shrink-0">
                                       <button (click)="ekEvrakFormAc(evrak.id)" class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded transition-colors flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Alt Ek</button>
                                       <button (click)="evrakDuzenleBaslat(evrak)" class="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded transition-colors">Düzenle</button>
                                       <a [href]="guvenliUrl(evrak.url)" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded transition-colors">Aç</a>
                                       <button (click)="evrakSil(evrak.id)" class="text-slate-300 hover:text-red-500 p-1.5 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                     </div>
                                  }
                                </div>
                                @if (evrak.ekler && evrak.ekler.length > 0 && acikKlasorler[evrak.id]) {
                                  <div class="bg-slate-50 border-t border-slate-100 px-3 py-2 pl-[3.25rem] space-y-2 relative">
                                    <div class="absolute left-[1.3rem] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                    @for (ek of evrak.ekler; track ek.id; let j = $index) {
                                      <div class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm relative" [class.bg-blue-50]="duzenlenenEvrakId === ek.id">
                                        <div class="absolute -left-5 top-1/2 w-4 h-0.5 bg-slate-200"></div>
                                        @if (duzenlenenEvrakId === ek.id && duzenlenenEvrakParentId === evrak.id) {
                                           <div class="flex flex-col w-full gap-2">
                                             <div class="flex gap-2">
                                               <input [(ngModel)]="duzenlenenEvrak.isim" class="w-1/3 px-2 py-1 text-sm border border-blue-400 rounded outline-none">
                                               <input [(ngModel)]="duzenlenenEvrak.url" class="flex-1 px-2 py-1 text-sm border border-blue-400 rounded outline-none">
                                               <button (click)="evrakGuncelleKaydet()" class="px-3 py-1 bg-green-500 text-white rounded text-[10px] font-bold">Kaydet</button>
                                               <button (click)="evrakDuzenleIptal()" class="px-3 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold">İptal</button>
                                             </div>
                                           </div>
                                        } @else {
                                           <div class="flex items-center gap-3">
                                             <div class="flex flex-col bg-slate-50 rounded border border-slate-200 overflow-hidden">
                                               <button (click)="ekEvrakYukari(evrak, j)" [disabled]="j === 0" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-[10px] leading-none py-0.5">▲</button>
                                               <button (click)="ekEvrakAsagi(evrak, j)" [disabled]="j === evrak.ekler.length - 1" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-[10px] leading-none py-0.5 border-t border-slate-200">▼</button>
                                             </div>
                                             <p class="font-bold text-xs text-slate-700">{{ ek.isim }}</p>
                                           </div>
                                           <div class="flex items-center gap-1.5 shrink-0">
                                             <button (click)="evrakDuzenleBaslat(ek, evrak.id)" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold">Düzenle</button>
                                             <a [href]="guvenliUrl(ek.url)" target="_blank" class="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-[10px] font-bold rounded">Aç</a>
                                             <button (click)="ekEvrakSil(evrak.id, ek.id)" class="text-slate-300 hover:text-red-500 p-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                           </div>
                                        }
                                      </div>
                                    }
                                  </div>
                                }
                                @if (ekEklenenEvrakId === evrak.id) {
                                  <div class="bg-indigo-50/50 border-t border-indigo-100 px-3 py-3 pl-[3.25rem] flex flex-col gap-2 relative">
                                    <div class="absolute left-[1.3rem] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                    <p class="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Alt Ek Oluşturuluyor</p>
                                    <div class="flex gap-2 items-center">
                                      <input [(ngModel)]="yeniEkEvrak.isim" type="text" placeholder="Ek Şablon Adı" class="w-1/3 px-2 py-1.5 text-xs border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-500">
                                      <input [(ngModel)]="yeniEkEvrak.url" (keyup.enter)="ekEvrakKaydet(evrak.id)" type="text" placeholder="Bağlantı URL" class="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-500">
                                      <button (click)="ekEvrakKaydet(evrak.id)" class="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">Kaydet</button>
                                      <button (click)="ekEvrakFormKapat()" class="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200">İptal</button>
                                    </div>
                                  </div>
                                }
                              </div>
                            } @empty { <div class="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium">Buraya henüz bir şablon eklemediniz.</div> }
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              @case ('muhasebe') {
                <div class="space-y-6 max-w-7xl mx-auto pb-10">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-gradient-to-br from-slate-700 to-slate-800 p-5 rounded-xl shadow-sm text-white">
                      <p class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Toplam Bekleyen Alacak</p>
                      <p class="text-2xl font-black">{{ formatPara(muhasebeOzet.toplam) }}</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
                      <p class="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Avukatlık (Dava)</p>
                      <p class="text-2xl font-black text-blue-700">{{ formatPara(muhasebeOzet.avukatlik) }}</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
                      <p class="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">İcra</p>
                      <p class="text-2xl font-black text-emerald-700">{{ formatPara(muhasebeOzet.icra) }}</p>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-purple-100">
                      <p class="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Arabuluculuk</p>
                      <p class="text-2xl font-black text-purple-700">{{ formatPara(muhasebeOzet.arabuluculuk) }}</p>
                    </div>
                  </div>

                  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                    <div class="flex-1 relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
                      <input [(ngModel)]="muhasebeArama" type="text" placeholder="Kişi/Kurum veya Dosya No ara..." class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none transition-all">
                    </div>
                    <div class="sm:w-64">
                      <select [(ngModel)]="muhasebeFiltre" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none transition-all bg-white font-medium text-slate-700">
                        <option value="Tümü">Tüm Alacaklar</option><option value="Avukatlık">Sadece Avukatlık</option><option value="İcra">Sadece İcra</option><option value="Arabuluculuk">Sadece Arabuluculuk</option>
                      </select>
                    </div>
                  </div>

                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto custom-scrollbar">
                      <table class="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                            <th class="p-5">Tür</th><th class="p-5">Dosya / No</th><th class="p-5">Muhatap (Kişi/Kurum)</th><th class="p-5 text-right">Anlaşılan Ücret</th><th class="p-5 text-right">Tahsil Edilen</th><th class="p-5 text-right">Kalan Alacak</th><th class="p-5 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (islem of filtrelenmisMuhasebeListesi; track islem.id + islem.tip) {
                            <tr class="hover:bg-slate-50 transition-colors group">
                              <td class="p-5">
                                <span [class]="islem.tip === 'Avukatlık' ? 'bg-blue-100 text-blue-700' : (islem.tip === 'İcra' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700')" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{{ islem.tip }}</span>
                              </td>
                              <td class="p-5 font-bold text-sm text-slate-800">{{ islem.isim }}</td>
                              <td class="p-5 max-w-[250px]">
                                <div class="text-sm text-slate-600 font-medium truncate" title="{{ islem.muvekkil }}">{{ islem.muvekkil }}</div>
                                @if (islem.ekBilgi) {
                                  <div class="text-[10px] text-slate-400 mt-0.5 truncate" title="{{ islem.ekBilgi }}">({{ islem.ekBilgi }})</div>
                                }
                              </td>
                              <td class="p-5 text-right text-sm text-slate-500 font-medium">{{ formatPara(islem.toplam) }}</td>
                              <td class="p-5 text-right text-sm text-emerald-600 font-medium">{{ formatPara(islem.tahsilat) }}</td>
                              <td class="p-5 text-right text-sm text-rose-600 font-bold bg-rose-50/30">{{ formatPara(islem.kalan) }}</td>
                              <td class="p-5 text-right">
                                <button (click)="islem.detayFonk()" class="text-slate-400 hover:text-slate-800 px-3 py-1.5 rounded transition-colors bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 ml-auto">
                                  <span>Detaya Git</span><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                              </td>
                            </tr>
                          } @empty { <tr><td colspan="7" class="p-10 text-center text-slate-400 font-medium">Bu kriterlerde bekleyen bir alacak bulunmuyor. Harika! 🎉</td></tr> }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              }

              @case ('iliskiler') {
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div class="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
                    <button (click)="aktifIliskiSekmesi = 'Müvekkil'" [class.bg-white]="aktifIliskiSekmesi === 'Müvekkil'" [class.shadow-sm]="aktifIliskiSekmesi === 'Müvekkil'" class="px-4 py-2 rounded-md text-sm font-bold transition-all text-slate-700">Müvekkiller</button>
                    <button (click)="aktifIliskiSekmesi = 'Şirketler'" [class.bg-white]="aktifIliskiSekmesi === 'Şirketler'" [class.shadow-sm]="aktifIliskiSekmesi === 'Şirketler'" class="px-4 py-2 rounded-md text-sm font-bold transition-all text-slate-700">Şirketler</button>
                    <button (click)="aktifIliskiSekmesi = 'Borçlular'" [class.bg-white]="aktifIliskiSekmesi === 'Borçlular'" [class.shadow-sm]="aktifIliskiSekmesi === 'Borçlular'" class="px-4 py-2 rounded-md text-sm font-bold transition-all text-slate-700">Borçlular</button>
                    <button (click)="aktifIliskiSekmesi = 'Diğer'" [class.bg-white]="aktifIliskiSekmesi === 'Diğer'" [class.shadow-sm]="aktifIliskiSekmesi === 'Diğer'" class="px-4 py-2 rounded-md text-sm font-bold transition-all text-slate-700">Diğer</button>
                  </div>
                  
                  <div class="flex-1 flex gap-3 w-full md:w-auto">
                    <div class="flex-1 relative">
                      <input [(ngModel)]="iliskiArama" type="text" placeholder="İsim, TC/VKN veya telefon ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm">
                    </div>
                    <select [(ngModel)]="iliskiFiltre" class="px-3 py-2.5 border border-slate-300 rounded-lg outline-none bg-white text-sm font-medium text-slate-700">
                      <option value="Tümü">Tümünü Göster</option><option value="Borclu">Sadece Borcu Olanlar</option><option value="Alacakli">Sadece Emaneti Olanlar</option>
                    </select>
                    <!-- YENİ: SIRALAMA SEÇENEKLERİ -->
                    <select [(ngModel)]="iliskiSiralama" class="px-3 py-2.5 border border-slate-300 rounded-lg outline-none bg-white text-sm font-medium text-slate-700">
                      <option value="a-z">A-Z Sırala</option><option value="z-a">Z-A Sırala</option><option value="yeni">En Yeniler</option><option value="eski">En Eskiler</option>
                    </select>
                    <div class="flex border border-slate-300 rounded-lg overflow-hidden shrink-0">
                      <button (click)="iliskiGorunumModu = 'kart'" [class.bg-slate-200]="iliskiGorunumModu === 'kart'" class="p-2.5 text-slate-600 hover:bg-slate-100 transition-colors" title="Kart Görünümü"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg></button>
                      <button (click)="iliskiGorunumModu = 'liste'" [class.bg-slate-200]="iliskiGorunumModu === 'liste'" class="p-2.5 text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-300" title="Liste Görünümü"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
                    </div>
                  </div>
                </div>

                @if (iliskiGorunumModu === 'kart') {
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    @for (muvekkil of filtrelenmisIliskiler; track muvekkil.id) {
                      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all relative group flex flex-col h-full">
                        <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm">
                           <button (click)="muvekkilFormunuAc(muvekkil)" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded" title="Düzenle"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                           @if (silinecekMuvekkilId === muvekkil.id) {
                             <button (click)="muvekkilSil(muvekkil.id)" class="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded text-xs">Onayla</button>
                             <button (click)="silmeIptal()" class="p-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded text-xs">İptal</button>
                           } @else {
                             <button (click)="silmeOnayiIste(muvekkil.id, 'muvekkil')" class="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Sil"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                           }
                        </div>
                        <div class="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                          <div class="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl shadow-inner shrink-0">{{ muvekkil.adSoyad.charAt(0).toUpperCase() }}</div>
                          <div><h3 class="font-bold text-slate-800 text-lg leading-tight">{{ muvekkil.adSoyad }}</h3><p class="text-xs text-slate-500 mt-0.5">TC/VKN: {{ muvekkil.tcKimlik || '-' }}</p></div>
                        </div>
                        <div class="p-5 space-y-3 text-sm flex-1">
                          <div class="flex items-center gap-3 text-slate-600"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg><span>{{ muvekkil.telefon || 'Belirtilmedi' }}</span></div>
                          <div class="flex items-start gap-3 text-slate-600"><svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span class="break-all">{{ muvekkil.adres || 'Adres girilmedi' }}</span></div>
                          @if(muvekkil.tip === 'Şirketler' && muvekkil.vergiDairesi) {
                            <div class="flex items-center gap-3 text-slate-600"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path></svg><span>VD: {{ muvekkil.vergiDairesi }}</span></div>
                          }
                          @if(muvekkil.tip === 'Şirketler' && muvekkil.yetkililer && muvekkil.yetkililer.length > 0) {
                            <div class="pt-3 border-t border-slate-100 mt-3">
                              <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Yetkililer</p>
                              @for (y of muvekkil.yetkililer; track y.id) {
                                <div class="text-[11px] font-medium text-slate-600 mb-1 flex flex-col justify-between">
                                  <div class="flex justify-between"><span>• {{ y.adSoyad }} <span class="text-slate-400">({{y.pozisyon || 'N/A'}})</span></span><span>{{y.telefon}}</span></div>
                                  @if(y.eposta) { <div class="text-[9px] text-slate-400 pl-2.5">{{y.eposta}}</div> }
                                </div>
                              }
                            </div>
                          }
                          @if (muvekkil.vekaletnameUrl) {
                            <div class="mt-4 pt-3 border-t border-slate-100">
                              <a [href]="guvenliUrl(muvekkil.vekaletnameUrl)" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-colors w-fit shadow-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                Vekaletnameyi Gör
                              </a>
                            </div>
                          }
                        </div>
                        <div class="bg-indigo-50/50 p-4 border-t border-slate-100">
                          <div class="flex justify-between items-center mb-2"><span class="text-sm font-medium text-slate-600">Alacak Bakiyesi:</span><span class="font-bold text-rose-600">{{ formatPara(hesaplaMuvekkilFinans(muvekkil.id).kalanVekaletBorcu) }}</span></div>
                          <div class="flex justify-between items-center"><span class="text-sm font-medium text-slate-600">Emanet (Masraf) Kasası:</span><span class="font-bold text-emerald-600">{{ formatPara(hesaplaMuvekkilFinans(muvekkil.id).emanetMasrafBakiyesi) }}</span></div>
                        </div>
                      </div>
                    } @empty { <div class="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed"><p class="text-lg font-medium text-slate-600">Kriterlere uygun kayıt bulunmuyor.</p></div> }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto custom-scrollbar">
                      <table class="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                            <th class="p-5">Kişi / Kurum</th><th class="p-5">İletişim Bilgileri</th><th class="p-5">Banka ve IBAN</th><th class="p-5 text-right">Mali Durum</th><th class="p-5 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          @for (muvekkil of filtrelenmisIliskiler; track muvekkil.id) {
                            <tr class="hover:bg-slate-50 transition-colors group">
                              <td class="p-5">
                                <div class="font-bold text-sm text-slate-800">{{ muvekkil.adSoyad }}</div>
                                <div class="text-xs font-medium text-slate-500 mt-0.5">TC/VKN: {{ muvekkil.tcKimlik || '-' }} @if(muvekkil.tip==='Şirketler' && muvekkil.vergiDairesi) { | VD: {{muvekkil.vergiDairesi}} }</div>
                              </td>
                              <td class="p-5">
                                <div class="text-sm text-slate-700">{{ muvekkil.telefon || '-' }}</div>
                                <div class="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate" title="{{muvekkil.adres}}">{{ muvekkil.adres || 'Adres yok' }}</div>
                              </td>
                              <td class="p-5 text-sm text-slate-600">
                                @if (muvekkil.tip === 'Şirketler' && muvekkil.yetkililer && muvekkil.yetkililer.length > 0) {
                                  <div class="text-[10px] font-bold text-indigo-500 uppercase mb-0.5">Yetkililer</div>
                                  @for (y of muvekkil.yetkililer; track y.id) {
                                    <div class="text-[10px] text-slate-500 truncate" title="{{y.adSoyad}} - {{y.telefon}}{{y.eposta ? ' - ' + y.eposta : ''}}">{{y.adSoyad}} ({{y.pozisyon}})</div>
                                  }
                                } @else {
                                  <div class="truncate max-w-[150px]" title="{{ muvekkil.bankaBilgileri }}">{{ muvekkil.bankaBilgileri || 'Banka bilgisi yok' }}</div>
                                }
                              </td>
                              <td class="p-5 text-right">
                                <div class="text-sm font-bold text-rose-600 mb-1" title="Alacak Bakiyesi">{{ formatPara(hesaplaMuvekkilFinans(muvekkil.id).kalanVekaletBorcu) }}</div>
                                <div class="text-xs font-bold text-emerald-600" title="Emanet / Masraf Kasası">{{ formatPara(hesaplaMuvekkilFinans(muvekkil.id).emanetMasrafBakiyesi) }}</div>
                              </td>
                              <td class="p-5 text-right">
                                <div class="flex items-center justify-end gap-1">
                                  @if (muvekkil.vekaletnameUrl) {
                                    <a [href]="guvenliUrl(muvekkil.vekaletnameUrl)" target="_blank" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Vekaletnameyi Aç">
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                    </a>
                                  }
                                  @if (silinecekMuvekkilId === muvekkil.id) {
                                    <span class="text-xs font-medium text-red-500 mr-2">Silinsin mi?</span><button (click)="muvekkilSil(muvekkil.id)" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded transition-colors">Evet</button><button (click)="silmeIptal()" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded transition-colors">İptal</button>
                                  } @else {
                                    <button (click)="muvekkilFormunuAc(muvekkil)" class="text-amber-500 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="Düzenle"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                                    <button (click)="silmeOnayiIste(muvekkil.id, 'muvekkil')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Sil"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                  }
                                </div>
                              </td>
                            </tr>
                          } @empty { <tr><td colspan="5" class="p-10 text-center text-slate-400 font-medium">Kriterlere uygun kayıt bulunamadı.</td></tr> }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              }
            }

            <!-- ORTAK DOSYA DETAY SAYFASI (DAVA, İCRA, ARABULUCULUK) -->
            @if (aktifSayfa === 'detay' || aktifSayfa === 'icraDetay' || aktifSayfa === 'arabuluculukDetay') {
              @if (aktifDosya) {
                <div class="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-10">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div class="flex items-center gap-3">
                      <button (click)="sayfaDegistir(aktifSayfa === 'detay' ? 'davalar' : (aktifSayfa === 'icraDetay' ? 'icralar' : 'arabuluculuk'))" class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">Geri Dön</button>
                      <h3 class="text-lg font-bold tracking-tight text-slate-800 sm:text-2xl">{{ aktifSayfa === 'detay' ? 'Dava Dosyası Detayı' : (aktifSayfa === 'icraDetay' ? 'İcra Dosyası Detayı' : 'Arabuluculuk Dosyası Detayı') }}</h3>
                    </div>
                    <div class="relative w-full sm:ml-auto sm:w-auto sm:min-w-[180px]">
                      <select [ngModel]="aktifDosya.durum" (ngModelChange)="aktifDosyaDurumGuncelle($event)" [class]="aktifSayfa === 'detay' ? getDurumClass(aktifDosya.durum) : (aktifSayfa === 'icraDetay' ? getIcraDurumClass(aktifDosya.durum) : getArabuluculukDurumClass(aktifDosya.durum))" class="w-full appearance-none rounded-full border px-3 py-2 pr-8 text-xs font-bold shadow-sm transition-all outline-none sm:text-sm">
                        @if (aktifSayfa === 'detay') {
                          <option value="Derdest" class="text-slate-700 bg-white">Derdest</option><option value="İstinaf/Temyiz" class="text-slate-700 bg-white">İstinaf/Temyiz</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                        } @else if (aktifSayfa === 'icraDetay') {
                          <option value="Aktif" class="text-slate-700 bg-white">Aktif</option><option value="İtiraz Edildi" class="text-slate-700 bg-white">İtiraz Edildi</option><option value="Tehir-i İcra" class="text-slate-700 bg-white">Tehir-i İcra</option><option value="İnfaz/Kapalı" class="text-slate-700 bg-white">İnfaz/Kapalı</option>
                        } @else {
                          <option value="Hazırlık" class="text-slate-700 bg-white">Hazırlık</option><option value="Müzakere" class="text-slate-700 bg-white">Müzakere</option><option value="İmza" class="text-slate-700 bg-white">İmza</option><option value="Tahsilat" class="text-slate-700 bg-white">Tahsilat</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                        }
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 opacity-60"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div>
                    </div>
                  </div>

                  <div [class]="getAktifDosyaKapakKartiClass()" class="relative overflow-hidden rounded-[1.5rem] border p-4 shadow-sm sm:rounded-[1.75rem] sm:p-6">
                    <div class="absolute -right-10 -top-12 hidden h-40 w-40 rounded-full bg-white/35 blur-2xl sm:block"></div>
                    <div class="absolute -bottom-10 left-0 hidden h-28 w-28 rounded-full bg-white/25 blur-2xl sm:block"></div>
                    <div class="relative grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
                      <div class="xl:col-span-8">
                        <div class="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                          <span [class]="getAktifDosyaTemaRozetClass()" class="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] sm:px-3 sm:text-[11px]">{{ getAktifDosyaTurEtiketi() }}</span>
                          <span [class]="getAktifDosyaDurumSinifi()" class="rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-[11px]">{{ aktifDosya.durum }}</span>
                        </div>
                        <h3 class="text-xl font-black tracking-tight text-slate-900 sm:text-3xl">{{ getAktifDosyaReferansMetni() }}</h3>
                        <p class="mt-2 text-xs font-medium leading-6 text-slate-700 sm:mt-3 sm:text-sm">{{ getAktifDosyaTarafOzeti() }}</p>

                        <div class="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3">
                          <div class="rounded-2xl border border-white/70 bg-white/85 px-3 py-3 shadow-sm sm:px-4">
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ getAktifDosyaBirincilEtiket() }}</p>
                            <p class="mt-1 text-sm font-bold text-slate-800">{{ getAktifDosyaBirincilDeger() }}</p>
                          </div>
                          <div class="rounded-2xl border border-white/70 bg-white/85 px-3 py-3 shadow-sm sm:px-4">
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ getAktifDosyaIkincilEtiket() }}</p>
                            <p class="mt-1 text-sm font-bold text-slate-800">{{ getAktifDosyaIkincilDeger() }}</p>
                          </div>
                          <div class="rounded-2xl border border-white/70 bg-white/85 px-3 py-3 shadow-sm sm:px-4">
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arşiv Yeri</p>
                            <p class="mt-1 text-sm font-bold text-slate-800">{{ aktifDosya.arsivYeri || 'Belirtilmedi' }}</p>
                          </div>
                        </div>

                        @if (getAktifDosyaBaglantiOzeti()) {
                          <div class="mt-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm sm:px-4 sm:text-xs">
                            <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                            {{ getAktifDosyaBaglantiOzeti() }}
                          </div>
                        }
                      </div>

                      <div class="grid grid-cols-2 gap-3 xl:col-span-4">
                        <div class="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ getAktifDosyaKritikTarihEtiketi() }}</p>
                          <p class="mt-2 text-sm font-black text-slate-900 sm:text-base">{{ getAktifDosyaKritikTarihMetni() }}</p>
                          <p class="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{{ getAktifDosyaKritikTarihDurumu() }}</p>
                        </div>
                        <div class="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kalan Ücret</p>
                          <p class="mt-2 text-sm font-black text-slate-900 sm:text-base">{{ formatPara(getDosyaFinans(aktifDosya).kalanVekalet) }}</p>
                          <p class="mt-2 text-[10px] font-bold text-emerald-600">Tahsil edilen: {{ formatPara(getDosyaFinans(aktifDosya).toplamTahsilat) }}</p>
                        </div>
                        <div class="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Toplam Evrak</p>
                          <p class="mt-2 text-lg font-black text-slate-900 sm:text-2xl">{{ getAktifDosyaToplamEvrakSayisi() }}</p>
                          <p class="mt-2 text-[10px] font-bold text-slate-500">Ana evrak ve alt ekler dahil</p>
                        </div>
                        <div class="rounded-2xl border border-white/70 bg-white/90 px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Süreli İş</p>
                          <p class="mt-2 text-lg font-black text-slate-900 sm:text-2xl">{{ aktifDosyaSureliIsleri.length }}</p>
                          <p class="mt-2 text-[10px] font-bold text-rose-600">{{ aktifDosyaSureliIsleri.length > 0 ? 'Takip gerektiriyor' : 'Şu an temiz' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
                    <div class="space-y-4 sm:space-y-6 lg:col-span-7">
                      <div [class]="getAktifDosyaBilgiKartiClass()" class="grid grid-cols-1 gap-3 rounded-xl p-4 shadow-sm sm:grid-cols-2 sm:gap-4 sm:p-6">
                         <div class="col-span-2 border-b border-slate-100 pb-2 mb-2"><h4 class="font-bold text-slate-800 flex items-center gap-2">Genel Dosya Bilgileri</h4></div>
                         @if (aktifSayfa === 'detay') {
                           <div class="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2">
                              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Dosya Numaraları</p>
                              <div class="flex flex-wrap gap-2">
                                @if (aktifDosya.dosyaNumaralari && aktifDosya.dosyaNumaralari.length > 0) {
                                  @for (num of aktifDosya.dosyaNumaralari; track $index) {
                                     <div class="px-3 py-1.5 bg-white border border-slate-200 rounded flex items-center gap-2 shadow-sm"><span class="text-[10px] font-black text-slate-400 uppercase">{{num.tur}}</span><span class="text-sm font-bold text-slate-800">{{num.no}}</span></div>
                                  }
                                } @else { <div class="px-3 py-1.5 bg-white border border-slate-200 rounded flex items-center gap-2 shadow-sm"><span class="text-sm font-bold text-slate-800">{{aktifDosya.dosyaNo}}</span></div> }
                              </div>
                           </div>
                           <div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Müvekkil</p><p class="font-medium text-slate-800">{{ aktifDosya.muvekkil }} @if(aktifDosya.muvekkilPozisyonu) { <span [class]="getPozisyonClass(aktifDosya.muvekkilPozisyonu)" class="text-[10px] px-1.5 py-0.5 rounded ml-1 uppercase font-bold">{{aktifDosya.muvekkilPozisyonu}}</span> }</p></div>
                           <div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Karşı Taraf</p><p class="font-medium text-slate-800">{{ aktifDosya.karsiTaraf || '-' }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mahkeme</p><p class="font-medium text-slate-800">{{ aktifDosya.mahkeme }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Konu</p><p class="font-medium text-slate-800">{{ aktifDosya.konu }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Arşiv / Klasör Konumu</p><p class="font-medium text-slate-800">{{ aktifDosya.arsivYeri || 'Belirtilmedi' }}</p></div>
                           <div class="col-span-2 mt-2 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                             <div>
                               <p class="text-[10px] font-bold uppercase tracking-wider text-blue-700">Duruşma Takvimi</p>
                               <p class="mt-1 font-bold text-slate-800">{{ getAktifDavaDurusmaMetni() }}</p>
                               <p class="mt-1 text-xs font-medium" [class]="aktifDavaDurusmaTamamlandiMi() ? 'text-emerald-600' : 'text-slate-500'">
                                 {{ aktifDavaDurusmaTamamlandiMi() ? 'Duruşma gerçekleşti olarak işaretlendi.' : 'Ajandada aktif duruşma kaydı olarak izleniyor.' }}
                               </p>
                             </div>
                             @if (getAktifDavaDosyasi()?.durusmaTarihi) {
                               @if (aktifDavaDurusmaTamamlandiMi()) {
                                 <button (click)="aktifDavaDurusmaAjandayaGeriAl()" class="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 transition-colors hover:bg-blue-100 sm:w-auto">Ajandaya Geri Al</button>
                               } @else {
                                 <button (click)="aktifDavaDurusmaTamamla()" class="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-800 sm:w-auto">Duruşma Yapıldı</button>
                               }
                             }
                           </div>
                           @if (aktifDosya.baglantiliIcraId) {
                             <div class="col-span-2 mt-2 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-0.5">Bağlantılı İcra Dosyası</p><p class="font-bold text-slate-800">{{ getIcraNo(aktifDosya.baglantiliIcraId) }}</p></div><button (click)="icrayaGitId(aktifDosya.baglantiliIcraId)" class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto sm:py-1.5">İcraya Git</button></div>
                           }
                         } @else if (aktifSayfa === 'icraDetay') {
                           <div class="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2 flex flex-col sm:flex-row gap-4">
                              <div class="flex-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">İcra Dairesi</p><p class="font-bold text-slate-800">{{ aktifDosya.icraDairesi }}</p></div>
                              <div class="flex-1 sm:border-l sm:border-slate-200 sm:pl-4"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Dosya No</p><p class="font-bold text-slate-800">{{ aktifDosya.dosyaNo }}</p></div>
                              <div class="flex-1 sm:border-l sm:border-slate-200 sm:pl-4"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Takip Tipi</p><p class="font-bold text-slate-800">{{ aktifDosya.takipTipi || 'Belirtilmedi' }}</p></div>
                           </div>
                           <div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Alacaklı</p><p class="font-medium text-slate-800">{{ aktifDosya.alacakli }}</p></div>
                           <div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Borçlu</p><p class="font-medium text-slate-800">{{ aktifDosya.borclu }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Muhatap</p><p class="font-medium text-slate-800">{{ aktifDosya.muvekkil }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Takip Tarihi</p><p class="font-medium text-slate-800">{{ formatTarih(aktifDosya.takipTarihi) }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Arşiv / Klasör Konumu</p><p class="font-medium text-slate-800">{{ aktifDosya.arsivYeri || 'Belirtilmedi' }}</p></div>
                           @if (aktifDosya.baglantiliDavaId) {
                             <div class="col-span-2 mt-2 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs text-blue-700 font-bold uppercase tracking-wider mb-0.5">Bağlantılı Dava Dosyası</p><p class="font-bold text-slate-800">{{ getDavaNo(aktifDosya.baglantiliDavaId) }}</p></div><button (click)="davayaGitId(aktifDosya.baglantiliDavaId)" class="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto sm:py-1.5">Davaya Git</button></div>
                           }
                         } @else if (aktifSayfa === 'arabuluculukDetay') {
                           <div class="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2 flex flex-col sm:flex-row gap-4">
                              <div class="flex-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Büro No</p><p class="font-bold text-slate-800">{{ aktifDosya.buroNo || '-' }}</p></div>
                              <div class="flex-1 sm:border-l sm:border-slate-200 sm:pl-4"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Arabuluculuk No</p><p class="font-bold text-slate-800">{{ aktifDosya.arabuluculukNo }}</p></div>
                              <div class="flex-1 sm:border-l sm:border-slate-200 sm:pl-4"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Büro</p><p class="font-bold text-slate-800">{{ aktifDosya.buro }}</p></div>
                           </div>
                           <div class="col-span-2">
                             <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Taraflar</p>
                             <div class="flex flex-wrap gap-2">
                               @for (t of aktifDosya.taraflar; track t.id) {
                                 <div class="px-2 py-1 bg-white border border-slate-200 rounded flex items-center gap-1.5 shadow-sm">
                                   <span [class]="t.tip === 'Başvurucu' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'" class="text-[9px] font-bold px-1 rounded uppercase">{{t.tip}}</span>
                                   <span class="text-sm font-medium text-slate-700">{{t.isim}}</span>
                                 </div>
                               }
                             </div>
                           </div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Başvuru Türü</p><p class="font-medium text-slate-800">{{ aktifDosya.basvuruTuru }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Uyuşmazlık Türü</p><p class="font-medium text-slate-800">{{ aktifDosya.uyusmazlikTuru }}</p></div>
                           <div class="col-span-2 sm:col-span-1"><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Arşiv / Klasör Konumu</p><p class="font-medium text-slate-800">{{ aktifDosya.arsivYeri || 'Belirtilmedi' }}</p></div>
                           <div class="col-span-2 mt-2 flex flex-col gap-3 rounded-lg border border-purple-100 bg-purple-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                             <div>
                               <p class="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-0.5">Toplantı Bilgisi</p>
                               <p class="font-bold text-slate-800">{{ getAktifArabuluculukToplantiMetni() }} @if(getAktifArabuluculukDosyasi()?.toplantiYontemi) { - <span class="uppercase text-xs">{{getAktifArabuluculukDosyasi()?.toplantiYontemi}}</span> }</p>
                               <p class="mt-1 text-xs font-medium" [class]="aktifArabuluculukToplantiTamamlandiMi() ? 'text-emerald-600' : 'text-slate-500'">
                                 {{ aktifArabuluculukToplantiTamamlandiMi() ? 'Toplantı gerçekleşti olarak işaretlendi.' : 'Ajandada aktif toplantı kaydı olarak izleniyor.' }}
                               </p>
                             </div>
                             <div class="flex flex-col gap-2 sm:items-end">
                               @if(getAktifArabuluculukDosyasi()?.toplantiTarihi) { <div class="px-3 py-1 bg-white border border-purple-200 text-purple-700 font-bold text-xs rounded shadow-sm">{{ aktifArabuluculukToplantiTamamlandiMi() ? 'Gerçekleşti' : hesaplaKalanGun(getAktifArabuluculukDosyasi()?.toplantiTarihi) }}</div> }
                               @if (getAktifArabuluculukDosyasi()?.toplantiTarihi) {
                                 @if (aktifArabuluculukToplantiTamamlandiMi()) {
                                   <button (click)="aktifArabuluculukToplantiyiAjandayaGeriAl()" class="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-purple-700 shadow-sm ring-1 ring-purple-200 transition-colors hover:bg-purple-100 sm:w-auto">Ajandaya Geri Al</button>
                                 } @else {
                                   <button (click)="aktifArabuluculukToplantiyiTamamla()" class="w-full rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-purple-800 sm:w-auto">Toplantı Yapıldı</button>
                                 }
                               }
                             </div>
                           </div>
                         }
                      </div>

                      <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[320px]">
                        <div class="flex overflow-x-auto border-b border-slate-200 bg-slate-50 custom-scrollbar">
                           <button (click)="aktifDetaySekmesi = 'notlar'" [class]="getDetayTabClass('notlar')" class="flex min-w-[110px] flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors sm:min-w-0 sm:text-sm">Notlar</button>
                           <button (click)="aktifDetaySekmesi = 'evraklar'" [class]="getDetayTabClass('evraklar')" class="flex min-w-[150px] flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors sm:min-w-0 sm:text-sm">Evrak Bağlantıları</button>
                           <button (click)="aktifDetaySekmesi = 'sureliIsler'" [class]="getDetayTabClass('sureliIsler')" class="relative flex min-w-[120px] flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors sm:min-w-0 sm:text-sm">
                             Süreli İşler
                             @if(aktifDosyaSureliIsleri.length > 0) { <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> }
                           </button>
                        </div>

                        <div class="flex h-full flex-1 flex-col bg-slate-50/50 p-3 sm:p-5">
                          @if (aktifDetaySekmesi === 'notlar') {
                            <textarea [(ngModel)]="aktifDosya.notlar" (blur)="aktifDosyaKaydet(aktifDosya)" placeholder="Dosya notlarınızı buraya yazabilirsiniz... (Otomatik kaydedilir)" class="h-48 w-full resize-none rounded-lg border border-slate-200 bg-amber-50/30 p-3 text-sm leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 sm:h-64 sm:p-4"></textarea>
                          }
                          @if (aktifDetaySekmesi === 'evraklar') {
                            <div class="flex flex-col h-full">
                               <div class="relative mb-4 flex flex-col gap-3 overflow-hidden rounded-xl border border-blue-100 bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
                                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                  <p class="text-[10px] font-black uppercase text-blue-600 tracking-wider">Yeni Ana Evrak Ekle</p>
                                  <div class="flex w-full flex-col gap-2 sm:flex-row">
                                    <input [(ngModel)]="yeniEvrak.isim" type="text" placeholder="Evrak Adı (Örn: Dilekçe / Talep)" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-1/3">
                                    <input [(ngModel)]="yeniEvrak.url" type="text" placeholder="Bağlantı URL (Google Drive, UYAP vs)" class="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                  </div>
                                  <div class="grid w-full gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto] xl:items-end">
                                    <div><label class="mb-1 block text-[10px] font-bold text-slate-500">Tebliğ Tarihi (Opsiyonel)</label><input [(ngModel)]="yeniEvrak.tebligTarihi" type="date" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none"></div>
                                    <div><label class="mb-1 block text-[10px] font-bold text-red-600">Son Eylem Günü (Opsiyonel)</label><input [(ngModel)]="yeniEvrak.sonEylemTarihi" type="date" class="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-sm outline-none"></div>
                                    <div><label class="mb-1 block text-[10px] font-bold text-slate-500">Evrak Yazı Rengi</label><div class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5"><input [(ngModel)]="yeniEvrak.yaziRengi" type="color" class="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"><span class="text-xs font-bold" [style.color]="getEvrakYaziRengi(yeniEvrak.yaziRengi)">Önizleme</span><button type="button" (click)="yeniEvrak.yaziRengi = varsayilanEvrakYaziRengi" class="ml-auto text-[10px] font-bold text-slate-500 hover:text-slate-700">Varsayılan</button></div></div>
                                    <button (click)="evrakEkle()" class="h-[42px] w-full rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 xl:w-auto">Listeye Ekle</button>
                                  </div>
                               </div>
                               
                               <div class="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                                  @for (evrak of aktifDosya.evraklar; track evrak.id; let i = $index) {
                                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:border-blue-300">
                                      <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" [class.bg-blue-50]="duzenlenenEvrakId === evrak.id">
                                        @if (duzenlenenEvrakId === evrak.id && !duzenlenenEvrakParentId) {
                                           <div class="flex flex-col w-full gap-2">
                                              <div class="flex flex-col gap-2 sm:flex-row">
                                                <input [(ngModel)]="duzenlenenEvrak.isim" class="w-full rounded border border-blue-400 px-2 py-1.5 text-sm outline-none sm:w-1/3">
                                                <input [(ngModel)]="duzenlenenEvrak.url" class="flex-1 px-2 py-1.5 text-sm border border-blue-400 rounded outline-none">
                                              </div>
                                              <div class="grid gap-2 rounded bg-white/50 p-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_170px_auto] xl:items-end">
                                                <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tebliğ:</label><input [(ngModel)]="duzenlenenEvrak.tebligTarihi" type="date" class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
                                                <div class="flex-1"><label class="block text-[10px] font-bold text-red-500 mb-0.5">Son Eylem:</label><input [(ngModel)]="duzenlenenEvrak.sonEylemTarihi" type="date" class="w-full px-2 py-1 text-sm border border-red-300 rounded"></div>
                                                <div class="w-[170px]"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Yazı Rengi:</label><div class="flex items-center gap-2 rounded border border-slate-300 bg-white px-2 py-1"><input [(ngModel)]="duzenlenenEvrak.yaziRengi" type="color" class="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"><span class="text-[10px] font-bold" [style.color]="getEvrakYaziRengi(duzenlenenEvrak.yaziRengi)">Önizleme</span><button type="button" (click)="duzenlenenEvrak.yaziRengi = varsayilanEvrakYaziRengi" class="ml-auto text-[9px] font-bold text-slate-500 hover:text-slate-700">Vars.</button></div></div>
                                                <div class="flex flex-col gap-1 sm:flex-row"><button (click)="evrakGuncelleKaydet()" class="rounded bg-green-500 px-4 py-2 text-xs font-bold text-white shadow-sm">Kaydet</button><button (click)="evrakDuzenleIptal()" class="rounded bg-slate-300 px-4 py-2 text-xs font-bold text-slate-700">İptal</button></div>
                                              </div>
                                           </div>
                                        } @else {
                                           <div class="flex min-w-0 items-start gap-3">
                                             <div class="w-7 h-7 flex items-center justify-center">
                                               @if (evrak.ekler && evrak.ekler.length > 0) {
                                                 <button (click)="klasorGecis(evrak.id)" class="w-full h-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"><svg class="w-4 h-4 transition-transform" [class.rotate-180]="acikKlasorler[evrak.id]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg></button>
                                               }
                                             </div>
                                             <div class="flex flex-col bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                               <button (click)="evrakYukari(i)" [disabled]="i === 0" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 leading-none py-0.5">▲</button>
                                               <button (click)="evrakAsagi(i)" [disabled]="i === aktifDosya.evraklar!.length - 1" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 leading-none py-0.5 border-t border-slate-200">▼</button>
                                             </div>
                                             <div class="min-w-0 flex flex-col">
                                               <div class="flex items-center gap-2">
                                                 <span class="w-2.5 h-2.5 rounded-full border border-slate-200 shadow-sm" [style.backgroundColor]="getEvrakYaziRengi(evrak.yaziRengi)"></span>
                                                 <p class="font-bold text-sm" [style.color]="getEvrakYaziRengi(evrak.yaziRengi)">{{ evrak.isim }}</p>
                                               </div>
                                               <div class="mt-1 flex flex-wrap gap-2">
                                                 @if(evrak.tebligTarihi) { <span class="text-[10px] text-slate-500 font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Tebliğ: {{ formatTarihKisa(evrak.tebligTarihi) }}</span> }
                                                 @if(evrak.sonEylemTarihi) { <span class="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Son: {{ formatTarihKisa(evrak.sonEylemTarihi) }} ({{ hesaplaKalanGun(evrak.sonEylemTarihi) }})</span> }
                                               </div>
                                             </div>
                                           </div>
                                           <div class="flex flex-wrap items-center gap-2 shrink-0">
                                             <button (click)="ekEvrakFormAc(evrak.id)" class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded transition-colors flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Alt Ek</button>
                                             <button (click)="evrakDuzenleBaslat(evrak)" class="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded transition-colors">Düzenle</button>
                                             <a [href]="guvenliUrl(evrak.url)" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded transition-colors">Aç</a>
                                             <button (click)="evrakSil(evrak.id)" class="text-slate-300 hover:text-red-500 p-1.5 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                           </div>
                                        }
                                      </div>

                                      @if (evrak.ekler && evrak.ekler.length > 0 && acikKlasorler[evrak.id]) {
                                        <div class="relative space-y-2 border-t border-slate-100 bg-slate-50 px-3 py-2 sm:pl-[3.25rem]">
                                          <div class="absolute left-[1.3rem] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                          @for (ek of evrak.ekler; track ek.id; let j = $index) {
                                            <div class="relative flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between" [class.bg-blue-50]="duzenlenenEvrakId === ek.id">
                                              <div class="absolute -left-5 top-1/2 w-4 h-0.5 bg-slate-200"></div>
                                              @if (duzenlenenEvrakId === ek.id && duzenlenenEvrakParentId === evrak.id) {
                                                 <div class="flex flex-col w-full gap-2">
                                                   <div class="flex flex-col gap-2 sm:flex-row">
                                                     <input [(ngModel)]="duzenlenenEvrak.isim" class="w-full rounded border border-blue-400 px-2 py-1 text-sm outline-none sm:w-1/3">
                                                     <input [(ngModel)]="duzenlenenEvrak.url" class="flex-1 px-2 py-1 text-sm border border-blue-400 rounded outline-none">
                                                     <div class="flex items-center gap-2 rounded border border-slate-300 bg-white px-2 py-1"><input [(ngModel)]="duzenlenenEvrak.yaziRengi" type="color" class="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"><span class="text-[10px] font-bold" [style.color]="getEvrakYaziRengi(duzenlenenEvrak.yaziRengi)">Önizleme</span></div>
                                                     <button (click)="evrakGuncelleKaydet()" class="px-3 py-1 bg-green-500 text-white rounded text-[10px] font-bold">Kaydet</button>
                                                     <button (click)="evrakDuzenleIptal()" class="px-3 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold">İptal</button>
                                                   </div>
                                                 </div>
                                              } @else {
                                                 <div class="flex min-w-0 items-center gap-3">
                                                   <div class="flex flex-col bg-slate-50 rounded border border-slate-200 overflow-hidden">
                                                     <button (click)="ekEvrakYukari(evrak, j)" [disabled]="j === 0" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-[10px] leading-none py-0.5">▲</button>
                                                     <button (click)="ekEvrakAsagi(evrak, j)" [disabled]="j === evrak.ekler.length - 1" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-[10px] leading-none py-0.5 border-t border-slate-200">▼</button>
                                                   </div>
                                                   <div class="flex min-w-0 items-center gap-2">
                                                     <span class="w-2 h-2 rounded-full border border-slate-200 shadow-sm" [style.backgroundColor]="getEvrakYaziRengi(ek.yaziRengi)"></span>
                                                     <p class="font-bold text-xs" [style.color]="getEvrakYaziRengi(ek.yaziRengi)">{{ ek.isim }}</p>
                                                   </div>
                                                 </div>
                                                 <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                                                   <button (click)="evrakDuzenleBaslat(ek, evrak.id)" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold">Düzenle</button>
                                                   <a [href]="guvenliUrl(ek.url)" target="_blank" class="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-[10px] font-bold rounded">Aç</a>
                                                   <button (click)="ekEvrakSil(evrak.id, ek.id)" class="text-slate-300 hover:text-red-500 p-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                                 </div>
                                              }
                                            </div>
                                          }
                                        </div>
                                      }
                                      @if (ekEklenenEvrakId === evrak.id) {
                                        <div class="relative flex flex-col gap-2 border-t border-indigo-100 bg-indigo-50/50 px-3 py-3 sm:pl-[3.25rem]">
                                          <div class="absolute left-[1.3rem] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                          <p class="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Alt Ek Oluşturuluyor</p>
                                          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input [(ngModel)]="yeniEkEvrak.isim" type="text" placeholder="Ek Şablon Adı" class="w-full rounded border border-indigo-200 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 sm:w-1/3">
                                            <input [(ngModel)]="yeniEkEvrak.url" (keyup.enter)="ekEvrakKaydet(evrak.id)" type="text" placeholder="Bağlantı URL" class="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-500">
                                            <div class="flex items-center gap-2 rounded border border-indigo-200 bg-white px-2 py-1"><input [(ngModel)]="yeniEkEvrak.yaziRengi" type="color" class="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"><span class="text-[10px] font-bold" [style.color]="getEvrakYaziRengi(yeniEkEvrak.yaziRengi)">Önizleme</span></div>
                                            <button (click)="ekEvrakKaydet(evrak.id)" class="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">Kaydet</button>
                                            <button (click)="ekEvrakFormKapat()" class="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200">İptal</button>
                                          </div>
                                        </div>
                                      }
                                    </div>
                                  } @empty { <div class="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium">Bu dosyaya ait bağlantı eklenmemiş.</div> }
                               </div>
                            </div>
                          }

                          @if (aktifDetaySekmesi === 'sureliIsler') {
                            <div class="space-y-3 overflow-y-auto pr-1">
                               @for (is of aktifDosyaSureliIsleri; track $index) {
                                  <div class="group flex flex-col gap-3 rounded-xl border border-red-100 bg-white p-4 shadow-sm transition-colors hover:border-red-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                                     <div>
                                       <p class="text-base font-black text-slate-800 sm:text-lg">{{ is.isim }}</p>
                                       @if(is.anaEvrakIsim) { <p class="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1">Ek Dosya: {{ is.anaEvrakIsim }}</p> }
                                       <p class="text-xs text-slate-500 mt-2 font-medium">Tebliğ Tarihi: {{ is.tebligTarihi ? formatTarih(is.tebligTarihi) : 'Belirtilmedi' }}</p>
                                       <button (click)="sureliIsiTamamlandiIsaretle(aktifDosya, aktifSayfa === 'detay' ? 'dava' : (aktifSayfa === 'icraDetay' ? 'icra' : 'arabuluculuk'), is.id)" class="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800">Tamamlandı Olarak İşaretle</button>
                                     </div>
                                     <div class="w-full rounded-lg border border-red-100 bg-red-50 p-3 sm:min-w-[160px] sm:w-auto sm:text-right">
                                       <p class="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1">Son Eylem Günü</p>
                                       <p class="text-lg font-black leading-none text-red-600 sm:text-xl">{{ formatTarihKisa(is.sonEylemTarihi) }}</p>
                                       <p class="text-xs font-bold bg-white text-red-700 px-2 py-1 rounded shadow-sm mt-2 inline-block">{{ hesaplaKalanGun(is.sonEylemTarihi) }}</p>
                                     </div>
                                  </div>
                               } @empty {
                                 <div class="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
                                   <div class="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>
                                   <p class="text-lg font-bold text-slate-600">Harika! Bu dosyada süreli işiniz bulunmuyor.</p>
                                 </div>
                               }
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- FİNANS SÜTUNU -->
                    <div class="space-y-4 sm:space-y-6 lg:col-span-5">
                       <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div class="bg-slate-800 p-3 text-white sm:p-4"><h4 class="text-sm font-bold sm:text-base">Dosya Finans ve Masraf Takibi</h4></div>
                         <div class="space-y-4 p-3 sm:space-y-5 sm:p-5">
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              @if (aktifSayfa === 'arabuluculukDetay') {
                                <div class="bg-purple-50 border border-purple-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-purple-800 uppercase mb-1">Kalan Net Hizmet Ücreti</p><p class="text-lg font-bold text-purple-700">{{ formatPara(getDosyaFinans(aktifDosya).kalanVekalet) }}</p></div>
                                <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-emerald-800 uppercase mb-1">Net Tahsil Edilen</p><p class="text-lg font-bold text-emerald-700">{{ formatPara(getDosyaFinans(aktifDosya).toplamTahsilat) }}</p></div>
                              } @else {
                                <div class="bg-rose-50 border border-rose-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-rose-800 uppercase mb-1">Kalan Vekalet / Hizmet Ücreti</p><p class="text-lg font-bold text-rose-700">{{ formatPara(getDosyaFinans(aktifDosya).kalanVekalet) }}</p></div>
                                <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-emerald-800 uppercase mb-1">Emanet Masraf Kasası</p><p class="text-lg font-bold text-emerald-700">{{ formatPara(getDosyaFinans(aktifDosya).emanetBakiye) }}</p></div>
                              }
                            </div>

                            <div class="bg-slate-50 border border-slate-200 p-3 rounded-lg sm:p-4">
                               <p class="text-xs font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Yeni Finansal İşlem Ekle</p>
                               <div class="space-y-3">
                                 <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                   <div>
                                     <label class="block text-[10px] font-bold text-slate-500 mb-0.5">İşlem Türü</label>
                                     <select [(ngModel)]="yeniIslem.tur" class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none bg-white">
                                       @if (aktifSayfa === 'arabuluculukDetay') {
                                         <option value="Ödeme Talep Tarihi">Ödeme Talep Tarihi</option><option value="Ödeme">Ödeme</option>
                                       } @else {
                                         <option value="Vekalet Ücreti">Vekalet / Hizmet Tahsilatı</option><option value="Masraf Avansı (Giriş)">Masraf Avansı</option><option value="Masraf Harcaması (Çıkış)">Masraf Harcaması</option>
                                       }
                                     </select>
                                   </div>
                                   <div><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tarih</label><input [(ngModel)]="yeniIslem.tarih" type="date" class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                 </div>
                                 <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <div class="w-full sm:w-1/3"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">{{ aktifSayfa === 'arabuluculukDetay' ? 'Brüt Tutar (₺)' : 'Tutar (₺)' }}</label><input [(ngModel)]="yeniIslem.tutar" type="number" min="0" placeholder="0.00" class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                    <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Açıklama</label><input [(ngModel)]="yeniIslem.aciklama" (keyup.enter)="finansalIslemEkle()" type="text" placeholder="Örn: Bilirkişi ücreti..." class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                    <button (click)="finansalIslemEkle()" class="w-full rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white sm:w-auto sm:py-1.5">Ekle</button>
                                 </div>
                               </div>
                            </div>

                            <div>
                               <p class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">İşlem Geçmişi</p>
                               <div class="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                  @for (islem of aktifDosya.finansalIslemler; track islem.id) {
                                    <div class="flex flex-col rounded border border-slate-200 bg-white p-2.5 text-sm shadow-sm">
                                      <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <span class="font-bold text-slate-700 text-xs">{{ islem.tur }}</span>
                                        <span [class]="islem.tur === 'Masraf Harcaması (Çıkış)' ? 'text-orange-600' : (islem.tur === 'Ödeme Talep Tarihi' ? 'text-purple-600' : 'text-emerald-600')" class="font-extrabold flex flex-col items-end">
                                          @if (aktifSayfa === 'arabuluculukDetay') {
                                            @if (islem.tur === 'Ödeme Talep Tarihi') {
                                              <span>{{ formatPara(islem.tutar / 1.2) }}</span>
                                              <span class="text-[9px] text-slate-400 font-normal leading-none mt-0.5">Brüt: {{ formatPara(islem.tutar) }}</span>
                                            } @else if (islem.tur === 'Ödeme' || islem.tur === 'Ödeme Tarihi') {
                                              <span>+{{ formatPara(islem.tutar) }}</span>
                                            } @else {
                                              <span>+{{ formatPara(islem.tutar / 1.2) }}</span>
                                              <span class="text-[9px] text-slate-400 font-normal leading-none mt-0.5">Brüt: {{ formatPara(islem.tutar) }}</span>
                                            }
                                          } @else {
                                            <span>{{ islem.tur === 'Masraf Harcaması (Çıkış)' ? '-' : '+' }}{{ formatPara(islem.tutar) }}</span>
                                          }
                                        </span>
                                      </div>
                                      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                        <p class="text-xs text-slate-500">{{ islem.aciklama }}</p>
                                        <div class="flex items-center gap-2"><span class="text-[10px] text-slate-400 font-medium">{{ formatTarihKisa(islem.tarih) }}</span><button (click)="finansalIslemSil(islem.id)" class="text-xs text-slate-300 hover:text-red-500">Sil</button></div>
                                      </div>
                                    </div>
                                  }
                               </div>
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              }
            } <!-- END DETAY GORUNUM -->
            
          </div>
        </main>
      </div>

      @if (bildirimler.length > 0) {
        <div class="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
          @for (bildirim of bildirimler; track bildirim.id) {
            <div [class]="getBildirimClass(bildirim.tur)" class="pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-sm">
              <div class="flex items-start gap-3">
                <div [class]="getBildirimIkonClass(bildirim.tur)" class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  @if (bildirim.tur === 'success') {
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"></path></svg>
                  } @else if (bildirim.tur === 'error') {
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  } @else {
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  }
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-black text-slate-900">{{ bildirim.baslik }}</p>
                  @if (bildirim.mesaj) {
                    <p class="mt-1 text-xs font-medium text-slate-600 leading-relaxed">{{ bildirim.mesaj }}</p>
                  }
                </div>
                <button type="button" (click)="bildirimKapat(bildirim.id)" class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- BUTUN FORMLAR VE MODALLAR (HER ZAMAN VE HER SAYFADA CALISABILMESI ICIN DISARIYA ALINDI) -->
      @if (davaFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-[28px] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up">
            <div class="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 px-6 py-5 text-white">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span class="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-white/90">Dava Dosyası</span>
                  <h3 class="mt-3 text-2xl font-black tracking-tight">{{ formModu === 'ekle' ? 'Yeni dava dosyası oluştur' : 'Dava dosyasını güncelle' }}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-blue-100/90">Mahkeme, taraf ve finans bilgilerini daha okunaklı bir düzenle girin. Kritik alanlar üstte, tamamlayıcı alanlar ise daha ayırt edici kartlarda toplandı.</p>
                </div>
                <button (click)="davaFormKapat()" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20">Kapat</button>
              </div>
            </div>
            <div class="bg-slate-50 p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium shadow-sm">{{ formHata }}</div> }

              <div class="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 shadow-sm">
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-2xl border border-blue-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Zorunlu Alanlar</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">En az bir dosya numarası ve müvekkil seçimi olmadan kayıt tamamlanmaz.</p>
                  </div>
                  <div class="rounded-2xl border border-blue-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Dosya Satırı</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">{{ islemGorenDava.dosyaNumaralari?.length || 0 }} adet numara alanı hazır.</p>
                  </div>
                  <div class="rounded-2xl border border-blue-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Hızlı Not</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Duruşma tarihi ve ücret alanı girildiğinde dosya özeti çok daha güçlü görünür.</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-2 items-start">

              <div class="col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label class="block text-xs font-bold text-slate-600 uppercase mb-3">Dosya Numaraları <span class="text-red-500">*</span></label>
                <div class="space-y-3">
                  @for(num of islemGorenDava.dosyaNumaralari; track $index) {
                    <div class="flex gap-2 items-center">
                      <select [(ngModel)]="num.tur" class="w-1/3 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-bold text-slate-700 shadow-sm"><option value="ESAS">ESAS</option><option value="KARAR">KARAR</option><option value="TALİMAT">TALİMAT</option><option value="DEĞİŞİK İŞ">DEĞİŞİK İŞ</option><option value="SORUŞTURMA">SORUŞTURMA</option><option value="HAZIRLIK">HAZIRLIK</option></select>
                      <input [(ngModel)]="num.no" type="text" placeholder="Örn: 2024/123" class="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg outline-none text-sm shadow-sm">
                      <button (click)="dosyaNumarasiSil($index)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">Sil</button>
                    </div>
                  }
                </div>
                <button (click)="dosyaNumarasiEkle()" class="mt-4 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">Numara Ekle</button>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-700">Taraf ve İlişki Bilgisi</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Müvekkil, pozisyon ve bağlantılı icra kaydını aynı bölümde tutarak dosyayı daha hızlı tarayabilirsiniz.</p>
                <div class="mt-4 flex gap-4">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Müvekkil <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenDava.muvekkilId" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option [ngValue]="undefined" disabled>Müvekkil Seçiniz</option>
                    @for(m of muvekkiller; track m.id) { <option [ngValue]="m.id">{{ m.adSoyad }} {{ m.tip === 'Diğer' ? '(Diğer)' : '' }}</option> }
                  </select>
                  <div class="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-3">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p class="text-[11px] font-semibold text-slate-600">Aradığınız müvekkil listede yoksa buradan hızlıca ekleyebilirsiniz.</p>
                      @if (!hizliMuvekkilFormAcik) {
                        <button (click)="hizliMuvekkilKaydiAc()" class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700">Yeni Müvekkil Ekle</button>
                      }
                    </div>
                    @if (hizliMuvekkilFormAcik) {
                      <div class="grid gap-3 rounded-xl border border-blue-100 bg-white p-3 sm:grid-cols-2">
                        <div>
                          <label class="mb-1 block text-[10px] font-bold uppercase text-slate-500">Kayıt Tipi</label>
                          <select [(ngModel)]="hizliMuvekkilKaydi.tip" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none bg-white">
                            <option value="Müvekkil">Müvekkil</option>
                            <option value="Şirketler">Şirket / Kurum</option>
                            <option value="Borçlular">Borçlu</option>
                            <option value="Diğer">Diğer</option>
                          </select>
                        </div>
                        <div>
                          <label class="mb-1 block text-[10px] font-bold uppercase text-slate-500">Ad Soyad / Unvan</label>
                          <input [(ngModel)]="hizliMuvekkilKaydi.adSoyad" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
                        </div>
                        <div>
                          <label class="mb-1 block text-[10px] font-bold uppercase text-slate-500">TC / VKN</label>
                          <input [(ngModel)]="hizliMuvekkilKaydi.tcKimlik" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
                        </div>
                        <div>
                          <label class="mb-1 block text-[10px] font-bold uppercase text-slate-500">Telefon</label>
                          <input [(ngModel)]="hizliMuvekkilKaydi.telefon" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
                        </div>
                        <div class="sm:col-span-2">
                          <label class="mb-1 block text-[10px] font-bold uppercase text-slate-500">E-Posta</label>
                          <input [(ngModel)]="hizliMuvekkilKaydi.eposta" type="email" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
                        </div>
                        <div class="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                          <button (click)="hizliMuvekkilKaydiIptal()" class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">İptal</button>
                          <button (click)="hizliMuvekkilKaydet()" class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700">Kaydet ve Seç</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                <div class="w-1/3">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Pozisyonu</label>
                  <select [(ngModel)]="islemGorenDava.muvekkilPozisyonu" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm font-medium">
                    <option [ngValue]="undefined">Belirtilmedi</option>
                    <option value="Davacı">Davacı</option><option value="Davalı">Davalı</option><option value="Üçüncü Kişi">Üçüncü Kişi</option>
                  </select>
                </div>
                </div>
                <div class="mt-4">
                  <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Bağlantılı İcra Dosyası (Opsiyonel)</label>
                  <select [(ngModel)]="islemGorenDava.baglantiliIcraId" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none">
                    <option [ngValue]="undefined">Bağlantı Yok</option>
                    @for(i of icralar; track i.id) { <option [ngValue]="i.id">{{ i.icraDairesi }} - {{ i.dosyaNo }} ({{i.borclu}})</option> }
                  </select>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-700">Uyuşmazlık Bilgisi</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Karşı taraf, mahkeme ve arşiv notları ayrı bir blokta görünerek ekranı daha düzenli hale getirir.</p>
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Karşı Taraf</label><input [(ngModel)]="islemGorenDava.karsiTaraf" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="mt-4 flex gap-2">
                <div class="w-3/5"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mahkeme</label><input [(ngModel)]="islemGorenDava.mahkeme" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="w-2/5"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Konu</label><input [(ngModel)]="islemGorenDava.konu" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>
              
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenDava.arsivYeri" type="text" placeholder="Örn: Mavi Klasör, Dolap 2, Raf 1" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Takvim ve Finans</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Durum, duruşma takvimi ve ücret alanını bu blokta toplayarak dosyanın canlı durumunu daha net görürsünüz.</p>
                <div class="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenDava.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Derdest">Derdest</option><option value="İstinaf/Temyiz">İstinaf/Temyiz</option><option value="Kapalı">Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dava Açılış Tarihi</label><input [(ngModel)]="islemGorenDava.takipTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-4">
                  <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Sonraki Duruşma Tarihi</label><input [(ngModel)]="islemGorenDava.durusmaTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                  <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Duruşma Saati</label><input [(ngModel)]="islemGorenDava.durusmaSaati" type="time" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"></div>
                </div>

              @if (islemGorenDava.durum === 'İstinaf/Temyiz') {
                <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg mt-4"><label class="block text-xs font-bold text-orange-800 uppercase mb-1">İstinaf Mahkemesi</label><input [(ngModel)]="islemGorenDava.istinafMahkemesi" type="text" class="w-full px-3 py-2 border border-orange-200 rounded-lg outline-none bg-white"></div>
              }

                <div class="border-t border-slate-100 pt-4 mt-4"><label class="block text-xs font-bold text-blue-600 uppercase mb-1">Anlaşılan Vekalet Ücreti (₺)</label><input [(ngModel)]="islemGorenDava.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg outline-none"></div>
              </div>
              </div>
            </div>
            <div class="px-6 py-4 bg-white border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-slate-500">Kırmızı yıldızlı alanlar kritik kaydı tamamlar. Diğer alanlar dosya özetini güçlendirir.</p>
              <div class="flex justify-end gap-3">
                <button (click)="davaFormKapat()" class="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">İptal</button>
                <button (click)="davaKaydet()" class="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">{{ formModu === 'ekle' ? 'Kaydı Oluştur' : 'Değişiklikleri Kaydet' }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (icraFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-[28px] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up">
            <div class="bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-500 px-6 py-5 text-white">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span class="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-white/90">İcra Takibi</span>
                  <h3 class="mt-3 text-2xl font-black tracking-tight">{{ formModu === 'ekle' ? 'Yeni icra takibi oluştur' : 'İcra takibini güncelle' }}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/90">Takip dosyasının kimliği, taraf bilgileri ve bağlantılı dava kaydı aynı ekranda daha net bölümlendirildi.</p>
                </div>
                <button (click)="icraFormKapat()" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20">Kapat</button>
              </div>
            </div>
            <div class="bg-slate-50 p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium shadow-sm">{{ formHata }}</div> }

              <div class="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 shadow-sm">
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Zorunlu Alanlar</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">İcra dairesi, dosya numarası, müvekkil ve takip tipi olmadan kayıt tamamlanmaz.</p>
                  </div>
                  <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Takip Tipi</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">{{ islemGorenIcra.takipTipi || 'Takip tipi seçimi bekleniyor.' }}</p>
                  </div>
                  <div class="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Hızlı Not</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Bağlantılı dava ve arşiv yeri birlikte girildiğinde icra dosyası çok daha hızlı bulunur.</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-2 items-start">

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Takip Kimliği</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">İcra dairesi, dosya numarası ve müvekkil alanı ilk bakışta okunabilecek şekilde öne çıkarıldı.</p>
                <div class="mt-4 flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">İcra Dairesi <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenIcra.icraDairesi" type="text" placeholder="Örn: İst. 1. İcra" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dosya No <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenIcra.dosyaNo" type="text" placeholder="Örn: 2024/123" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>

                <div class="mt-4">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Müvekkil <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenIcra.muvekkilId" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option [ngValue]="undefined" disabled>Müvekkil Seçiniz</option>
                    @for(m of muvekkiller; track m.id) { <option [ngValue]="m.id">{{ m.adSoyad }} {{ m.tip === 'Diğer' ? '(Diğer)' : '' }}</option> }
                  </select>
                </div>
              </div>
              
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-700">Taraf ve İlişki Bilgisi</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Alacaklı, borçlu ve bağlı dava bilgisi aynı blokta durarak takibi daha kolay okunur hale getirir.</p>
                <div class="mt-4 flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Alacaklı</label><input [(ngModel)]="islemGorenIcra.alacakli" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Borçlu</label><input [(ngModel)]="islemGorenIcra.borclu" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>

                <div class="mt-4">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Takip Tipi <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenIcra.takipTipi" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="İlamsız">İlamsız</option><option value="İlamlı">İlamlı</option><option value="Kambiyo">Kambiyo</option><option value="Rehnin Paraya Çevrilmesi">Rehnin Paraya Çevrilmesi</option><option value="İhtiyati Haciz">İhtiyati Haciz</option>
                  </select>
                </div>

                <div class="mt-4">
                  <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Bağlantılı Dava Dosyası (Opsiyonel)</label>
                  <select [(ngModel)]="islemGorenIcra.baglantiliDavaId" class="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg outline-none">
                    <option [ngValue]="undefined">Bağlantı Yok</option>
                    @for(d of davalar; track d.id) { <option [ngValue]="d.id">{{ d.dosyaNo }} ({{d.karsiTaraf}})</option> }
                  </select>
                </div>
              
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenIcra.arsivYeri" type="text" placeholder="Örn: Kırmızı Klasör, İcra Dolabı" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Durum ve Finans</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Takibin mevcut aşaması, tarihi ve vekalet ücreti tek alanda öne çıkarıldı.</p>
                <div class="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenIcra.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Aktif">Aktif</option><option value="İtiraz Edildi">İtiraz Edildi</option><option value="Tehir-i İcra">Tehir-i İcra</option><option value="İnfaz/Kapalı">İnfaz/Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Takip Tarihi</label><input [(ngModel)]="islemGorenIcra.takipTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>
                <div class="border-t border-slate-100 pt-4 mt-4"><label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Anlaşılan Vekalet Ücreti (₺)</label><input [(ngModel)]="islemGorenIcra.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none"></div>
              </div>
              </div>
            </div>
            <div class="px-6 py-4 bg-white border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-slate-500">Kimlik ve takip tipi alanı eksiksiz tutulduğunda icra kartları çok daha düzenli görünür.</p>
              <div class="flex justify-end gap-3">
                <button (click)="icraFormKapat()" class="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">İptal</button>
                <button (click)="icraKaydet()" class="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">{{ formModu === 'ekle' ? 'Kaydı Oluştur' : 'Değişiklikleri Kaydet' }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (arabuluculukFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-[28px] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up">
            <div class="bg-gradient-to-br from-purple-900 via-purple-700 to-fuchsia-500 px-6 py-5 text-white">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span class="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-white/90">Arabuluculuk</span>
                  <h3 class="mt-3 text-2xl font-black tracking-tight">{{ formModu === 'ekle' ? 'Yeni arabuluculuk dosyası oluştur' : 'Arabuluculuk dosyasını güncelle' }}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-purple-100/90">Başvuru türü, taraflar ve toplantı akışı daha seçilebilir bloklara ayrıldı. Böylece süreç ekranı daha profesyonel okunuyor.</p>
                </div>
                <button (click)="arabuluculukFormKapat()" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20">Kapat</button>
              </div>
            </div>
            <div class="bg-slate-50 p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium shadow-sm">{{ formHata }}</div> }

              <div class="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 via-white to-purple-50 p-4 shadow-sm">
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-2xl border border-purple-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-purple-700">Zorunlu Alanlar</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Arabuluculuk numarası, büro, müvekkil ilişkisi ve uyuşmazlık türü kayıt için kritik alanlardır.</p>
                  </div>
                  <div class="rounded-2xl border border-purple-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-purple-700">Taraf Sayısı</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">{{ islemGorenArabuluculuk.taraflar?.length || 0 }} taraf satırı hazır.</p>
                  </div>
                  <div class="rounded-2xl border border-purple-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-purple-700">Hızlı Not</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Toplantı tarihi ve yöntem bilgisi ajanda görünümünde dosyayı öne çıkarır.</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-2 items-start">

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-purple-700">Dosya Kimliği</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Büro, dosya numarası ve kayıtlı muhatap bilgileri tek blokta görünerek ilk bakışı kolaylaştırır.</p>
                <div class="mt-4 flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Büro No @if(islemGorenArabuluculuk.basvuruTuru === 'Dava Şartı'){<span class="text-red-500">*</span>}</label><input [(ngModel)]="islemGorenArabuluculuk.buroNo" type="text" placeholder="Örn: 2024/123" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arabuluculuk No <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenArabuluculuk.arabuluculukNo" type="text" placeholder="Örn: 2024/456" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                </div>

                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Büro <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenArabuluculuk.buro" type="text" placeholder="Örn: İstanbul Arabuluculuk Bürosu" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              
                <div class="border-t border-slate-100 pt-4 mt-4 relative">
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Hesap Muhatabı (Kayıtlı İlişki) <span class="text-red-500">*</span></label>
                
                <div (click)="arabuluculukMuvekkilDropdownAcik = !arabuluculukMuvekkilDropdownAcik" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none text-sm font-medium cursor-pointer flex justify-between items-center text-slate-800">
                  <span>{{ secilenMuvekkilAd(islemGorenArabuluculuk.muvekkilId) || 'Kişi/Kurum Seçiniz' }}</span>
                  <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                @if(arabuluculukMuvekkilDropdownAcik) {
                  <div class="fixed inset-0 z-[55]" (click)="arabuluculukMuvekkilDropdownAcik = false"></div>
                  <div class="absolute z-[60] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div class="p-2 border-b border-slate-100 bg-slate-50">
                      <input [(ngModel)]="arabuluculukMuvekkilArama" type="text" placeholder="İsim veya TC/VKN Ara..." class="w-full px-3 py-2 text-sm border border-slate-300 rounded outline-none focus:border-emerald-500" (click)="$event.stopPropagation()">
                    </div>
                    <div class="overflow-y-auto custom-scrollbar flex-1 p-1">
                      @for(m of filtrelenmisArabuluculukMuvekkiller; track m.id) {
                        <div (click)="islemGorenArabuluculuk.muvekkilId = m.id; arabuluculukMuvekkilDropdownAcik = false; arabuluculukMuvekkilArama = ''" class="px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer rounded transition-colors font-medium border-b border-slate-50 last:border-0 flex justify-between items-center">
                          <span>{{ m.adSoyad }}</span>
                          <span class="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{{ m.tip }}</span>
                        </div>
                      } @empty {
                        <div class="px-3 py-4 text-center text-xs text-slate-400">Sonuç bulunamadı</div>
                      }
                    </div>
                  </div>
                }
              </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-purple-700">Süreç ve Taraflar</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Başvuru türü, uyuşmazlık başlığı ve taraf listesi daha net bir iş akışında sunulur.</p>
                <div class="mt-4 flex gap-4">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Başvuru Türü <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenArabuluculuk.basvuruTuru" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Dava Şartı">Dava Şartı</option><option value="İhtiyari">İhtiyari</option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Uyuşmazlık Türü <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenArabuluculuk.uyusmazlikTuru" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Kira">Kira</option><option value="İşçi İşveren">İşçi İşveren</option><option value="Ticari">Ticari</option><option value="Boşanma">Boşanma</option><option value="Ortaklığın Giderilmesi">Ortaklığın Giderilmesi</option><option value="Tüketici">Tüketici</option>
                  </select>
                </div>
                </div>

                <div class="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label class="block text-xs font-bold text-slate-600 uppercase mb-3">Taraflar <span class="text-red-500">*</span></label>
                <div class="space-y-3">
                  @for(taraf of islemGorenArabuluculuk.taraflar; track $index) {
                    <div class="flex gap-2 items-center">
                      <select [(ngModel)]="taraf.tip" class="w-1/3 px-3 py-2.5 border border-slate-300 rounded-lg outline-none bg-white text-xs font-bold text-slate-700 shadow-sm"><option value="Başvurucu">Başvurucu</option><option value="Diğer Taraf">Diğer Taraf</option></select>
                      <input [(ngModel)]="taraf.isim" type="text" placeholder="Taraf İsmi/Unvanı" class="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg outline-none text-sm shadow-sm">
                      <button (click)="tarafSil($index)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">Sil</button>
                    </div>
                  }
                </div>
                <button (click)="tarafEkle()" class="mt-4 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 transition-colors">Taraf Ekle</button>
              </div>
              </div>
              
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-purple-700">Toplantı ve Finans</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Toplantı, arşiv ve ücret bilgileri bir arada durarak dosyanın son durumunu daha rahat gösterir.</p>
                <div class="mt-4 grid grid-cols-3 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Toplantı Tarihi</label><input [(ngModel)]="islemGorenArabuluculuk.toplantiTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Toplantı Saati</label><input [(ngModel)]="islemGorenArabuluculuk.toplantiSaati" type="time" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"></div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Toplantı Yöntemi</label>
                  <select [(ngModel)]="islemGorenArabuluculuk.toplantiYontemi" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option [ngValue]="undefined">Belirtilmedi</option><option value="Yüzyüze">Yüzyüze</option><option value="Videokonferans">Videokonferans</option><option value="Telekonferans">Telekonferans</option>
                  </select>
                </div>
                </div>

                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenArabuluculuk.arsivYeri" type="text" placeholder="Örn: Mor Klasör, Çekmece 3" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>

                <div class="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenArabuluculuk.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Hazırlık">Hazırlık</option><option value="Müzakere">Müzakere</option><option value="İmza">İmza</option><option value="Tahsilat">Tahsilat</option><option value="Kapalı">Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-purple-600 uppercase mb-1">Brüt Hizmet Ücreti (₺)</label><input [(ngModel)]="islemGorenArabuluculuk.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg outline-none"></div>
                </div>
              </div>
              </div>

            </div>
            <div class="px-6 py-4 bg-white border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-slate-500">Taraf, toplantı ve ücret alanları birlikte girildiğinde arabuluculuk kaydı daha profesyonel görünür.</p>
              <div class="flex justify-end gap-3">
                <button (click)="arabuluculukFormKapat()" class="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">İptal</button>
                <button (click)="arabuluculukKaydet()" class="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all">{{ formModu === 'ekle' ? 'Kaydı Oluştur' : 'Değişiklikleri Kaydet' }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (muvekkilFormAcik) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
          <div class="mx-auto flex min-h-full w-full items-start sm:items-center sm:justify-center">
          <div class="bg-white rounded-[28px] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[92vh]">
            <div class="bg-gradient-to-br from-indigo-900 via-indigo-700 to-sky-500 px-6 py-5 text-white">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span class="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-white/90">Kişi / Kurum</span>
                  <h3 class="mt-3 text-2xl font-black tracking-tight">{{ formModu === 'ekle' ? 'Yeni kişi veya kurum kaydı oluştur' : 'Kayıt bilgilerini güncelle' }}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/90">İletişim, finans ve vekalet bilgilerini daha kurumsal kartlara ayırdım. Böylece müvekkil ekranı ilk bakışta daha düzenli duruyor.</p>
                </div>
                <button (click)="muvekkilFormKapat()" class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20">Kapat</button>
              </div>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 space-y-5 custom-scrollbar sm:p-6">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium shadow-sm">{{ formHata }}</div> }

              <div class="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 p-4 shadow-sm">
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-2xl border border-indigo-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">Zorunlu Alanlar</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Kayıt tipi ile ad soyad / unvan alanı olmadan kart tamamlanmaz.</p>
                  </div>
                  <div class="rounded-2xl border border-indigo-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">Kayıt Tipi</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">{{ islemGorenMuvekkil.tip || 'Tip seçimi bekleniyor.' }}</p>
                  </div>
                  <div class="rounded-2xl border border-indigo-100 bg-white/80 p-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700">Hızlı Not</p>
                    <p class="mt-2 text-sm font-semibold leading-6 text-slate-700">Telefon, e-posta ve vekalet bağlantısı birlikte girildiğinde dosya açılışı çok hızlanır.</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Kayıt Tipi Seçin <span class="text-red-500">*</span></label>
                <div class="flex flex-wrap gap-3 sm:gap-6">
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                    <input type="radio" [(ngModel)]="islemGorenMuvekkil.tip" value="Müvekkil" name="kayittipi" class="w-4 h-4 text-indigo-600"> Müvekkil
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                    <input type="radio" [(ngModel)]="islemGorenMuvekkil.tip" value="Şirketler" name="kayittipi" class="w-4 h-4 text-indigo-600"> Şirket / Kurum
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                    <input type="radio" [(ngModel)]="islemGorenMuvekkil.tip" value="Borçlular" name="kayittipi" class="w-4 h-4 text-indigo-600"> Borçlu
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                    <input type="radio" [(ngModel)]="islemGorenMuvekkil.tip" value="Diğer" name="kayittipi" class="w-4 h-4 text-indigo-600"> Diğer (Şahıs, Yetkili vb.)
                  </label>
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-2 items-start">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">Kimlik ve İletişim</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Temel kişi veya kurum bilgileri tek blokta durarak müvekkil kartını daha düzenli hale getirir.</p>
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 mb-1">Ad Soyad / Unvan <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenMuvekkil.adSoyad" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="mt-4 grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">TC Kimlik / VKN</label><input [(ngModel)]="islemGorenMuvekkil.tcKimlik" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Telefon</label><input [(ngModel)]="islemGorenMuvekkil.telefon" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 mb-1">Adres</label><textarea [(ngModel)]="islemGorenMuvekkil.adres" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></textarea></div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.22em] text-slate-700">Finans ve Belgeler</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Banka, e-posta ve vekalet bağlantısını bir arada tutarak dosya hazırlığını hızlandırın.</p>
                <div class="mt-4 grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">E-Posta</label><input [(ngModel)]="islemGorenMuvekkil.eposta" type="email" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Banka ve IBAN Bilgisi</label><input [(ngModel)]="islemGorenMuvekkil.bankaBilgileri" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
                <div class="mt-4"><label class="block text-xs font-bold text-slate-500 mb-1">Vekaletname Bağlantısı (URL)</label><input [(ngModel)]="islemGorenMuvekkil.vekaletnameUrl" type="text" placeholder="Örn: Google Drive linki, UYAP bağlantısı..." class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-blue-600 bg-slate-50 focus:bg-white transition-colors"></div>
              </div>

              @if (islemGorenMuvekkil.tip === 'Şirketler') {
                <div class="col-span-2 bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                  <label class="block text-xs font-bold text-indigo-700 uppercase mb-3">Şirket / Kurum Yetkilileri</label>
                  <div class="mb-4"><label class="block text-xs font-bold text-slate-500 mb-1">Vergi Dairesi</label><input [(ngModel)]="islemGorenMuvekkil.vergiDairesi" type="text" class="w-full px-3 py-2 border border-indigo-200 rounded-lg outline-none bg-white"></div>
                  <div class="space-y-3">
                    @for(y of islemGorenMuvekkil.yetkililer; track $index) {
                      <div class="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <input [(ngModel)]="y.adSoyad" type="text" placeholder="Ad Soyad" class="w-full sm:w-1/4 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs bg-white">
                        <input [(ngModel)]="y.telefon" type="text" placeholder="Telefon" class="w-full sm:w-1/5 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs bg-white">
                        <input [(ngModel)]="y.eposta" type="email" placeholder="E-Posta" class="w-full sm:w-1/4 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs bg-white">
                        <input [(ngModel)]="y.pozisyon" type="text" placeholder="Pozisyon" class="w-full sm:flex-1 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs bg-white">
                        <button (click)="yetkiliSil($index)" class="p-1.5 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded-lg">Sil</button>
                      </div>
                    }
                  </div>
                  <div class="mt-3 flex gap-2 relative">
                    <button (click)="yetkiliEkle()" class="px-3 py-1.5 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-lg hover:bg-indigo-300 transition-colors">Manuel Ekle</button>
                    <div>
                      <button (click)="yetkiliSecimDropdownAcik = !yetkiliSecimDropdownAcik" class="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-sm">
                        Kayıtlı Kişilerden Seç <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                      @if(yetkiliSecimDropdownAcik) {
                        <div class="fixed inset-0 z-[65]" (click)="yetkiliSecimDropdownAcik = false"></div>
                        <div class="absolute z-[70] mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                          <div class="p-2 border-b border-slate-100 bg-slate-50">
                            <input [(ngModel)]="yetkiliSecimArama" type="text" placeholder="İsim ara..." class="w-full px-2 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-indigo-500" (click)="$event.stopPropagation()">
                          </div>
                          <div class="overflow-y-auto custom-scrollbar flex-1 p-1">
                            @for(m of filtrelenmisYetkiliAdaylari; track m.id) {
                              <div (click)="kayitliYetkiliEkle(m)" class="px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer rounded transition-colors font-medium border-b border-slate-50 last:border-0 truncate">
                                {{ m.adSoyad }}
                              </div>
                            } @empty {
                              <div class="px-2 py-3 text-center text-[10px] text-slate-400">Sonuç bulunamadı</div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
              </div>
            </div>
            <div class="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs font-semibold text-slate-500">İletişim ve belge alanları dolu olduğunda dosya açarken müvekkil seçimi çok daha akıcı olur.</p>
              <div class="grid grid-cols-1 gap-3 sm:flex sm:justify-end">
                <button (click)="muvekkilFormKapat()" class="w-full rounded-xl px-4 py-2.5 text-center font-semibold text-slate-600 transition-colors hover:bg-slate-100 sm:w-auto">İptal</button><button (click)="muvekkilKaydet()" class="w-full rounded-xl bg-indigo-600 px-6 py-3 text-center font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 sm:w-auto sm:py-2.5">{{ formModu === 'ekle' ? 'Kaydı Oluştur' : 'Değişiklikleri Kaydet' }}</button>
              </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
  `]
})
export class App implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  
  app: any; auth: any; db: any; user: User | null = null;
  authInitialized = false; yukleniyor = false; islemYapiyor = false; sistemHatasi = '';
  
  emailGiris = ''; sifreGiris = ''; authModu: 'giris' | 'kayit' = 'giris'; authHata = ''; authYukleniyor = false;
  bildirimler: UygulamaBildirimi[] = [];
  bildirimSayaci = 0;

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
  silinecekDavaId: number | null = null; silinecekIcraId: number | null = null; silinecekArabuluculukId: number | null = null; silinecekMuvekkilId: number | null = null;
  aktifDetaySekmesi: DetaySekmesi = 'notlar'; formHata = '';

  varsayilanEvrakYaziRengi = '#0f172a';
  yeniEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi }; ekEklenenEvrakId: number | null = null;
  yeniEkEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi }; duzenlenenEvrakId: number | null = null;
  duzenlenenEvrakParentId: number | null = null; duzenlenenEvrak: Partial<EvrakBaglantisi> = { yaziRengi: this.varsayilanEvrakYaziRengi };
  duzenlenenEvrakOrijinalSonEylemTarihi = '';
  acikKlasorler: Record<number, boolean> = {}; 

  ngOnInit() { this.initFirebase(); }

  async initFirebase() {
    try {
      this.sistemHatasi = '';
      const config = getFirebaseConfig();
      this.app = initializeApp(config); this.auth = getAuth(this.app); this.db = getFirestore(this.app);
      onAuthStateChanged(this.auth, (user: User | null) => {
        this.user = user; this.authInitialized = true;
        if (user) { this.verileriDinle(); }
        else { this.davalar = []; this.icralar = []; this.arabuluculukDosyalar = []; this.muvekkiller = []; }
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
      this.cdr.detectChanges();
    });
    onSnapshot(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ayarlar', 'sablonlar'), (ds: any) => {
      if (ds.exists()) { this.sablonlar = ds.data(); } else { this.sablonlar = { avukatlik: [], arabuluculuk: [] }; }
      this.cdr.detectChanges();
    });
  }

  async davaKaydetCloud(d: DavaDosyasi, basariMesaji?: string) {
    if (!this.user) return;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', d.id.toString()), JSON.parse(JSON.stringify(d)));
      if (basariMesaji) this.bildirimGoster('success', 'Dava dosyası kaydedildi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Dava dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
    } finally { this.islemYapiyor = false; }
  }
  async davaSilCloud(id: number, basariMesaji?: string) {
    if (!this.user) return;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Dava dosyası silindi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Dava dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
    }
  }
  async icraKaydetCloud(i: IcraDosyasi, basariMesaji?: string) {
    if (!this.user) return;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', i.id.toString()), JSON.parse(JSON.stringify(i)));
      if (basariMesaji) this.bildirimGoster('success', 'İcra dosyası kaydedildi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'İcra dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
    } finally { this.islemYapiyor = false; }
  }
  async icraSilCloud(id: number, basariMesaji?: string) {
    if (!this.user) return;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'İcra dosyası silindi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'İcra dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
    }
  }
  async arabuluculukKaydetCloud(a: ArabuluculukDosyasi, basariMesaji?: string) {
    if (!this.user) return;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', a.id.toString()), JSON.parse(JSON.stringify(a)));
      if (basariMesaji) this.bildirimGoster('success', 'Arabuluculuk dosyası kaydedildi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
    } finally { this.islemYapiyor = false; }
  }
  async arabuluculukSilCloud(id: number, basariMesaji?: string) {
    if (!this.user) return;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Arabuluculuk dosyası silindi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Arabuluculuk dosyası silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
    }
  }
  async muvekkilKaydetCloud(m: Muvekkil, basariMesaji?: string) {
    if (!this.user) return;
    this.islemYapiyor = true;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', m.id.toString()), JSON.parse(JSON.stringify(m)));
      if (basariMesaji) this.bildirimGoster('success', 'Kişi kaydı kaydedildi', basariMesaji);
    } catch (e: any) {
      console.error(e);
      this.bildirimGoster('error', 'Kişi kaydı kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
    } finally { this.islemYapiyor = false; }
  }
  async muvekkilSilCloud(id: number, basariMesaji?: string) {
    if (!this.user) return;
    try {
      await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', id.toString()));
      if (basariMesaji) this.bildirimGoster('success', 'Kişi kaydı silindi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Kişi kaydı silinemedi', e?.message || 'Silme işlemi tamamlanamadı.');
    }
  }
  async sablonlariKaydetCloud(basariMesaji?: string) {
    if (!this.user) return;
    try {
      await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ayarlar', 'sablonlar'), JSON.parse(JSON.stringify(this.sablonlar)));
      if (basariMesaji) this.bildirimGoster('success', 'Şablonlar kaydedildi', basariMesaji);
    } catch (e: any) {
      this.bildirimGoster('error', 'Şablonlar kaydedilemedi', e?.message || 'Bağlantıyı kontrol edip tekrar deneyin.');
    }
  }

  sayfaDegistir(s: SayfaTipi) { this.aktifSayfa = s; if (s !== 'detay') this.seciliDava = null; if (s !== 'icraDetay') this.seciliIcra = null; if (s !== 'arabuluculukDetay') this.seciliArabuluculuk = null; this.aramaMetni = ''; }

  detayaGit(d: DavaDosyasi) { this.seciliDava = d; this.aktifSayfa = 'detay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Vekalet Ücreti', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  icraDetayinaGit(i: IcraDosyasi) { this.seciliIcra = i; this.aktifSayfa = 'icraDetay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Vekalet Ücreti', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  arabuluculukDetayinaGit(a: ArabuluculukDosyasi) { this.seciliArabuluculuk = a; this.aktifSayfa = 'arabuluculukDetay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Ödeme', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }

  davayaGitId(id?: number) { if(!id) return; const d = this.davalar.find(x=>x.id===id); if(d) this.detayaGit(d); }
  icrayaGitId(id?: number) { if(!id) return; const i = this.icralar.find(x=>x.id===id); if(i) this.icraDetayinaGit(i); }
  getDavaNo(id?: number) { if(!id) return ''; return this.davalar.find(d=>d.id===id)?.dosyaNo || 'Bulunamadı'; }
  getIcraNo(id?: number) { if(!id) return ''; return this.icralar.find(i=>i.id===id)?.dosyaNo || 'Bulunamadı'; }

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

  get filtrelenmisDavalar() { return this.davalar.filter(d => { const s = this.aramaMetni.toLowerCase(); const mS = d.dosyaNo.toLowerCase().includes(s) || d.muvekkil.toLowerCase().includes(s) || d.mahkeme.toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || d.durum === this.durumFiltresi; return mS && mD; }); }
  get filtrelenmisIcralar() { return this.icralar.filter(i => { const s = this.aramaMetni.toLowerCase(); const mS = i.dosyaNo.toLowerCase().includes(s) || i.icraDairesi.toLowerCase().includes(s) || i.alacakli.toLowerCase().includes(s) || i.borclu.toLowerCase().includes(s); const mD = this.durumFiltresi === 'Tümü' || i.durum === this.durumFiltresi; return mS && mD; }); }
  get filtrelenmisArabuluculuk() { return this.arabuluculukDosyalar.filter(a => { const s = this.aramaMetni.toLowerCase(); const mS = a.buroNo.toLowerCase().includes(s) || a.arabuluculukNo.toLowerCase().includes(s) || (a.taraflar && a.taraflar.some((t:any)=>t.isim.toLowerCase().includes(s))); const mD = this.durumFiltresi === 'Tümü' || a.durum === this.durumFiltresi; return mS && mD; }); }

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
      if (dava.durum === 'KapalÄ±' || !dava.durusmaTarihi || dava.durusmaTamamlandiMi) return;
      kayitlar.push({
        id: `dava-durusma-${dava.id}`,
        tarih: this.birlestirTarihVeSaat(dava.durusmaTarihi, dava.durusmaSaati),
        saat: dava.durusmaSaati,
        tur: 'durusma',
        kaynak: 'dava',
        dosya: dava,
        baslik: dava.mahkeme || 'Dava Durusmasi',
        altBaslik: dava.konu || this.getAjandaDosyaOzeti('dava', dava),
        taraflar: `${dava.muvekkil || 'Bilinmiyor'} - ${dava.karsiTaraf || 'Diger Taraf'}`
      });
    });

    this.arabuluculukDosyalar.forEach(arabuluculuk => {
      if (arabuluculuk.durum === 'KapalÄ±' || !arabuluculuk.toplantiTarihi || arabuluculuk.toplantiTamamlandiMi) return;
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
        taraflar: `${dava.muvekkil || 'Bilinmiyor'} - ${dava.karsiTaraf || 'Diger Taraf'}`
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

    return {
      bugun,
      gecmis,
      yediGun,
      tahsilat: this.muhasebeListesi.length,
      tahsilatTutari: this.muhasebeOzet.toplam
    };
  }

  get oncelikliAjandaKayitlari() {
    return [...this.ajandaKayitlari]
      .filter(kayit => {
        const fark = this.ajandaGunFarki(kayit.tarih);
        return fark < 0 || fark <= 7;
      })
      .sort((a, b) => {
        const farkA = this.ajandaGunFarki(a.tarih);
        const farkB = this.ajandaGunFarki(b.tarih);
        const oncelikA = farkA < 0 ? 0 : (farkA === 0 ? 1 : 2);
        const oncelikB = farkB < 0 ? 0 : (farkB === 0 ? 1 : 2);
        if (oncelikA !== oncelikB) return oncelikA - oncelikB;
        return this.ajandaTarihDamgasi(a.tarih) - this.ajandaTarihDamgasi(b.tarih);
      })
      .slice(0, 6);
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

  dosyaFormunuAc(d?: DavaDosyasi) {
    this.formHata = '';
    this.hizliMuvekkilFormAcik = false;
    this.hizliMuvekkilKaydi = { tip: 'Müvekkil' };
    if (d) { 
      this.formModu = 'duzenle'; 
      this.islemGorenDava = { ...d, dosyaNumaralari: Array.isArray(d.dosyaNumaralari) ? d.dosyaNumaralari.map(n => ({...n})) : [] }; 
      if (!this.islemGorenDava.dosyaNumaralari || this.islemGorenDava.dosyaNumaralari.length === 0) {
         this.islemGorenDava.dosyaNumaralari = [{ tur: 'ESAS', no: this.islemGorenDava.dosyaNo || '' }, { tur: 'KARAR', no: '' }]; 
      }
    } 
    else { this.formModu = 'ekle'; this.islemGorenDava = { durum: 'Derdest', muvekkilId: undefined, muvekkilPozisyonu: undefined, durusmaSaati: '', durusmaTamamlandiMi: false, dosyaNumaralari: [{ tur: 'ESAS', no: '' }, { tur: 'KARAR', no: '' }] }; }
    this.davaFormAcik = true;
  }
  dosyaNumarasiEkle() { if (!this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari = []; this.islemGorenDava.dosyaNumaralari.push({ tur: 'ESAS', no: '' }); }
  dosyaNumarasiSil(i: number) { if (this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari.splice(i, 1); }
  davaFormKapat() { this.davaFormAcik = false; this.hizliMuvekkilFormAcik = false; this.hizliMuvekkilKaydi = { tip: 'Müvekkil' }; }
  davaKaydet() {
    const num = (this.islemGorenDava.dosyaNumaralari || []).filter(n => n.no && n.no.trim() !== '');
    if (num.length === 0 || !this.islemGorenDava.muvekkilId) { this.formHata = "Dosya numarası ve muhatap zorunludur."; return; }
    if (this.islemGorenDava.durum !== 'İstinaf/Temyiz') this.islemGorenDava.istinafMahkemesi = '';
    
    this.islemGorenDava.karsiTaraf = this.formatMetin(this.islemGorenDava.karsiTaraf);
    this.islemGorenDava.mahkeme = this.formatMetin(this.islemGorenDava.mahkeme);
    this.islemGorenDava.konu = this.formatMetin(this.islemGorenDava.konu);
    this.islemGorenDava.istinafMahkemesi = this.formatMetin(this.islemGorenDava.istinafMahkemesi);
    this.islemGorenDava.arsivYeri = this.formatMetin(this.islemGorenDava.arsivYeri);

    const m = this.muvekkiller.find(x => x.id == this.islemGorenDava.muvekkilId);
    const noStr = num.map(n => `${n.tur}: ${n.no}`).join(' | ');
    if (this.formModu === 'ekle') {
      const y: DavaDosyasi = { id: Date.now(), dosyaNo: noStr, dosyaNumaralari: num, muvekkilId: m?.id || Number(this.islemGorenDava.muvekkilId), muvekkil: m?.adSoyad || this.islemGorenDava.muvekkil || 'Bilinmiyor', muvekkilPozisyonu: this.islemGorenDava.muvekkilPozisyonu, karsiTaraf: this.islemGorenDava.karsiTaraf || '-', mahkeme: this.islemGorenDava.mahkeme || '-', konu: this.islemGorenDava.konu || '-', durum: this.islemGorenDava.durum as any, istinafMahkemesi: this.islemGorenDava.istinafMahkemesi || '', durusmaTarihi: this.islemGorenDava.durusmaTarihi || '', durusmaSaati: this.islemGorenDava.durusmaSaati || '', durusmaTamamlandiMi: false, durusmaTamamlanmaTarihi: '', takipTarihi: this.islemGorenDava.takipTarihi || '', vekaletUcreti: this.islemGorenDava.vekaletUcreti || 0, baglantiliIcraId: this.islemGorenDava.baglantiliIcraId, arsivYeri: this.islemGorenDava.arsivYeri || '', notlar: '', finansalIslemler: [], evraklar: [] };
      this.davaKaydetCloud(y, 'Yeni dava dosyası buluta eklendi.');
    } else {
      const mevcut = this.davalar.find(x => x.id === this.islemGorenDava.id);
      const durusmaDegisti = (mevcut?.durusmaTarihi || '') !== (this.islemGorenDava.durusmaTarihi || '') || (mevcut?.durusmaSaati || '') !== (this.islemGorenDava.durusmaSaati || '');
      const g = { ...this.islemGorenDava, dosyaNo: noStr, dosyaNumaralari: num, muvekkil: m?.adSoyad || this.islemGorenDava.muvekkil || 'Bilinmiyor' } as DavaDosyasi;
      if (durusmaDegisti) { g.durusmaTamamlandiMi = false; g.durusmaTamamlanmaTarihi = ''; }
      this.davaKaydetCloud(g, 'Dava dosyasındaki bilgiler güncellendi.');
    }
    this.davaFormKapat();
  }
  durumGuncelle(d: DavaDosyasi, yD: string) { const k = {...d}; k.durum = yD as any; if (k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = ''; this.davaKaydetCloud(k, 'Dava durum etiketi güncellendi.'); }
  dosyaSil(id: number) { this.davaSilCloud(id, 'Dava dosyası kayıttan kaldırıldı.'); this.silinecekDavaId = null; }

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
    this.islemGorenIcra.alacakli = this.formatMetin(this.islemGorenIcra.alacakli);
    this.islemGorenIcra.borclu = this.formatMetin(this.islemGorenIcra.borclu);
    this.islemGorenIcra.arsivYeri = this.formatMetin(this.islemGorenIcra.arsivYeri);

    const m = this.muvekkiller.find(x => x.id == this.islemGorenIcra.muvekkilId);
    if (this.formModu === 'ekle') {
      const y: IcraDosyasi = { id: Date.now(), icraDairesi: this.islemGorenIcra.icraDairesi || '', dosyaNo: this.islemGorenIcra.dosyaNo || '', muvekkilId: m?.id, muvekkil: m?.adSoyad || 'Bilinmiyor', alacakli: this.islemGorenIcra.alacakli || '-', borclu: this.islemGorenIcra.borclu || '-', takipTipi: this.islemGorenIcra.takipTipi || '', takipTarihi: this.islemGorenIcra.takipTarihi || '', durum: this.islemGorenIcra.durum as any, baglantiliDavaId: this.islemGorenIcra.baglantiliDavaId, arsivYeri: this.islemGorenIcra.arsivYeri || '', vekaletUcreti: this.islemGorenIcra.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [] };
      this.icraKaydetCloud(y, 'Yeni icra dosyası buluta eklendi.');
    } else { const g = { ...this.islemGorenIcra, muvekkil: m?.adSoyad || this.islemGorenIcra.muvekkil } as IcraDosyasi; this.icraKaydetCloud(g, 'İcra dosyasındaki bilgiler güncellendi.'); }
    this.icraFormKapat();
  }
  icraDurumGuncelle(i: IcraDosyasi, yD: string) { const k = {...i}; k.durum = yD as any; this.icraKaydetCloud(k, 'İcra dosyasının durumu güncellendi.'); }
  icraSil(id: number) { this.icraSilCloud(id, 'İcra dosyası kayıttan kaldırıldı.'); this.silinecekIcraId = null; }

  arabuluculukFormAc(a?: ArabuluculukDosyasi) {
    this.formHata = '';
    if (a) { 
      this.formModu = 'duzenle'; 
      this.islemGorenArabuluculuk = { ...a, taraflar: Array.isArray(a.taraflar) ? a.taraflar.map(t => ({...t})) : [] }; 
    }
    else { this.formModu = 'ekle'; this.islemGorenArabuluculuk = { durum: 'Hazırlık', basvuruTuru: 'Dava Şartı', uyusmazlikTuru: 'İşçi İşveren', buro: 'İstanbul Anadolu', toplantiSaati: '', toplantiTamamlandiMi: false, taraflar: [{ id: Date.now(), tip: 'Başvurucu', isim: '' }, { id: Date.now() + 1, tip: 'Diğer Taraf', isim: '' }] }; }
    this.arabuluculukFormAcik = true;
  }
  arabuluculukFormKapat() { this.arabuluculukFormAcik = false; }
  tarafEkle() { if (!this.islemGorenArabuluculuk.taraflar) this.islemGorenArabuluculuk.taraflar = []; this.islemGorenArabuluculuk.taraflar.push({ id: Date.now(), tip: 'Diğer Taraf', isim: '' }); }
  tarafSil(i: number) { if (this.islemGorenArabuluculuk.taraflar) this.islemGorenArabuluculuk.taraflar.splice(i, 1); }
  arabuluculukKaydet() {
    const t = (this.islemGorenArabuluculuk.taraflar || []).filter(x => x.isim && x.isim.trim() !== '');
    const isDavaSarti = this.islemGorenArabuluculuk.basvuruTuru === 'Dava Şartı';
    if ((isDavaSarti && !this.islemGorenArabuluculuk.buroNo) || !this.islemGorenArabuluculuk.arabuluculukNo || !this.islemGorenArabuluculuk.buro || t.length === 0 || !this.islemGorenArabuluculuk.muvekkilId) { this.formHata = "Tüm zorunlu alanları, taraf ismini ve Hesap Muhatabını doldurun."; return; }
    
    this.islemGorenArabuluculuk.buro = this.formatMetin(this.islemGorenArabuluculuk.buro);
    this.islemGorenArabuluculuk.arsivYeri = this.formatMetin(this.islemGorenArabuluculuk.arsivYeri);
    t.forEach(taraf => taraf.isim = this.formatMetin(taraf.isim));

    if (this.formModu === 'ekle') {
      const y: ArabuluculukDosyasi = { id: Date.now(), buroNo: this.islemGorenArabuluculuk.buroNo || '', arabuluculukNo: this.islemGorenArabuluculuk.arabuluculukNo || '', buro: this.islemGorenArabuluculuk.buro || '', basvuruTuru: this.islemGorenArabuluculuk.basvuruTuru as any, uyusmazlikTuru: this.islemGorenArabuluculuk.uyusmazlikTuru as any, taraflar: t, muvekkilId: this.islemGorenArabuluculuk.muvekkilId, toplantiTarihi: this.islemGorenArabuluculuk.toplantiTarihi, toplantiSaati: this.islemGorenArabuluculuk.toplantiSaati || '', toplantiTamamlandiMi: false, toplantiTamamlanmaTarihi: '', toplantiYontemi: this.islemGorenArabuluculuk.toplantiYontemi, durum: this.islemGorenArabuluculuk.durum as any, arsivYeri: this.islemGorenArabuluculuk.arsivYeri || '', vekaletUcreti: this.islemGorenArabuluculuk.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [] };
      this.arabuluculukKaydetCloud(y, 'Yeni arabuluculuk dosyası buluta eklendi.');
    } else {
      const mevcut = this.arabuluculukDosyalar.find(x => x.id === this.islemGorenArabuluculuk.id);
      const toplantiDegisti = (mevcut?.toplantiTarihi || '') !== (this.islemGorenArabuluculuk.toplantiTarihi || '') || (mevcut?.toplantiSaati || '') !== (this.islemGorenArabuluculuk.toplantiSaati || '');
      const g = { ...this.islemGorenArabuluculuk, buroNo: this.islemGorenArabuluculuk.buroNo || '', taraflar: t } as ArabuluculukDosyasi;
      if (toplantiDegisti) { g.toplantiTamamlandiMi = false; g.toplantiTamamlanmaTarihi = ''; }
      this.arabuluculukKaydetCloud(g, 'Arabuluculuk dosyasındaki bilgiler güncellendi.');
    }
    this.arabuluculukFormKapat();
  }
  arabuluculukDurumGuncelle(a: ArabuluculukDosyasi, yD: string) { const k = {...a}; k.durum = yD as any; this.arabuluculukKaydetCloud(k, 'Arabuluculuk durumu güncellendi.'); }
  arabuluculukSil(id: number) { this.arabuluculukSilCloud(id, 'Arabuluculuk dosyası kayıttan kaldırıldı.'); this.silinecekArabuluculukId = null; }

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
    this.islemGorenDava.muvekkilId = yeni.id;
    this.islemGorenDava.muvekkil = adSoyad;
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
      this.davalar.forEach(d => { if(d.muvekkilId === g.id && d.muvekkil !== g.adSoyad) { d.muvekkil = g.adSoyad!; this.davaKaydetCloud(d); }});
      this.icralar.forEach(i => { if(i.muvekkilId === g.id && i.muvekkil !== g.adSoyad) { i.muvekkil = g.adSoyad!; this.icraKaydetCloud(i); }});
    }
    this.muvekkilFormKapat();
  }
  muvekkilSil(id: number) {
    if (this.davalar.some(d => d.muvekkilId === id) || this.icralar.some(i => i.muvekkilId === id) || this.arabuluculukDosyalar.some(a => a.muvekkilId === id)) { this.bildirimGoster('error', 'Kayıt silinemedi', 'Bu kişi veya kuruma bağlı aktif dosyalar bulunduğu için önce dosyaları temizlemeniz gerekiyor.'); return; }
    this.muvekkilSilCloud(id, 'Kişi veya kurum kaydı silindi.'); this.silinecekMuvekkilId = null;
  }

  aktifDosyaKaydet(dosya: any, basariMesaji?: string) { if (this.aktifSayfa === 'icraDetay') this.icraKaydetCloud(dosya, basariMesaji); else if (this.aktifSayfa === 'arabuluculukDetay') this.arabuluculukKaydetCloud(dosya, basariMesaji); else this.davaKaydetCloud(dosya, basariMesaji); }
  aktifDosyaDurumGuncelle(yD: string) { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.durum = yD; if (this.aktifSayfa === 'detay' && k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = ''; this.aktifDosyaKaydet(k, 'Dosya durumu kaydedildi.'); }
  durusmaTamamlandiIsaretle(dava: DavaDosyasi, event?: Event) {
    event?.stopPropagation();
    const k = { ...dava, durusmaTamamlandiMi: true, durusmaTamamlanmaTarihi: new Date().toISOString() };
    this.davaKaydetCloud(k, 'Duruşma gerçekleşti olarak işaretlendi ve ajandadan kaldırıldı.');
  }
  durusmaAjandayaGeriAl(dava: DavaDosyasi, event?: Event) {
    event?.stopPropagation();
    const k = { ...dava, durusmaTamamlandiMi: false, durusmaTamamlanmaTarihi: '' };
    this.davaKaydetCloud(k, 'Duruşma yeniden ajandaya alındı.');
  }
  toplantiTamamlandiIsaretle(arabuluculuk: ArabuluculukDosyasi, event?: Event) {
    event?.stopPropagation();
    const k = { ...arabuluculuk, toplantiTamamlandiMi: true, toplantiTamamlanmaTarihi: new Date().toISOString() };
    this.arabuluculukKaydetCloud(k, 'Toplantı gerçekleşti olarak işaretlendi ve ajandadan kaldırıldı.');
  }
  toplantiAjandayaGeriAl(arabuluculuk: ArabuluculukDosyasi, event?: Event) {
    event?.stopPropagation();
    const k = { ...arabuluculuk, toplantiTamamlandiMi: false, toplantiTamamlanmaTarihi: '' };
    this.arabuluculukKaydetCloud(k, 'Toplantı yeniden ajandaya alındı.');
  }
  evrakKaydiniGuncelle(evraklar: EvrakBaglantisi[] | undefined, evrakId: number, updater: (evrak: EvrakBaglantisi) => void): boolean {
    if (!evraklar) return false;
    for (const evrak of evraklar) {
      if (evrak.id === evrakId) { updater(evrak); return true; }
      if (this.evrakKaydiniGuncelle(evrak.ekler, evrakId, updater)) return true;
    }
    return false;
  }
  sureliIsiTamamlandiIsaretle(dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi | null | undefined, kaynak: AjandaKaynak, evrakId: number, event?: Event) {
    event?.stopPropagation();
    if (!dosya) return;
    const k: any = JSON.parse(JSON.stringify(dosya));
    const bulundu = this.evrakKaydiniGuncelle(k.evraklar, evrakId, (evrak) => {
      evrak.tamamlandiMi = true;
      evrak.tamamlanmaTarihi = new Date().toISOString();
    });
    if (!bulundu) return;
    if (kaynak === 'dava') this.davaKaydetCloud(k, 'Süreli iş tamamlandı olarak işaretlendi.');
    else if (kaynak === 'icra') this.icraKaydetCloud(k, 'Süreli iş tamamlandı olarak işaretlendi.');
    else this.arabuluculukKaydetCloud(k, 'Süreli iş tamamlandı olarak işaretlendi.');
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

  finansalIslemEkle() {
    if (!this.yeniIslem.tutar || !this.yeniIslem.aciklama || !this.aktifDosya) return;
    this.yeniIslem.aciklama = this.formatMetin(this.yeniIslem.aciklama);
    const k: any = {...this.aktifDosya}; if (!k.finansalIslemler) k.finansalIslemler = [];
    k.finansalIslemler.unshift({ id: Date.now(), tarih: this.yeniIslem.tarih || new Date().toISOString().split('T')[0], tur: this.yeniIslem.tur as any, tutar: this.yeniIslem.tutar, aciklama: this.yeniIslem.aciklama || '' });
    this.aktifDosyaKaydet(k, 'Finans hareketi dosyaya eklendi.'); this.yeniIslem = { tur: this.yeniIslem.tur, tarih: new Date().toISOString().split('T')[0], tutar: undefined, aciklama: '' };
  }
  finansalIslemSil(id: number) { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.finansalIslemler = k.finansalIslemler!.filter((i:any) => i.id !== id); this.aktifDosyaKaydet(k, 'Finans hareketi silindi.'); }

  klasorGecis(id: number) { this.acikKlasorler[id] = !this.acikKlasorler[id]; }

  evrakEkle() {
    if (!this.yeniEvrak.isim || !this.yeniEvrak.url) return;
    this.yeniEvrak.isim = this.formatMetin(this.yeniEvrak.isim);
    let url = this.yeniEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const yeni = { id: Date.now(), isim: this.yeniEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), ekler: [], tebligTarihi: this.yeniEvrak.tebligTarihi, sonEylemTarihi: this.yeniEvrak.sonEylemTarihi, tamamlandiMi: false, tamamlanmaTarihi: '', yaziRengi: this.getEvrakYaziRengi(this.yeniEvrak.yaziRengi) };
    if (this.aktifSayfa === 'sablonlar') {
      this.sablonlar[this.aktifSablonSekmesi].unshift(yeni); this.sablonlariKaydetCloud('Yeni şablon listeye eklendi.');
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (!k.evraklar) k.evraklar = []; k.evraklar.unshift(yeni); this.aktifDosyaKaydet(k, 'Evrak bağlantısı dosyaya eklendi.');
    }
    this.yeniEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi };
  }
  
  evrakDuzenleBaslat(evrak: EvrakBaglantisi, parentId: number | null = null) { this.duzenlenenEvrakId = evrak.id; this.duzenlenenEvrakParentId = parentId; this.duzenlenenEvrakOrijinalSonEylemTarihi = evrak.sonEylemTarihi || ''; this.duzenlenenEvrak = { ...evrak, yaziRengi: this.getEvrakYaziRengi(evrak.yaziRengi) }; }
  evrakDuzenleIptal() { this.duzenlenenEvrakId = null; this.duzenlenenEvrakParentId = null; this.duzenlenenEvrakOrijinalSonEylemTarihi = ''; this.duzenlenenEvrak = { yaziRengi: this.varsayilanEvrakYaziRengi }; }
  
  evrakGuncelleKaydet() {
    if (!this.duzenlenenEvrak.isim || !this.duzenlenenEvrak.url) return;
    this.duzenlenenEvrak.isim = this.formatMetin(this.duzenlenenEvrak.isim);
    let url = this.duzenlenenEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url; this.duzenlenenEvrak.url = url; this.duzenlenenEvrak.yaziRengi = this.getEvrakYaziRengi(this.duzenlenenEvrak.yaziRengi);
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
      this.aktifDosyaKaydet(k, 'Evrak bilgileri güncellendi.');
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
    if (!this.yeniEkEvrak.isim || !this.yeniEkEvrak.url) return;
    this.yeniEkEvrak.isim = this.formatMetin(this.yeniEkEvrak.isim);
    let url = this.yeniEkEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const y = { id: Date.now(), isim: this.yeniEkEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), tebligTarihi: this.yeniEkEvrak.tebligTarihi, sonEylemTarihi: this.yeniEkEvrak.sonEylemTarihi, tamamlandiMi: false, tamamlanmaTarihi: '', yaziRengi: this.getEvrakYaziRengi(this.yeniEkEvrak.yaziRengi) };
    if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); this.sablonlariKaydetCloud('Alt şablon eklendi.'); } } 
    else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); this.aktifDosyaKaydet(k, 'Alt evrak bağlantısı eklendi.'); } }
    this.ekEvrakFormKapat();
  }
  evrakSil(id: number) { if (this.aktifSayfa === 'sablonlar') { this.sablonlar[this.aktifSablonSekmesi] = this.sablonlar[this.aktifSablonSekmesi].filter((e:any) => e.id !== id); this.sablonlariKaydetCloud('Şablon kayıttan kaldırıldı.'); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.evraklar = k.evraklar!.filter((e:any) => e.id !== id); this.aktifDosyaKaydet(k, 'Evrak bağlantısı silindi.'); } }
  ekEvrakSil(parentId: number, ekId: number) { if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId); if (p && p.ekler) { p.ekler = p.ekler.filter((e:any) => e.id !== ekId); this.sablonlariKaydetCloud('Alt şablon silindi.'); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parentId); if (p && p.ekler) { p.ekler = p.ekler.filter((e:any) => e.id !== ekId); this.aktifDosyaKaydet(k, 'Alt evrak bağlantısı silindi.'); } } }

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
    this.davalar.filter(d => d.muvekkilId === mId).forEach(d => { const f = this.getDosyaFinans(d); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    this.icralar.filter(i => i.muvekkilId === mId).forEach(i => { const f = this.getDosyaFinans(i); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    this.arabuluculukDosyalar.filter(a => a.muvekkilId === mId).forEach(a => { const f = this.getDosyaFinans(a); vb += f.kalanVekalet; eb += f.emanetBakiye; });
    return { kalanVekaletBorcu: vb, emanetMasrafBakiyesi: eb };
  }

  silmeOnayiIste(id: number, tur: 'dava'|'icra'|'arabuluculuk'|'muvekkil') { if(tur === 'dava') this.silinecekDavaId = id; else if(tur === 'icra') this.silinecekIcraId = id; else if(tur === 'arabuluculuk') this.silinecekArabuluculukId = id; else this.silinecekMuvekkilId = id; }
  silmeIptal() { this.silinecekDavaId = null; this.silinecekIcraId = null; this.silinecekArabuluculukId = null; this.silinecekMuvekkilId = null; }
  guvenliUrl(url: string) { return url; }
  bildirimGoster(tur: BildirimTur, baslik: string, mesaj = '') {
    const id = Date.now() + this.bildirimSayaci++;
    this.bildirimler = [...this.bildirimler, { id, tur, baslik, mesaj }];
    const sure = tur === 'error' ? 6000 : 3200;
    setTimeout(() => this.bildirimKapat(id), sure);
  }
  bildirimKapat(id: number) { this.bildirimler = this.bildirimler.filter(b => b.id !== id); }
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
      if (dava.dosyaNumaralari && dava.dosyaNumaralari.length > 0) return dava.dosyaNumaralari.map(num => `${num.tur}: ${num.no}`).join(' • ');
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
    if (this.aktifSayfa === 'detay') return `${dosya.muvekkil || 'Müvekkil yok'} | ${dosya.karsiTaraf || 'Karşı taraf belirtilmedi'}`;
    if (this.aktifSayfa === 'icraDetay') return `${dosya.alacakli || 'Alacaklı yok'} | ${dosya.borclu || 'Borçlu yok'} | Muhatap: ${dosya.muvekkil || '-'}`;
    return (dosya.taraflar || []).map((taraf: any) => taraf.isim).join(' | ') || 'Taraf bilgisi girilmemiş.';
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
    if (this.aktifSayfa === 'detay' && dosya.baglantiliIcraId) return `Bağlantılı icra: ${this.getIcraNo(dosya.baglantiliIcraId)}`;
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
  getDetayTabClass(sekme: DetaySekmesi) {
    if (this.aktifDetaySekmesi !== sekme) return 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70';
    return this.aktifSayfa === 'detay'
      ? 'border-blue-500 text-blue-700 bg-blue-50/70'
      : this.aktifSayfa === 'icraDetay'
      ? 'border-emerald-500 text-emerald-700 bg-emerald-50/70'
      : 'border-violet-500 text-violet-700 bg-violet-50/70';
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
    return /^#[0-9A-Fa-f]{6}$/.test(deger) ? deger : this.varsayilanEvrakYaziRengi;
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
    const tarihMetni = this.formatTarihKisa(tarih);
    return saat ? `${tarihMetni} • ${this.formatSaat(saat)}` : tarihMetni;
  }
  formatTarihSaat(tarih?: string, saat?: string) {
    if (!tarih) return '-';
    const tarihMetni = this.formatTarih(tarih);
    return saat ? `${tarihMetni} • ${this.formatSaat(saat)}` : tarihMetni;
  }
  formatPara(miktar: number) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(miktar || 0); }
  hesaplaKalanGun(str?: string) { if (!str) return ''; const d = new Date(str); const b = new Date(); b.setHours(0,0,0,0); const f = Math.ceil((d.getTime() - b.getTime()) / (1000 * 3600 * 24)); return f < 0 ? 'Süresi Geçti!' : (f === 0 ? 'Bugün Son!' : `${f} Gün Kaldı`); }
  getTaraflarMetni(is: any): string {
    if (!is || !is.dosya) return 'Bilinmeyen Dosya';
    if (is.tur === 'dava') return `${is.dosya.muvekkil || 'Bilinmiyor'} - ${is.dosya.karsiTaraf && is.dosya.karsiTaraf !== '-' ? is.dosya.karsiTaraf : 'Diğer Taraf'}`;
    if (is.tur === 'icra') return `${is.dosya.alacakli || 'Alacaklı'} - ${is.dosya.borclu && is.dosya.borclu !== '-' ? is.dosya.borclu : 'Borçlu'}`;
    if (is.tur === 'arabuluculuk') return is.dosya.taraflar?.map((t:any) => t.isim).join(' - ') || 'Taraflar Bilinmiyor';
    return 'Bilinmeyen Dosya';
  }
}

bootstrapApplication(App);
