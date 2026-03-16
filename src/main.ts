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
interface EvrakBaglantisi { id: number; isim: string; url: string; tarih: string; tebligTarihi?: string; sonEylemTarihi?: string; ekler?: EvrakBaglantisi[]; } 
interface DosyaNumarasi { tur: string; no: string; }
interface ArabuluculukTaraf { id: number; tip: 'Başvurucu' | 'Diğer Taraf'; isim: string; }

interface DavaDosyasi { 
  id: number; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil: string; muvekkilId?: number; karsiTaraf: string; mahkeme: string; konu: string; durum: 'Derdest' | 'Kapalı' | 'İstinaf/Temyiz'; istinafMahkemesi?: string; durusmaTarihi?: string; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; baglantiliIcraId?: number; muvekkilPozisyonu?: string; arsivYeri?: string;
  icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiYontemi?: string;
}

interface IcraDosyasi {
  id: number; icraDairesi: string; dosyaNo: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkilId?: number; muvekkil: string; alacakli: string; borclu: string; takipTipi?: string; takipTarihi: string; durum: 'Aktif' | 'İnfaz/Kapalı' | 'İtiraz Edildi' | 'Tehir-i İcra'; baglantiliDavaId?: number; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; arsivYeri?: string;
  karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string;
  buroNo?: string; arabuluculukNo?: string; buro?: string; basvuruTuru?: string; uyusmazlikTuru?: string; taraflar?: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiYontemi?: string;
}

interface ArabuluculukDosyasi {
  id: number; buroNo: string; arabuluculukNo: string; buro: string; basvuruTuru: 'Dava Şartı' | 'İhtiyari'; uyusmazlikTuru: 'Kira' | 'İşçi İşveren' | 'Ticari' | 'Boşanma' | 'Ortaklığın Giderilmesi' | 'Tüketici'; taraflar: ArabuluculukTaraf[]; toplantiTarihi?: string; toplantiYontemi?: 'Yüzyüze' | 'Videokonferans' | 'Telekonferans'; durum: 'Hazırlık' | 'Müzakere' | 'İmza' | 'Tahsilat' | 'Kapalı'; notlar?: string; vekaletUcreti?: number; finansalIslemler?: FinansalIslem[]; evraklar?: EvrakBaglantisi[]; muvekkilId?: number; arsivYeri?: string;
  dosyaNo?: string; dosyaNumaralari?: DosyaNumarasi[]; muvekkil?: string; karsiTaraf?: string; mahkeme?: string; konu?: string; istinafMahkemesi?: string; durusmaTarihi?: string; baglantiliIcraId?: number; muvekkilPozisyonu?: string; icraDairesi?: string; alacakli?: string; borclu?: string; takipTipi?: string; takipTarihi?: string; baglantiliDavaId?: number;
}

interface Muvekkil { id: number; tip?: 'Müvekkil' | 'Şirketler' | 'Borçlular' | 'Diğer'; _isNewDiger?: boolean; adSoyad: string; tcKimlik: string; telefon: string; eposta: string; adres: string; bankaBilgileri: string; vergiDairesi?: string; vekaletnameUrl?: string; yetkililer?: { id: number; adSoyad: string; telefon: string; eposta?: string; pozisyon: string; }[]; }

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
              <div class="overflow-hidden"><p class="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{{ user?.email }}</p><p class="text-xs font-medium flex items-center gap-1 text-emerald-400">Bulut Aktif</p></div>
            </div>
            <button (click)="cikisYap()" class="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all" title="Çıkış Yap"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
          </div>
        </aside>

        <main class="flex-1 flex flex-col h-screen overflow-hidden relative">
          <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
            <h2 class="text-2xl font-bold text-slate-800">
              @switch (aktifSayfa) {
                @case ('dashboard') { Genel Özet ve İstatistikler }
                @case ('davalar') { Dava Dosyaları } @case ('icralar') { İcra Takipleri } @case ('arabuluculuk') { Arabuluculuk Dosyaları }
                @case ('sablonlar') { Belge Şablonları } @case ('muhasebe') { Muhasebe ve Finans } @case ('iliskiler') { İlişkiler Yönetimi }
                @case ('ajanda') { Duruşma Takvimi } @case ('detay') { Dava Yönetimi ve Finans } @case ('icraDetay') { İcra Yönetimi ve Finans }
                @case ('arabuluculukDetay') { Arabuluculuk Yönetimi ve Finans }
              }
            </h2>
            <div class="flex gap-3">
              @if (aktifSayfa === 'davalar') { <button (click)="dosyaFormunuAc()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni Dosya</button> }
              @else if (aktifSayfa === 'icralar') { <button (click)="icraFormunuAc()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni İcra Takibi</button> }
              @else if (aktifSayfa === 'arabuluculuk') { <button (click)="arabuluculukFormAc()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Yeni Arabuluculuk</button> }
              @else if (aktifSayfa === 'iliskiler') { <button (click)="muvekkilFormunuAc()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg> Yeni Kayıt</button> }
              @else if (aktifSayfa === 'detay' && seciliDava) { <button (click)="dosyaFormunuAc(seciliDava)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Dosyayı Düzenle</button> }
              @else if (aktifSayfa === 'icraDetay' && seciliIcra) { <button (click)="icraFormunuAc(seciliIcra)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> İcrayı Düzenle</button> }
              @else if (aktifSayfa === 'arabuluculukDetay' && seciliArabuluculuk) { <button (click)="arabuluculukFormAc(seciliArabuluculuk)" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Dosyayı Düzenle</button> }
            </div>
          </header>

          <div class="flex-1 overflow-auto p-8 custom-scrollbar relative">
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

                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Dosya No, Muhatap veya Mahkeme ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Derdest">Derdest Dosyalar</option><option value="İstinaf/Temyiz">İstinaf/Temyizdekiler</option><option value="Kapalı">Kapalı Dosyalar</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                          <th class="p-5">Dosya Numaraları</th><th class="p-5">Müvekkil</th><th class="p-5">Mahkeme / Konu</th><th class="p-5">Sonraki Duruşma</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (dava of filtrelenmisDavalar; track dava.id) {
                          <tr class="hover:bg-slate-50 transition-colors group">
                            <td class="p-5">
                              <div class="flex flex-col gap-1.5">
                                @if (dava.dosyaNumaralari && dava.dosyaNumaralari.length > 0) {
                                  @for (num of dava.dosyaNumaralari; track $index) {
                                    <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5"><span class="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{{num.tur}}</span><span>{{num.no}}</span></div>
                                  }
                                } @else { <div class="text-xs font-medium text-slate-700">{{dava.dosyaNo}}</div> }
                              </div>
                            </td>
                            <td class="p-5">
                              <div class="text-slate-700 font-medium">{{ dava.muvekkil }}</div>
                              @if(dava.muvekkilPozisyonu) { <div [class]="getPozisyonClass(dava.muvekkilPozisyonu)" class="text-[10px] font-bold uppercase mt-0.5 inline-block px-1.5 py-0.5 rounded">{{dava.muvekkilPozisyonu}}</div> }
                            </td>
                            <td class="p-5"><div class="text-slate-800 font-medium">{{ dava.mahkeme }}</div><div class="text-xs text-slate-500 mt-1">{{ dava.konu }}</div></td>
                            <td class="p-5 text-slate-600">
                               @if(dava.durusmaTarihi) { <span class="flex items-center gap-2"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarih(dava.durusmaTarihi) }}</span> } 
                               @else { <span class="text-slate-400 text-sm">-</span> }
                            </td>
                            <td class="p-5">
                              <div class="relative inline-block">
                                <select [ngModel]="dava.durum" (ngModelChange)="durumGuncelle(dava, $event)" [class]="getDurumClass(dava.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                  <option value="Derdest" class="text-slate-700 bg-white">Derdest</option><option value="İstinaf/Temyiz" class="text-slate-700 bg-white">İstinaf/Temyiz</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg></div>
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
              }

              @case ('icralar') {
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Daire, Dosya No, Alacaklı veya Borçlu ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Aktif">Aktif Dosyalar</option><option value="İtiraz Edildi">İtiraz Edilenler</option><option value="Tehir-i İcra">Tehir-i İcra</option><option value="İnfaz/Kapalı">Kapalı Dosyalar</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                          <th class="p-5">İcra Dairesi / No</th><th class="p-5">Alacaklı</th><th class="p-5">Borçlu</th><th class="p-5">Takip Tarihi</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (icra of filtrelenmisIcralar; track icra.id) {
                          <tr class="hover:bg-slate-50 transition-colors group">
                            <td class="p-5">
                               <div class="text-sm font-bold text-slate-800">{{icra.icraDairesi}}</div>
                               <div class="text-xs font-medium text-slate-500 mt-0.5">{{icra.dosyaNo}}</div>
                               @if(icra.takipTipi) { <div class="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">{{icra.takipTipi}}</div> }
                            </td>
                            <td class="p-5 text-slate-700 font-medium">{{ icra.alacakli }}</td>
                            <td class="p-5 text-slate-700 font-medium">{{ icra.borclu }}</td>
                            <td class="p-5 text-slate-600"><span class="flex items-center gap-2"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarih(icra.takipTarihi) }}</span></td>
                            <td class="p-5">
                              <div class="relative inline-block">
                                <select [ngModel]="icra.durum" (ngModelChange)="icraDurumGuncelle(icra, $event)" [class]="getIcraDurumClass(icra.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                  <option value="Aktif" class="text-slate-700 bg-white">Aktif</option><option value="İtiraz Edildi" class="text-slate-700 bg-white">İtiraz Edildi</option><option value="Tehir-i İcra" class="text-slate-700 bg-white">Tehir-i İcra</option><option value="İnfaz/Kapalı" class="text-slate-700 bg-white">İnfaz/Kapalı</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg></div>
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
              }

              @case ('arabuluculuk') {
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
                  <div class="flex-1 relative"><input [(ngModel)]="aramaMetni" type="text" placeholder="Büro No, Arabuluculuk No veya Taraf ara..." class="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"></div>
                  <div class="sm:w-64">
                    <select [(ngModel)]="durumFiltresi" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white font-medium text-slate-700">
                      <option value="Tümü">Tüm Durumlar</option><option value="Hazırlık">Hazırlık</option><option value="Müzakere">Müzakere</option><option value="İmza">İmza</option><option value="Tahsilat">Tahsilat</option><option value="Kapalı">Kapalı</option>
                    </select>
                  </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                          <th class="p-5">Numaralar</th><th class="p-5">Taraflar</th><th class="p-5">Büro / Türü</th><th class="p-5">Toplantı</th><th class="p-5">Durum</th><th class="p-5 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (arb of filtrelenmisArabuluculuk; track arb.id) {
                          <tr class="hover:bg-slate-50 transition-colors group">
                            <td class="p-5">
                               <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5"><span class="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">BÜRO</span><span>{{arb.buroNo || '-'}}</span></div>
                               <div class="text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-1.5"><span class="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">ARB</span><span>{{arb.arabuluculukNo}}</span></div>
                            </td>
                            <td class="p-5">
                              <div class="flex flex-col gap-1">
                                @for (taraf of arb.taraflar; track taraf.id) {
                                  <div class="flex items-center gap-1.5 text-sm">
                                    <span [class]="taraf.tip === 'Başvurucu' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'" class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{{taraf.tip}}</span>
                                    <span class="text-slate-700 font-medium truncate max-w-[150px]">{{ taraf.isim }}</span>
                                  </div>
                                }
                              </div>
                            </td>
                            <td class="p-5">
                              <div class="text-slate-800 font-bold text-sm">{{ arb.buro }}</div>
                              <div class="text-xs font-medium text-slate-500 mt-1">{{ arb.basvuruTuru }} - {{ arb.uyusmazlikTuru }}</div>
                            </td>
                            <td class="p-5 text-slate-600">
                               @if(arb.toplantiTarihi) { 
                                 <span class="flex items-center gap-1.5 text-sm font-medium"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatTarih(arb.toplantiTarihi) }}</span> 
                                 @if(arb.toplantiYontemi) { <div class="text-[10px] text-purple-600 font-bold bg-purple-50 inline-block px-1.5 py-0.5 rounded mt-1">{{ arb.toplantiYontemi }}</div> }
                               } @else { <span class="text-slate-400 text-sm">-</span> }
                            </td>
                            <td class="p-5">
                              <div class="relative inline-block">
                                <select [ngModel]="arb.durum" (ngModelChange)="arabuluculukDurumGuncelle(arb, $event)" [class]="getArabuluculukDurumClass(arb.durum)" class="pl-3 pr-7 py-1 rounded-full text-xs font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                                  <option value="Hazırlık" class="text-slate-700 bg-white">Hazırlık</option><option value="Müzakere" class="text-slate-700 bg-white">Müzakere</option><option value="İmza" class="text-slate-700 bg-white">İmza</option><option value="Tahsilat" class="text-slate-700 bg-white">Tahsilat</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg></div>
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
                <div class="space-y-6 max-w-7xl mx-auto pb-10">
                  <div class="flex items-center gap-4">
                    <button (click)="sayfaDegistir(aktifSayfa === 'detay' ? 'davalar' : (aktifSayfa === 'icraDetay' ? 'icralar' : 'arabuluculuk'))" class="p-2.5 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">Geri Dön</button>
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">{{ aktifSayfa === 'detay' ? 'Dava Dosyası Detayı' : (aktifSayfa === 'icraDetay' ? 'İcra Dosyası Detayı' : 'Arabuluculuk Dosyası Detayı') }}</h3>
                    <div class="ml-auto relative inline-block">
                      <select [ngModel]="aktifDosya.durum" (ngModelChange)="aktifDosyaDurumGuncelle($event)" [class]="aktifSayfa === 'detay' ? getDurumClass(aktifDosya.durum) : (aktifSayfa === 'icraDetay' ? getIcraDurumClass(aktifDosya.durum) : getArabuluculukDurumClass(aktifDosya.durum))" class="pl-3 pr-8 py-1.5 rounded-full text-sm font-bold border cursor-pointer hover:shadow-md transition-all outline-none appearance-none">
                        @if (aktifSayfa === 'detay') {
                          <option value="Derdest" class="text-slate-700 bg-white">Derdest</option><option value="İstinaf/Temyiz" class="text-slate-700 bg-white">İstinaf/Temyiz</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                        } @else if (aktifSayfa === 'icraDetay') {
                          <option value="Aktif" class="text-slate-700 bg-white">Aktif</option><option value="İtiraz Edildi" class="text-slate-700 bg-white">İtiraz Edildi</option><option value="Tehir-i İcra" class="text-slate-700 bg-white">Tehir-i İcra</option><option value="İnfaz/Kapalı" class="text-slate-700 bg-white">İnfaz/Kapalı</option>
                        } @else {
                          <option value="Hazırlık" class="text-slate-700 bg-white">Hazırlık</option><option value="Müzakere" class="text-slate-700 bg-white">Müzakere</option><option value="İmza" class="text-slate-700 bg-white">İmza</option><option value="Tahsilat" class="text-slate-700 bg-white">Tahsilat</option><option value="Kapalı" class="text-slate-700 bg-white">Kapalı</option>
                        }
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 opacity-60"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg></div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div class="lg:col-span-7 space-y-6">
                      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
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
                           @if (aktifDosya.baglantiliIcraId) {
                             <div class="col-span-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 mt-2 flex justify-between items-center"><div><p class="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-0.5">Bağlantılı İcra Dosyası</p><p class="font-bold text-slate-800">{{ getIcraNo(aktifDosya.baglantiliIcraId) }}</p></div><button (click)="icrayaGitId(aktifDosya.baglantiliIcraId)" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white rounded text-xs font-bold shadow-sm">İcraya Git</button></div>
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
                             <div class="col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2 flex justify-between items-center"><div><p class="text-xs text-blue-700 font-bold uppercase tracking-wider mb-0.5">Bağlantılı Dava Dosyası</p><p class="font-bold text-slate-800">{{ getDavaNo(aktifDosya.baglantiliDavaId) }}</p></div><button (click)="davayaGitId(aktifDosya.baglantiliDavaId)" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded text-xs font-bold shadow-sm">Davaya Git</button></div>
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
                           <div class="col-span-2 p-3 bg-purple-50 border border-purple-100 rounded-lg flex justify-between items-center mt-2">
                             <div><p class="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-0.5">Toplantı Bilgisi</p><p class="font-bold text-slate-800">{{ formatTarih(aktifDosya.toplantiTarihi) }} - <span class="uppercase text-xs">{{aktifDosya.toplantiYontemi}}</span></p></div>
                             @if(aktifDosya.toplantiTarihi) { <div class="px-3 py-1 bg-white border border-purple-200 text-purple-700 font-bold text-xs rounded shadow-sm">{{ hesaplaKalanGun(aktifDosya.toplantiTarihi) }}</div> }
                           </div>
                         }
                      </div>

                      <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[350px]">
                        <div class="flex border-b border-slate-200 bg-slate-50">
                           <button (click)="aktifDetaySekmesi = 'notlar'" [class.border-blue-500]="aktifDetaySekmesi === 'notlar'" [class.text-blue-600]="aktifDetaySekmesi === 'notlar'" class="flex-1 py-3 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2">Notlar</button>
                           <button (click)="aktifDetaySekmesi = 'evraklar'" [class.border-blue-500]="aktifDetaySekmesi === 'evraklar'" [class.text-blue-600]="aktifDetaySekmesi === 'evraklar'" class="flex-1 py-3 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2">Evrak Bağlantıları</button>
                           <button (click)="aktifDetaySekmesi = 'sureliIsler'" [class.border-blue-500]="aktifDetaySekmesi === 'sureliIsler'" [class.text-blue-600]="aktifDetaySekmesi === 'sureliIsler'" class="flex-1 py-3 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 relative">
                             Süreli İşler
                             @if(aktifDosyaSureliIsleri.length > 0) { <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> }
                           </button>
                        </div>

                        <div class="p-5 flex-1 flex flex-col h-full bg-slate-50/50">
                          @if (aktifDetaySekmesi === 'notlar') {
                            <textarea [(ngModel)]="aktifDosya.notlar" (blur)="aktifDosyaKaydet(aktifDosya)" placeholder="Dosya notlarınızı buraya yazabilirsiniz... (Otomatik kaydedilir)" class="w-full h-64 p-4 bg-amber-50/30 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700 leading-relaxed text-sm"></textarea>
                          }
                          @if (aktifDetaySekmesi === 'evraklar') {
                            <div class="flex flex-col h-full">
                               <div class="flex flex-col gap-3 mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                  <p class="text-[10px] font-black uppercase text-blue-600 tracking-wider">Yeni Ana Evrak Ekle</p>
                                  <div class="flex gap-2 w-full">
                                    <input [(ngModel)]="yeniEvrak.isim" type="text" placeholder="Evrak Adı (Örn: Dilekçe / Talep)" class="w-1/3 px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                    <input [(ngModel)]="yeniEvrak.url" type="text" placeholder="Bağlantı URL (Google Drive, UYAP vs)" class="flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                  </div>
                                  <div class="flex gap-4 w-full items-end bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-1">Tebliğ Tarihi (Opsiyonel)</label><input [(ngModel)]="yeniEvrak.tebligTarihi" type="date" class="w-full px-3 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                    <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-1 text-red-600">Son Eylem Günü (Opsiyonel)</label><input [(ngModel)]="yeniEvrak.sonEylemTarihi" type="date" class="w-full px-3 py-1.5 text-sm border border-red-300 rounded outline-none bg-red-50"></div>
                                    <button (click)="evrakEkle()" class="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0 h-[38px]">Listeye Ekle</button>
                                  </div>
                               </div>
                               
                               <div class="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                                  @for (evrak of aktifDosya.evraklar; track evrak.id; let i = $index) {
                                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:border-blue-300">
                                      <div class="flex items-center justify-between p-3" [class.bg-blue-50]="duzenlenenEvrakId === evrak.id">
                                        @if (duzenlenenEvrakId === evrak.id && !duzenlenenEvrakParentId) {
                                           <div class="flex flex-col w-full gap-2">
                                              <div class="flex gap-2">
                                                <input [(ngModel)]="duzenlenenEvrak.isim" class="w-1/3 px-2 py-1.5 text-sm border border-blue-400 rounded outline-none">
                                                <input [(ngModel)]="duzenlenenEvrak.url" class="flex-1 px-2 py-1.5 text-sm border border-blue-400 rounded outline-none">
                                              </div>
                                              <div class="flex gap-2 items-end bg-white/50 p-2 rounded">
                                                <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tebliğ:</label><input [(ngModel)]="duzenlenenEvrak.tebligTarihi" type="date" class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
                                                <div class="flex-1"><label class="block text-[10px] font-bold text-red-500 mb-0.5">Son Eylem:</label><input [(ngModel)]="duzenlenenEvrak.sonEylemTarihi" type="date" class="w-full px-2 py-1 text-sm border border-red-300 rounded"></div>
                                                <div class="flex gap-1"><button (click)="evrakGuncelleKaydet()" class="px-4 py-1.5 bg-green-500 text-white rounded text-xs font-bold shadow-sm">Kaydet</button><button (click)="evrakDuzenleIptal()" class="px-4 py-1.5 bg-slate-300 text-slate-700 rounded text-xs font-bold">İptal</button></div>
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
                                               <button (click)="evrakAsagi(i)" [disabled]="i === aktifDosya.evraklar!.length - 1" class="px-1 hover:bg-slate-200 text-slate-400 disabled:opacity-20 leading-none py-0.5 border-t border-slate-200">▼</button>
                                             </div>
                                             <div class="flex flex-col">
                                               <p class="font-bold text-sm text-slate-800">{{ evrak.isim }}</p>
                                               <div class="flex gap-3 mt-1">
                                                 @if(evrak.tebligTarihi) { <span class="text-[10px] text-slate-500 font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Tebliğ: {{ formatTarihKisa(evrak.tebligTarihi) }}</span> }
                                                 @if(evrak.sonEylemTarihi) { <span class="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Son: {{ formatTarihKisa(evrak.sonEylemTarihi) }} ({{ hesaplaKalanGun(evrak.sonEylemTarihi) }})</span> }
                                               </div>
                                             </div>
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
                                  } @empty { <div class="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium">Bu dosyaya ait bağlantı eklenmemiş.</div> }
                               </div>
                            </div>
                          }

                          @if (aktifDetaySekmesi === 'sureliIsler') {
                            <div class="space-y-3 overflow-y-auto pr-1">
                               @for (is of aktifDosyaSureliIsleri; track $index) {
                                  <div class="bg-white border border-red-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group hover:border-red-300 transition-colors">
                                     <div>
                                       <p class="font-black text-slate-800 text-lg">{{ is.isim }}</p>
                                       @if(is.anaEvrakIsim) { <p class="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1">Ek Dosya: {{ is.anaEvrakIsim }}</p> }
                                       <p class="text-xs text-slate-500 mt-2 font-medium">Tebliğ Tarihi: {{ is.tebligTarihi ? formatTarih(is.tebligTarihi) : 'Belirtilmedi' }}</p>
                                     </div>
                                     <div class="sm:text-right bg-red-50 p-3 rounded-lg border border-red-100 min-w-[160px]">
                                       <p class="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1">Son Eylem Günü</p>
                                       <p class="text-xl font-black text-red-600 leading-none">{{ formatTarihKisa(is.sonEylemTarihi) }}</p>
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
                    <div class="lg:col-span-5 space-y-6">
                       <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div class="bg-slate-800 p-4 text-white"><h4 class="font-bold">Dosya Finans ve Masraf Takibi</h4></div>
                         <div class="p-5 space-y-5">
                            <div class="grid grid-cols-2 gap-3">
                              @if (aktifSayfa === 'arabuluculukDetay') {
                                <div class="bg-purple-50 border border-purple-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-purple-800 uppercase mb-1">Kalan Net Hizmet Ücreti</p><p class="text-lg font-bold text-purple-700">{{ formatPara(getDosyaFinans(aktifDosya).kalanVekalet) }}</p></div>
                                <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-emerald-800 uppercase mb-1">Net Tahsil Edilen</p><p class="text-lg font-bold text-emerald-700">{{ formatPara(getDosyaFinans(aktifDosya).toplamTahsilat) }}</p></div>
                              } @else {
                                <div class="bg-rose-50 border border-rose-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-rose-800 uppercase mb-1">Kalan Vekalet / Hizmet Ücreti</p><p class="text-lg font-bold text-rose-700">{{ formatPara(getDosyaFinans(aktifDosya).kalanVekalet) }}</p></div>
                                <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-lg"><p class="text-[10px] font-bold text-emerald-800 uppercase mb-1">Emanet Masraf Kasası</p><p class="text-lg font-bold text-emerald-700">{{ formatPara(getDosyaFinans(aktifDosya).emanetBakiye) }}</p></div>
                              }
                            </div>

                            <div class="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                               <p class="text-xs font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Yeni Finansal İşlem Ekle</p>
                               <div class="space-y-3">
                                 <div class="grid grid-cols-2 gap-2">
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
                                 <div class="flex gap-2 items-end">
                                    <div class="w-1/3"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">{{ aktifSayfa === 'arabuluculukDetay' ? 'Brüt Tutar (₺)' : 'Tutar (₺)' }}</label><input [(ngModel)]="yeniIslem.tutar" type="number" min="0" placeholder="0.00" class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                    <div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Açıklama</label><input [(ngModel)]="yeniIslem.aciklama" (keyup.enter)="finansalIslemEkle()" type="text" placeholder="Örn: Bilirkişi ücreti..." class="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none"></div>
                                    <button (click)="finansalIslemEkle()" class="px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded">Ekle</button>
                                 </div>
                               </div>
                            </div>

                            <div>
                               <p class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">İşlem Geçmişi</p>
                               <div class="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                  @for (islem of aktifDosya.finansalIslemler; track islem.id) {
                                    <div class="flex flex-col p-2.5 bg-white border border-slate-200 rounded shadow-sm text-sm">
                                      <div class="flex justify-between items-start mb-1">
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
                                      <div class="flex justify-between items-end">
                                        <p class="text-xs text-slate-500">{{ islem.aciklama }}</p>
                                        <div class="flex items-center gap-2"><span class="text-[10px] text-slate-400 font-medium">{{ formatTarihKisa(islem.tarih) }}</span><button (click)="finansalIslemSil(islem.id)" class="text-slate-300 hover:text-red-500 text-xs">Sil</button></div>
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

      <!-- BUTUN FORMLAR VE MODALLAR (HER ZAMAN VE HER SAYFADA CALISABILMESI ICIN DISARIYA ALINDI) -->
      @if (davaFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 class="text-lg font-bold text-slate-800">{{ formModu === 'ekle' ? 'Yeni Dava Dosyası' : 'Dosyayı Düzenle' }}</h3><button (click)="davaFormKapat()" class="text-slate-400 hover:text-slate-600 transition-colors">Kapat</button></div>
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{{ formHata }}</div> }

              <div class="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
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

              <div class="flex gap-4">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Müvekkil <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="islemGorenDava.muvekkilId" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option [ngValue]="undefined" disabled>Müvekkil Seçiniz</option>
                    @for(m of muvekkiller; track m.id) { <option [ngValue]="m.id">{{ m.adSoyad }} {{ m.tip === 'Diğer' ? '(Diğer)' : '' }}</option> }
                  </select>
                </div>
                <div class="w-1/3">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Pozisyonu</label>
                  <select [(ngModel)]="islemGorenDava.muvekkilPozisyonu" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm font-medium">
                    <option [ngValue]="undefined">Belirtilmedi</option>
                    <option value="Davacı">Davacı</option><option value="Davalı">Davalı</option><option value="Üçüncü Kişi">Üçüncü Kişi</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Bağlantılı İcra Dosyası (Opsiyonel)</label>
                <select [(ngModel)]="islemGorenDava.baglantiliIcraId" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none">
                  <option [ngValue]="undefined">Bağlantı Yok</option>
                  @for(i of icralar; track i.id) { <option [ngValue]="i.id">{{ i.icraDairesi }} - {{ i.dosyaNo }} ({{i.borclu}})</option> }
                </select>
              </div>

              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Karşı Taraf</label><input [(ngModel)]="islemGorenDava.karsiTaraf" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              <div class="flex gap-2">
                <div class="w-3/5"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mahkeme</label><input [(ngModel)]="islemGorenDava.mahkeme" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="w-2/5"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Konu</label><input [(ngModel)]="islemGorenDava.konu" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
              
              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenDava.arsivYeri" type="text" placeholder="Örn: Mavi Klasör, Dolap 2, Raf 1" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>

              <div class="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenDava.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Derdest">Derdest</option><option value="İstinaf/Temyiz">İstinaf/Temyiz</option><option value="Kapalı">Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dava Açılış Tarihi</label><input [(ngModel)]="islemGorenDava.takipTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>

              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Sonraki Duruşma Tarihi</label><input [(ngModel)]="islemGorenDava.durusmaTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>

              @if (islemGorenDava.durum === 'İstinaf/Temyiz') {
                <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg mt-2"><label class="block text-xs font-bold text-orange-800 uppercase mb-1">İstinaf Mahkemesi</label><input [(ngModel)]="islemGorenDava.istinafMahkemesi" type="text" class="w-full px-3 py-2 border border-orange-200 rounded-lg outline-none bg-white"></div>
              }

              <div class="border-t border-slate-100 pt-3 mt-2"><label class="block text-xs font-bold text-blue-600 uppercase mb-1">Anlaşılan Vekalet Ücreti (₺)</label><input [(ngModel)]="islemGorenDava.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg outline-none"></div>
            </div>
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><button (click)="davaFormKapat()" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">İptal</button><button (click)="davaKaydet()" class="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all">Kaydet</button></div>
          </div>
        </div>
      }

      @if (icraFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div class="bg-emerald-600 px-6 py-4 flex justify-between items-center"><h3 class="text-lg font-bold text-white">{{ formModu === 'ekle' ? 'Yeni İcra Takibi' : 'İcra Takibini Düzenle' }}</h3><button (click)="icraFormKapat()" class="text-emerald-100 hover:text-white transition-colors">Kapat</button></div>
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{{ formHata }}</div> }

              <div class="flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">İcra Dairesi <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenIcra.icraDairesi" type="text" placeholder="Örn: İst. 1. İcra" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dosya No <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenIcra.dosyaNo" type="text" placeholder="Örn: 2024/123" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Müvekkil <span class="text-red-500">*</span></label>
                <select [(ngModel)]="islemGorenIcra.muvekkilId" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                  <option [ngValue]="undefined" disabled>Müvekkil Seçiniz</option>
                  @for(m of muvekkiller; track m.id) { <option [ngValue]="m.id">{{ m.adSoyad }} {{ m.tip === 'Diğer' ? '(Diğer)' : '' }}</option> }
                </select>
              </div>
              
              <div class="flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Alacaklı</label><input [(ngModel)]="islemGorenIcra.alacakli" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Borçlu</label><input [(ngModel)]="islemGorenIcra.borclu" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Takip Tipi <span class="text-red-500">*</span></label>
                <select [(ngModel)]="islemGorenIcra.takipTipi" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                  <option value="İlamsız">İlamsız</option><option value="İlamlı">İlamlı</option><option value="Kambiyo">Kambiyo</option><option value="Rehnin Paraya Çevrilmesi">Rehnin Paraya Çevrilmesi</option><option value="İhtiyati Haciz">İhtiyati Haciz</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Bağlantılı Dava Dosyası (Opsiyonel)</label>
                <select [(ngModel)]="islemGorenIcra.baglantiliDavaId" class="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg outline-none">
                  <option [ngValue]="undefined">Bağlantı Yok</option>
                  @for(d of davalar; track d.id) { <option [ngValue]="d.id">{{ d.dosyaNo }} ({{d.karsiTaraf}})</option> }
                </select>
              </div>
              
              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenIcra.arsivYeri" type="text" placeholder="Örn: Kırmızı Klasör, İcra Dolabı" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenIcra.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Aktif">Aktif</option><option value="İtiraz Edildi">İtiraz Edildi</option><option value="Tehir-i İcra">Tehir-i İcra</option><option value="İnfaz/Kapalı">İnfaz/Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Takip Tarihi</label><input [(ngModel)]="islemGorenIcra.takipTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
              <div class="border-t border-slate-100 pt-3 mt-2"><label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Anlaşılan Vekalet Ücreti (₺)</label><input [(ngModel)]="islemGorenIcra.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none"></div>
            </div>
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><button (click)="icraFormKapat()" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">İptal</button><button (click)="icraKaydet()" class="px-5 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-all">Kaydet</button></div>
          </div>
        </div>
      }

      @if (arabuluculukFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div class="bg-purple-600 px-6 py-4 flex justify-between items-center"><h3 class="text-lg font-bold text-white">{{ formModu === 'ekle' ? 'Yeni Arabuluculuk Dosyası' : 'Arabuluculuk Dosyasını Düzenle' }}</h3><button (click)="arabuluculukFormKapat()" class="text-purple-200 hover:text-white transition-colors">Kapat</button></div>
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{{ formHata }}</div> }

              <div class="flex gap-4">
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Büro No @if(islemGorenArabuluculuk.basvuruTuru === 'Dava Şartı'){<span class="text-red-500">*</span>}</label><input [(ngModel)]="islemGorenArabuluculuk.buroNo" type="text" placeholder="Örn: 2024/123" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arabuluculuk No <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenArabuluculuk.arabuluculukNo" type="text" placeholder="Örn: 2024/456" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>

              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Büro <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenArabuluculuk.buro" type="text" placeholder="Örn: İstanbul Arabuluculuk Bürosu" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              
              <div class="border-t border-slate-100 pt-3 mt-1 relative">
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Hesap Muhatabı (Kayıtlı İlişki) <span class="text-red-500">*</span></label>
                
                <div (click)="arabuluculukMuvekkilDropdownAcik = !arabuluculukMuvekkilDropdownAcik" class="w-full px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg outline-none text-sm font-medium cursor-pointer flex justify-between items-center text-slate-800">
                  <span>{{ secilenMuvekkilAd(islemGorenArabuluculuk.muvekkilId) || 'Kişi/Kurum Seçiniz' }}</span>
                  <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg>
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

              <div class="flex gap-4">
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

              <div class="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
              
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Toplantı Tarihi</label><input [(ngModel)]="islemGorenArabuluculuk.toplantiTarihi" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Toplantı Yöntemi</label>
                  <select [(ngModel)]="islemGorenArabuluculuk.toplantiYontemi" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option [ngValue]="undefined">Belirtilmedi</option><option value="Yüzyüze">Yüzyüze</option><option value="Videokonferans">Videokonferans</option><option value="Telekonferans">Telekonferans</option>
                  </select>
                </div>
              </div>

              <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Arşiv / Klasör Konumu (Opsiyonel)</label><input [(ngModel)]="islemGorenArabuluculuk.arsivYeri" type="text" placeholder="Örn: Mor Klasör, Çekmece 3" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 focus:bg-white"></div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Durum</label>
                  <select [(ngModel)]="islemGorenArabuluculuk.durum" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                    <option value="Hazırlık">Hazırlık</option><option value="Müzakere">Müzakere</option><option value="İmza">İmza</option><option value="Tahsilat">Tahsilat</option><option value="Kapalı">Kapalı</option>
                  </select>
                </div>
                <div><label class="block text-xs font-bold text-purple-600 uppercase mb-1">Brüt Hizmet Ücreti (₺)</label><input [(ngModel)]="islemGorenArabuluculuk.vekaletUcreti" type="number" min="0" class="w-full px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg outline-none"></div>
              </div>

            </div>
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><button (click)="arabuluculukFormKapat()" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">İptal</button><button (click)="arabuluculukKaydet()" class="px-5 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-all">Kaydet</button></div>
          </div>
        </div>
      }

      @if (muvekkilFormAcik) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center"><h3 class="text-lg font-bold text-white">{{ formModu === 'ekle' ? 'Yeni Kişi/Kurum Kaydı' : 'Kayıt Düzenle' }}</h3><button (click)="muvekkilFormKapat()" class="text-indigo-200 hover:text-white transition-colors">Kapat</button></div>
            <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              @if (formHata) { <div class="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{{ formHata }}</div> }
              
              <div class="mb-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
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

              <div><label class="block text-xs font-bold text-slate-500 mb-1">Ad Soyad / Unvan <span class="text-red-500">*</span></label><input [(ngModel)]="islemGorenMuvekkil.adSoyad" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">TC Kimlik / VKN</label><input [(ngModel)]="islemGorenMuvekkil.tcKimlik" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Telefon</label><input [(ngModel)]="islemGorenMuvekkil.telefon" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">E-Posta</label><input [(ngModel)]="islemGorenMuvekkil.eposta" type="email" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Banka ve IBAN Bilgisi</label><input [(ngModel)]="islemGorenMuvekkil.bankaBilgileri" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
              </div>
              <div><label class="block text-xs font-bold text-slate-500 mb-1">Vekaletname Bağlantısı (URL)</label><input [(ngModel)]="islemGorenMuvekkil.vekaletnameUrl" type="text" placeholder="Örn: Google Drive linki, UYAP bağlantısı..." class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-blue-600 bg-slate-50 focus:bg-white transition-colors"></div>
              <div><label class="block text-xs font-bold text-slate-500 mb-1">Adres</label><textarea [(ngModel)]="islemGorenMuvekkil.adres" rows="2" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></textarea></div>

              @if (islemGorenMuvekkil.tip === 'Şirketler') {
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Vergi Dairesi</label><input [(ngModel)]="islemGorenMuvekkil.vergiDairesi" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"></div>
                
                <div class="col-span-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <label class="block text-xs font-bold text-indigo-700 uppercase mb-3">Şirket / Kurum Yetkilileri</label>
                  <div class="space-y-3">
                    @for(y of islemGorenMuvekkil.yetkililer; track $index) {
                      <div class="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <input [(ngModel)]="y.adSoyad" type="text" placeholder="Ad Soyad" class="w-full sm:w-1/4 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs">
                        <input [(ngModel)]="y.telefon" type="text" placeholder="Telefon" class="w-full sm:w-1/5 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs">
                        <input [(ngModel)]="y.eposta" type="email" placeholder="E-Posta" class="w-full sm:w-1/4 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs">
                        <input [(ngModel)]="y.pozisyon" type="text" placeholder="Pozisyon" class="w-full sm:flex-1 px-2 py-2 border border-indigo-200 rounded-lg outline-none text-xs">
                        <button (click)="yetkiliSil($index)" class="p-1.5 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded-lg">Sil</button>
                      </div>
                    }
                  </div>
                  <div class="mt-3 flex gap-2 relative">
                    <button (click)="yetkiliEkle()" class="px-3 py-1.5 bg-indigo-200 text-indigo-800 text-xs font-bold rounded-lg hover:bg-indigo-300 transition-colors">Manuel Ekle</button>
                    <div>
                      <button (click)="yetkiliSecimDropdownAcik = !yetkiliSecimDropdownAcik" class="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-sm">
                        Kayıtlı Kişilerden Seç <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg>
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
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><button (click)="muvekkilFormKapat()" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">İptal</button><button (click)="muvekkilKaydet()" class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md transition-all">Kaydet</button></div>
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
  
  arabuluculukMuvekkilDropdownAcik = false;
  arabuluculukMuvekkilArama = '';

  yetkiliSecimDropdownAcik = false;
  yetkiliSecimArama = '';

  davaFormAcik = false; icraFormAcik = false; arabuluculukFormAcik = false; muvekkilFormAcik = false; formModu: 'ekle' | 'duzenle' = 'ekle';
  islemGorenDava: Partial<DavaDosyasi> = {}; islemGorenIcra: Partial<IcraDosyasi> = {}; islemGorenArabuluculuk: Partial<ArabuluculukDosyasi> = {}; islemGorenMuvekkil: Partial<Muvekkil> = {};
  
  yeniIslem: Partial<FinansalIslem> = { tur: 'Vekalet Ücreti' }; 
  silinecekDavaId: number | null = null; silinecekIcraId: number | null = null; silinecekArabuluculukId: number | null = null; silinecekMuvekkilId: number | null = null;
  aktifDetaySekmesi: DetaySekmesi = 'notlar'; formHata = '';

  yeniEvrak: Partial<EvrakBaglantisi> = {}; ekEklenenEvrakId: number | null = null;
  yeniEkEvrak: Partial<EvrakBaglantisi> = {}; duzenlenenEvrakId: number | null = null;
  duzenlenenEvrakParentId: number | null = null; duzenlenenEvrak: Partial<EvrakBaglantisi> = {};
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

  async davaKaydetCloud(d: DavaDosyasi) { if (!this.user) return; this.islemYapiyor=true; try { await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', d.id.toString()), JSON.parse(JSON.stringify(d))); } catch(e){} finally{this.islemYapiyor=false;} }
  async davaSilCloud(id: number) { if (!this.user) return; try { await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'davalar', id.toString())); } catch (e) {} }
  async icraKaydetCloud(i: IcraDosyasi) { if (!this.user) return; this.islemYapiyor=true; try { await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', i.id.toString()), JSON.parse(JSON.stringify(i))); } catch(e){} finally{this.islemYapiyor=false;} }
  async icraSilCloud(id: number) { if (!this.user) return; try { await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'icralar', id.toString())); } catch (e) {} }
  async arabuluculukKaydetCloud(a: ArabuluculukDosyasi) { if (!this.user) return; this.islemYapiyor=true; try { await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', a.id.toString()), JSON.parse(JSON.stringify(a))); } catch(e){} finally{this.islemYapiyor=false;} }
  async arabuluculukSilCloud(id: number) { if (!this.user) return; try { await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'arabuluculuk', id.toString())); } catch (e) {} }
  async muvekkilKaydetCloud(m: Muvekkil) { if (!this.user) return; this.islemYapiyor=true; try { await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', m.id.toString()), JSON.parse(JSON.stringify(m))); } catch(e){ console.error(e); } finally{ this.islemYapiyor=false; } }
  async muvekkilSilCloud(id: number) { if (!this.user) return; try { await deleteDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'muvekkiller', id.toString())); } catch (e) {} }
  async sablonlariKaydetCloud() { if (!this.user) return; try { await setDoc(doc(this.db, 'artifacts', appId, 'users', this.user.uid, 'ayarlar', 'sablonlar'), JSON.parse(JSON.stringify(this.sablonlar))); } catch (e) {} }

  sayfaDegistir(s: SayfaTipi) { this.aktifSayfa = s; if (s !== 'detay') this.seciliDava = null; if (s !== 'icraDetay') this.seciliIcra = null; if (s !== 'arabuluculukDetay') this.seciliArabuluculuk = null; this.aramaMetni = ''; }

  detayaGit(d: DavaDosyasi) { this.seciliDava = d; this.aktifSayfa = 'detay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Vekalet Ücreti', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  icraDetayinaGit(i: IcraDosyasi) { this.seciliIcra = i; this.aktifSayfa = 'icraDetay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Vekalet Ücreti', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }
  arabuluculukDetayinaGit(a: ArabuluculukDosyasi) { this.seciliArabuluculuk = a; this.aktifSayfa = 'arabuluculukDetay'; this.aktifDetaySekmesi = 'notlar'; this.yeniIslem = { tur: 'Ödeme', tarih: new Date().toISOString().split('T')[0] }; this.evrakDuzenleIptal(); this.ekEvrakFormKapat(); }

  davayaGitId(id?: number) { if(!id) return; const d = this.davalar.find(x=>x.id===id); if(d) this.detayaGit(d); }
  icrayaGitId(id?: number) { if(!id) return; const i = this.icralar.find(x=>x.id===id); if(i) this.icraDetayinaGit(i); }
  getDavaNo(id?: number) { if(!id) return ''; return this.davalar.find(d=>d.id===id)?.dosyaNo || 'Bulunamadı'; }
  getIcraNo(id?: number) { if(!id) return ''; return this.icralar.find(i=>i.id===id)?.dosyaNo || 'Bulunamadı'; }

  getMenuClass(s: SayfaTipi): string { const b = "flex items-center gap-3 px-4 py-3 rounded-lg transition-all group cursor-pointer "; return (this.aktifSayfa === s || (s === 'davalar' && this.aktifSayfa === 'detay') || (s === 'icralar' && this.aktifSayfa === 'icraDetay') || (s === 'arabuluculuk' && this.aktifSayfa === 'arabuluculukDetay')) ? b + "bg-blue-600 text-white shadow-md" : b + "text-slate-400 hover:bg-slate-800 hover:text-white"; }

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
       if (e.sonEylemTarihi) isler.push({...e, anaEvrakIsim: null});
       (e.ekler || []).forEach((ek:any) => { if (ek.sonEylemTarihi) isler.push({...ek, anaEvrakIsim: e.isim}); });
    });
    return isler.sort((a,b) => new Date(a.sonEylemTarihi).getTime() - new Date(b.sonEylemTarihi).getTime());
  }

  get tumAcilSureliIsler() {
    let isler: any[] = [];
    this.davalar.forEach(d => {
        if (d.durum === 'Kapalı') return;
        (d.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi) isler.push({ tur: 'dava', dosya: d, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi) isler.push({ tur: 'dava', dosya: d, evrak: ek, anaEvrakIsim: e.isim }); });
        });
    });
    this.icralar.forEach(i => {
        if (i.durum === 'İnfaz/Kapalı') return;
        (i.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi) isler.push({ tur: 'icra', dosya: i, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi) isler.push({ tur: 'icra', dosya: i, evrak: ek, anaEvrakIsim: e.isim }); });
        });
    });
    this.arabuluculukDosyalar.forEach(a => {
        if (a.durum === 'Kapalı') return;
        (a.evraklar || []).forEach(e => {
           if (e.sonEylemTarihi) isler.push({ tur: 'arabuluculuk', dosya: a, evrak: e });
           (e.ekler || []).forEach(ek => { if (ek.sonEylemTarihi) isler.push({ tur: 'arabuluculuk', dosya: a, evrak: ek, anaEvrakIsim: e.isim }); });
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
    if (d) { 
      this.formModu = 'duzenle'; 
      this.islemGorenDava = { ...d, dosyaNumaralari: Array.isArray(d.dosyaNumaralari) ? d.dosyaNumaralari.map(n => ({...n})) : [] }; 
      if (!this.islemGorenDava.dosyaNumaralari || this.islemGorenDava.dosyaNumaralari.length === 0) {
         this.islemGorenDava.dosyaNumaralari = [{ tur: 'ESAS', no: this.islemGorenDava.dosyaNo || '' }, { tur: 'KARAR', no: '' }]; 
      }
    } 
    else { this.formModu = 'ekle'; this.islemGorenDava = { durum: 'Derdest', muvekkilId: undefined, muvekkilPozisyonu: undefined, dosyaNumaralari: [{ tur: 'ESAS', no: '' }, { tur: 'KARAR', no: '' }] }; }
    this.davaFormAcik = true;
  }
  dosyaNumarasiEkle() { if (!this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari = []; this.islemGorenDava.dosyaNumaralari.push({ tur: 'ESAS', no: '' }); }
  dosyaNumarasiSil(i: number) { if (this.islemGorenDava.dosyaNumaralari) this.islemGorenDava.dosyaNumaralari.splice(i, 1); }
  davaFormKapat() { this.davaFormAcik = false; }
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
      const y: DavaDosyasi = { id: Date.now(), dosyaNo: noStr, dosyaNumaralari: num, muvekkilId: m?.id || Number(this.islemGorenDava.muvekkilId), muvekkil: m?.adSoyad || 'Bilinmiyor', muvekkilPozisyonu: this.islemGorenDava.muvekkilPozisyonu, karsiTaraf: this.islemGorenDava.karsiTaraf || '-', mahkeme: this.islemGorenDava.mahkeme || '-', konu: this.islemGorenDava.konu || '-', durum: this.islemGorenDava.durum as any, istinafMahkemesi: this.islemGorenDava.istinafMahkemesi || '', durusmaTarihi: this.islemGorenDava.durusmaTarihi || '', takipTarihi: this.islemGorenDava.takipTarihi || '', vekaletUcreti: this.islemGorenDava.vekaletUcreti || 0, baglantiliIcraId: this.islemGorenDava.baglantiliIcraId, arsivYeri: this.islemGorenDava.arsivYeri || '', notlar: '', finansalIslemler: [], evraklar: [] };
      this.davaKaydetCloud(y);
    } else { const g = { ...this.islemGorenDava, dosyaNo: noStr, dosyaNumaralari: num, muvekkil: m?.adSoyad || this.islemGorenDava.muvekkil } as DavaDosyasi; this.davaKaydetCloud(g); }
    this.davaFormKapat();
  }
  durumGuncelle(d: DavaDosyasi, yD: string) { const k = {...d}; k.durum = yD as any; if (k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = ''; this.davaKaydetCloud(k); }
  dosyaSil(id: number) { this.davaSilCloud(id); this.silinecekDavaId = null; }

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
      this.icraKaydetCloud(y);
    } else { const g = { ...this.islemGorenIcra, muvekkil: m?.adSoyad || this.islemGorenIcra.muvekkil } as IcraDosyasi; this.icraKaydetCloud(g); }
    this.icraFormKapat();
  }
  icraDurumGuncelle(i: IcraDosyasi, yD: string) { const k = {...i}; k.durum = yD as any; this.icraKaydetCloud(k); }
  icraSil(id: number) { this.icraSilCloud(id); this.silinecekIcraId = null; }

  arabuluculukFormAc(a?: ArabuluculukDosyasi) {
    this.formHata = '';
    if (a) { 
      this.formModu = 'duzenle'; 
      this.islemGorenArabuluculuk = { ...a, taraflar: Array.isArray(a.taraflar) ? a.taraflar.map(t => ({...t})) : [] }; 
    }
    else { this.formModu = 'ekle'; this.islemGorenArabuluculuk = { durum: 'Hazırlık', basvuruTuru: 'Dava Şartı', uyusmazlikTuru: 'İşçi İşveren', buro: 'İstanbul Anadolu', taraflar: [{ id: Date.now(), tip: 'Başvurucu', isim: '' }, { id: Date.now() + 1, tip: 'Diğer Taraf', isim: '' }] }; }
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
      const y: ArabuluculukDosyasi = { id: Date.now(), buroNo: this.islemGorenArabuluculuk.buroNo || '', arabuluculukNo: this.islemGorenArabuluculuk.arabuluculukNo || '', buro: this.islemGorenArabuluculuk.buro || '', basvuruTuru: this.islemGorenArabuluculuk.basvuruTuru as any, uyusmazlikTuru: this.islemGorenArabuluculuk.uyusmazlikTuru as any, taraflar: t, muvekkilId: this.islemGorenArabuluculuk.muvekkilId, toplantiTarihi: this.islemGorenArabuluculuk.toplantiTarihi, toplantiYontemi: this.islemGorenArabuluculuk.toplantiYontemi, durum: this.islemGorenArabuluculuk.durum as any, arsivYeri: this.islemGorenArabuluculuk.arsivYeri || '', vekaletUcreti: this.islemGorenArabuluculuk.vekaletUcreti || 0, notlar: '', finansalIslemler: [], evraklar: [] };
      this.arabuluculukKaydetCloud(y);
    } else { const g = { ...this.islemGorenArabuluculuk, buroNo: this.islemGorenArabuluculuk.buroNo || '', taraflar: t } as ArabuluculukDosyasi; this.arabuluculukKaydetCloud(g); }
    this.arabuluculukFormKapat();
  }
  arabuluculukDurumGuncelle(a: ArabuluculukDosyasi, yD: string) { const k = {...a}; k.durum = yD as any; this.arabuluculukKaydetCloud(k); }
  arabuluculukSil(id: number) { this.arabuluculukSilCloud(id); this.silinecekArabuluculukId = null; }

  muvekkilFormunuAc(m?: Muvekkil) { 
    this.formHata = ''; this.formModu = m ? 'duzenle' : 'ekle'; 
    this.islemGorenMuvekkil = m ? { ...m, yetkililer: Array.isArray(m.yetkililer) ? m.yetkililer.map(y => ({...y})) : [] } : { tip: this.aktifIliskiSekmesi, yetkililer: [] }; 
    this.muvekkilFormAcik = true; 
  }
  muvekkilFormKapat() { this.muvekkilFormAcik = false; this.yetkiliSecimDropdownAcik = false; this.yetkiliSecimArama = ''; }
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
      this.muvekkilKaydetCloud(y);
    } else {
      const g = { ...this.islemGorenMuvekkil, yetkililer: yList, adSoyad: this.islemGorenMuvekkil.adSoyad || '', _isNewDiger: this.islemGorenMuvekkil.tip === 'Diğer', vekaletnameUrl: vUrl } as Muvekkil;
      this.muvekkilKaydetCloud(g);
      this.davalar.forEach(d => { if(d.muvekkilId === g.id && d.muvekkil !== g.adSoyad) { d.muvekkil = g.adSoyad!; this.davaKaydetCloud(d); }});
      this.icralar.forEach(i => { if(i.muvekkilId === g.id && i.muvekkil !== g.adSoyad) { i.muvekkil = g.adSoyad!; this.icraKaydetCloud(i); }});
    }
    this.muvekkilFormKapat();
  }
  muvekkilSil(id: number) {
    if (this.davalar.some(d => d.muvekkilId === id) || this.icralar.some(i => i.muvekkilId === id) || this.arabuluculukDosyalar.some(a => a.muvekkilId === id)) return alert("Önce bu kişi/kuruma ait dosyaları silin.");
    this.muvekkilSilCloud(id); this.silinecekMuvekkilId = null;
  }

  aktifDosyaKaydet(dosya: any) { if (this.aktifSayfa === 'icraDetay') this.icraKaydetCloud(dosya); else if (this.aktifSayfa === 'arabuluculukDetay') this.arabuluculukKaydetCloud(dosya); else this.davaKaydetCloud(dosya); }
  aktifDosyaDurumGuncelle(yD: string) { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.durum = yD; if (this.aktifSayfa === 'detay' && k.durum !== 'İstinaf/Temyiz') k.istinafMahkemesi = ''; this.aktifDosyaKaydet(k); }

  finansalIslemEkle() {
    if (!this.yeniIslem.tutar || !this.yeniIslem.aciklama || !this.aktifDosya) return;
    this.yeniIslem.aciklama = this.formatMetin(this.yeniIslem.aciklama);
    const k: any = {...this.aktifDosya}; if (!k.finansalIslemler) k.finansalIslemler = [];
    k.finansalIslemler.unshift({ id: Date.now(), tarih: this.yeniIslem.tarih || new Date().toISOString().split('T')[0], tur: this.yeniIslem.tur as any, tutar: this.yeniIslem.tutar, aciklama: this.yeniIslem.aciklama || '' });
    this.aktifDosyaKaydet(k); this.yeniIslem = { tur: this.yeniIslem.tur, tarih: new Date().toISOString().split('T')[0], tutar: undefined, aciklama: '' };
  }
  finansalIslemSil(id: number) { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.finansalIslemler = k.finansalIslemler!.filter((i:any) => i.id !== id); this.aktifDosyaKaydet(k); }

  klasorGecis(id: number) { this.acikKlasorler[id] = !this.acikKlasorler[id]; }

  evrakEkle() {
    if (!this.yeniEvrak.isim || !this.yeniEvrak.url) return;
    this.yeniEvrak.isim = this.formatMetin(this.yeniEvrak.isim);
    let url = this.yeniEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const yeni = { id: Date.now(), isim: this.yeniEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), ekler: [], tebligTarihi: this.yeniEvrak.tebligTarihi, sonEylemTarihi: this.yeniEvrak.sonEylemTarihi };
    if (this.aktifSayfa === 'sablonlar') {
      this.sablonlar[this.aktifSablonSekmesi].unshift(yeni); this.sablonlariKaydetCloud();
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (!k.evraklar) k.evraklar = []; k.evraklar.unshift(yeni); this.aktifDosyaKaydet(k);
    }
    this.yeniEvrak = {};
  }
  
  evrakDuzenleBaslat(evrak: EvrakBaglantisi, parentId: number | null = null) { this.duzenlenenEvrakId = evrak.id; this.duzenlenenEvrakParentId = parentId; this.duzenlenenEvrak = { ...evrak }; }
  evrakDuzenleIptal() { this.duzenlenenEvrakId = null; this.duzenlenenEvrakParentId = null; this.duzenlenenEvrak = {}; }
  
  evrakGuncelleKaydet() {
    if (!this.duzenlenenEvrak.isim || !this.duzenlenenEvrak.url) return;
    this.duzenlenenEvrak.isim = this.formatMetin(this.duzenlenenEvrak.isim);
    let url = this.duzenlenenEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url; this.duzenlenenEvrak.url = url;
    if (this.aktifSayfa === 'sablonlar') {
      const sl = this.sablonlar[this.aktifSablonSekmesi];
      if (this.duzenlenenEvrakParentId) { const p = sl.find((e:any) => e.id === this.duzenlenenEvrakParentId); if (p && p.ekler) { const i = p.ekler.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) p.ekler[i] = this.duzenlenenEvrak as EvrakBaglantisi; } } 
      else { const i = sl.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) sl[i] = this.duzenlenenEvrak as EvrakBaglantisi; }
      this.sablonlariKaydetCloud();
    } else {
      if (!this.aktifDosya) return; const k: any = {...this.aktifDosya};
      if (this.duzenlenenEvrakParentId) { const p = k.evraklar!.find((e:any) => e.id === this.duzenlenenEvrakParentId); if (p && p.ekler) { const i = p.ekler.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) p.ekler[i] = this.duzenlenenEvrak as EvrakBaglantisi; } } 
      else { const i = k.evraklar!.findIndex((e:any) => e.id === this.duzenlenenEvrakId); if (i !== -1) k.evraklar![i] = this.duzenlenenEvrak as EvrakBaglantisi; }
      this.aktifDosyaKaydet(k);
    }
    this.evrakDuzenleIptal();
  }
  
  evrakYukari(index: number) { if (index === 0) return; if (this.aktifSayfa === 'sablonlar') { const sl = this.sablonlar[this.aktifSablonSekmesi]; [sl[index - 1], sl[index]] = [sl[index], sl[index - 1]]; this.sablonlariKaydetCloud(); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; [k.evraklar![index - 1], k.evraklar![index]] = [k.evraklar![index], k.evraklar![index - 1]]; this.aktifDosyaKaydet(k); } }
  evrakAsagi(index: number) { if (this.aktifSayfa === 'sablonlar') { const sl = this.sablonlar[this.aktifSablonSekmesi]; if (index === sl.length - 1) return; [sl[index + 1], sl[index]] = [sl[index], sl[index + 1]]; this.sablonlariKaydetCloud(); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; if (index === k.evraklar!.length - 1) return; [k.evraklar![index + 1], k.evraklar![index]] = [k.evraklar![index], k.evraklar![index + 1]]; this.aktifDosyaKaydet(k); } }
  ekEvrakYukari(parent: EvrakBaglantisi, index: number) { if (index === 0) return; if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parent.id); if (p && p.ekler) { [p.ekler[index - 1], p.ekler[index]] = [p.ekler[index], p.ekler[index - 1]]; this.sablonlariKaydetCloud(); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parent.id); if (p && p.ekler) { [p.ekler[index - 1], p.ekler[index]] = [p.ekler[index], p.ekler[index - 1]]; this.aktifDosyaKaydet(k); } } }
  ekEvrakAsagi(parent: EvrakBaglantisi, index: number) { if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parent.id); if (p && p.ekler && index < p.ekler.length - 1) { [p.ekler[index + 1], p.ekler[index]] = [p.ekler[index], p.ekler[index + 1]]; this.sablonlariKaydetCloud(); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parent.id); if (p && p.ekler && index < p.ekler.length - 1) { [p.ekler[index + 1], p.ekler[index]] = [p.ekler[index], p.ekler[index + 1]]; this.aktifDosyaKaydet(k); } } }
  ekEvrakFormAc(parentId: number) { this.ekEklenenEvrakId = parentId; this.yeniEkEvrak = {}; this.evrakDuzenleIptal(); this.acikKlasorler[parentId] = true; }
  ekEvrakFormKapat() { this.ekEklenenEvrakId = null; this.yeniEkEvrak = {}; }
  ekEvrakKaydet(parentId: number) {
    if (!this.yeniEkEvrak.isim || !this.yeniEkEvrak.url) return;
    this.yeniEkEvrak.isim = this.formatMetin(this.yeniEkEvrak.isim);
    let url = this.yeniEkEvrak.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const y = { id: Date.now(), isim: this.yeniEkEvrak.isim || 'İsimsiz', url: url, tarih: new Date().toISOString(), tebligTarihi: this.yeniEkEvrak.tebligTarihi, sonEylemTarihi: this.yeniEkEvrak.sonEylemTarihi };
    if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); this.sablonlariKaydetCloud(); } } 
    else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parentId); if (p) { if (!p.ekler) p.ekler = []; p.ekler.push(y); this.aktifDosyaKaydet(k); } }
    this.ekEvrakFormKapat();
  }
  evrakSil(id: number) { if (this.aktifSayfa === 'sablonlar') { this.sablonlar[this.aktifSablonSekmesi] = this.sablonlar[this.aktifSablonSekmesi].filter((e:any) => e.id !== id); this.sablonlariKaydetCloud(); } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; k.evraklar = k.evraklar!.filter((e:any) => e.id !== id); this.aktifDosyaKaydet(k); } }
  ekEvrakSil(parentId: number, ekId: number) { if (this.aktifSayfa === 'sablonlar') { const p = this.sablonlar[this.aktifSablonSekmesi].find((e:any) => e.id === parentId); if (p && p.ekler) { p.ekler = p.ekler.filter((e:any) => e.id !== ekId); this.sablonlariKaydetCloud(); } } else { if(!this.aktifDosya) return; const k: any = {...this.aktifDosya}; const p = k.evraklar!.find((e:any) => e.id === parentId); if (p && p.ekler) { p.ekler = p.ekler.filter((e:any) => e.id !== ekId); this.aktifDosyaKaydet(k); } } }

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
  
  getDurumClass(d: string) { return d === 'Derdest' ? 'bg-green-100 text-green-700 border-green-200' : d === 'İstinaf/Temyiz' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
  getIcraDurumClass(d: string) { return d === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : d === 'İtiraz Edildi' ? 'bg-orange-100 text-orange-700 border-orange-200' : d === 'Tehir-i İcra' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
  getArabuluculukDurumClass(d: string) { return d === 'Hazırlık' ? 'bg-slate-100 text-slate-700 border-slate-200' : d === 'Müzakere' ? 'bg-blue-100 text-blue-700 border-blue-200' : d === 'İmza' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : d === 'Tahsilat' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'; }
  getPozisyonClass(p?: string) { return p === 'Davacı' ? 'bg-emerald-50 text-emerald-600' : p === 'Davalı' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'; }
  
  formatTarih(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'; }
  formatTarihGun(str?: string) { return str ? new Date(str).getDate().toString() : ''; }
  formatTarihAy(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { month: 'short' }) : ''; }
  formatTarihKisa(str?: string) { return str ? new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; }
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