import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { Unsubscribe, collection, doc, getDoc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';

import { PortalDosyaKaydi, PortalProfil } from '../app.models';
import { appId, getFirebaseConfig } from '../firebase.config';

type PortalEkrani = 'yukleniyor' | 'giris' | 'dogrulama' | 'portal' | 'engelli';

@Component({
  selector: 'app-muvekkil-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './muvekkil-portal.component.html',
  styleUrls: ['./muvekkil-portal.component.css']
})
export class MuvekkilPortalComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly davetTokeni = new URLSearchParams(window.location.search).get('portal') || '';
  private authUnsubscribe?: Unsubscribe;
  private dosyaUnsubscribe?: Unsubscribe;
  private authBaslatmaZamanlayicisi?: number;

  app: any;
  auth: any;
  db: any;
  user: User | null = null;
  ekran: PortalEkrani = 'yukleniyor';
  girisModu: 'giris' | 'kayit' = this.davetTokeni && this.davetTokeni !== '1' ? 'kayit' : 'giris';
  email = '';
  sifre = '';
  adSoyad = '';
  islemYapiliyor = false;
  hata = '';
  bilgi = '';
  profil: PortalProfil | null = null;
  dosyalar: PortalDosyaKaydi[] = [];
  acikDosyaId: string | null = null;

  ngOnInit() {
    try {
      this.app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.authBaslatmaZamanlayicisi = window.setTimeout(() => {
        if (this.ekran !== 'yukleniyor') return;
        this.ekran = 'engelli';
        this.hata = 'Portal oturumu başlatılamadı. Giriş ekranına dönüp tekrar deneyin.';
        this.cdr.detectChanges();
      }, 10000);
      this.authUnsubscribe = onAuthStateChanged(this.auth, async (user: User | null) => {
        if (this.authBaslatmaZamanlayicisi) window.clearTimeout(this.authBaslatmaZamanlayicisi);
        this.user = user;
        this.hata = '';
        this.bilgi = '';
        this.dosyaUnsubscribe?.();
        this.dosyaUnsubscribe = undefined;
        this.dosyalar = [];
        this.profil = null;

        if (!user) {
          this.ekran = 'giris';
          this.cdr.detectChanges();
          return;
        }

        try {
          await this.portalOturumunuHazirla(user);
        } catch {
          this.ekran = 'engelli';
          this.hata = 'Portal bilgileri alınamadı. İnternet bağlantınızı kontrol edip sayfayı yenileyin.';
          this.cdr.detectChanges();
        }
      });
    } catch {
      this.ekran = 'engelli';
      this.hata = 'Müvekkil portalı başlatılamadı. Lütfen daha sonra tekrar deneyin.';
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.authUnsubscribe?.();
    this.dosyaUnsubscribe?.();
    if (this.authBaslatmaZamanlayicisi) window.clearTimeout(this.authBaslatmaZamanlayicisi);
  }

  async girisVeyaKayit() {
    const email = this.email.trim().toLowerCase();
    if (!email || !this.sifre) {
      this.hata = 'E-posta ve şifre alanlarını doldurun.';
      return;
    }
    if (this.girisModu === 'kayit' && (!this.davetTokeni || this.davetTokeni === '1')) {
      this.hata = 'Yeni portal hesabı yalnızca hukuk bürosunun gönderdiği davet bağlantısıyla açılabilir.';
      return;
    }

    this.islemYapiliyor = true;
    this.hata = '';
    this.bilgi = '';
    try {
      if (this.girisModu === 'kayit') {
        const sonuc = await createUserWithEmailAndPassword(this.auth, email, this.sifre);
        if (this.adSoyad.trim()) await updateProfile(sonuc.user, { displayName: this.adSoyad.trim() });
        await sendEmailVerification(sonuc.user);
        this.ekran = 'dogrulama';
        this.bilgi = 'Doğrulama bağlantısı e-posta adresinize gönderildi.';
      } else {
        await signInWithEmailAndPassword(this.auth, email, this.sifre);
      }
    } catch (error: any) {
      this.hata = this.authHataMesaji(error);
    } finally {
      this.islemYapiliyor = false;
      this.cdr.detectChanges();
    }
  }

  async dogrulamaMailiniYenidenGonder() {
    if (!this.auth.currentUser) return;
    this.islemYapiliyor = true;
    this.hata = '';
    try {
      await sendEmailVerification(this.auth.currentUser);
      this.bilgi = 'Doğrulama e-postası yeniden gönderildi.';
    } catch (error: any) {
      this.hata = this.authHataMesaji(error);
    } finally {
      this.islemYapiliyor = false;
      this.cdr.detectChanges();
    }
  }

  async dogrulamayiKontrolEt() {
    const kullanici = this.auth.currentUser as User | null;
    if (!kullanici) return;
    this.islemYapiliyor = true;
    this.hata = '';
    try {
      await kullanici.reload();
      await kullanici.getIdToken(true);
      this.user = this.auth.currentUser;
      if (!this.user?.emailVerified) {
        this.hata = 'E-posta henüz doğrulanmamış görünüyor. Bağlantıya tıkladıktan sonra tekrar deneyin.';
        return;
      }
      await this.portalOturumunuHazirla(this.user);
    } catch (error: any) {
      this.hata = this.authHataMesaji(error);
    } finally {
      this.islemYapiliyor = false;
      this.cdr.detectChanges();
    }
  }

  async sifremiUnuttum() {
    const email = this.email.trim().toLowerCase();
    if (!email) {
      this.hata = 'Önce e-posta adresinizi yazın.';
      return;
    }
    this.islemYapiliyor = true;
    this.hata = '';
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.bilgi = 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.';
    } catch (error: any) {
      this.hata = this.authHataMesaji(error);
    } finally {
      this.islemYapiliyor = false;
      this.cdr.detectChanges();
    }
  }

  async cikisYap() {
    await signOut(this.auth);
  }

  dosyaAcKapat(dosyaId: string) {
    this.acikDosyaId = this.acikDosyaId === dosyaId ? null : dosyaId;
  }

  formatTarih(tarih?: string) {
    if (!tarih) return '-';
    const parcalar = tarih.split('-');
    if (parcalar.length !== 3) return tarih;
    return `${parcalar[2]}.${parcalar[1]}.${parcalar[0]}`;
  }

  turEtiketi(tur: PortalDosyaKaydi['tur']) {
    if (tur === 'dava') return 'Dava';
    if (tur === 'icra') return 'İcra';
    return 'Arabuluculuk';
  }

  guvenliUrl(url?: string) {
    const temiz = (url || '').trim();
    return /^https?:\/\//i.test(temiz) ? temiz : '#';
  }

  private async portalOturumunuHazirla(user: User) {
    this.ekran = 'yukleniyor';
    this.cdr.detectChanges();
    const profilRef = doc(this.db, 'artifacts', appId, 'portalProfiles', user.uid);
    const profilBelgesi = await this.zamanAsimli(getDoc(profilRef));

    if (profilBelgesi.exists()) {
      const profil = profilBelgesi.data() as PortalProfil;
      await this.portalProfiliniYukle(profil);
      return;
    }

    if (!this.davetTokeni || this.davetTokeni === '1') {
      this.ekran = 'engelli';
      this.hata = 'Bu hesap henüz bir müvekkil kaydıyla eşleştirilmemiş. Hukuk bürosundan yeni portal daveti isteyin.';
      return;
    }

    if (!user.emailVerified) {
      this.ekran = 'dogrulama';
      this.bilgi = 'Portal erişimi için e-posta adresinizi doğrulayın.';
      return;
    }

    try {
      const davetBelgesi = await this.zamanAsimli(getDoc(doc(this.db, 'artifacts', appId, 'portalInvites', this.davetTokeni)));
      if (!davetBelgesi.exists()) throw new Error('invite-not-found');
      const davet = davetBelgesi.data() as any;
      const profil: PortalProfil & { inviteToken: string } = {
        uid: user.uid,
        accessId: String(davet.accessId || ''),
        ownerUid: String(davet.ownerUid || ''),
        muvekkilId: String(davet.muvekkilId || ''),
        adSoyad: String(davet.adSoyad || user.displayName || ''),
        email: String(user.email || '').toLowerCase(),
        olusturmaTarihi: new Date().toISOString(),
        inviteToken: this.davetTokeni
      };
      await setDoc(profilRef, profil);
      window.history.replaceState({}, '', `${window.location.pathname}?portal=1`);
      await this.portalProfiliniYukle(profil);
    } catch {
      this.ekran = 'engelli';
      this.hata = 'Davet bağlantısı geçersiz, süresi dolmuş veya farklı bir e-posta adresi için hazırlanmış.';
    }
  }

  private async portalProfiliniYukle(profil: PortalProfil) {
    const accessBelgesi = await this.zamanAsimli(getDoc(doc(this.db, 'artifacts', appId, 'portalAccess', profil.accessId)));
    const access = accessBelgesi.data();
    const profilEpostasi = String(profil.email || '').trim().toLowerCase();
    const hesapEpostasi = String(this.user?.email || '').trim().toLowerCase();
    const erisimEpostasi = String(access?.['email'] || '').trim().toLowerCase();
    if (!accessBelgesi.exists() || access?.['aktif'] !== true || !profilEpostasi || profilEpostasi !== hesapEpostasi || profilEpostasi !== erisimEpostasi) {
      this.ekran = 'engelli';
      this.hata = 'Portal erişiminiz şu anda kapalı. Hukuk bürosuyla iletişime geçebilirsiniz.';
      return;
    }

    this.profil = profil;
    this.ekran = 'portal';
    this.dosyaUnsubscribe = onSnapshot(
      collection(this.db, 'artifacts', appId, 'portalOwners', profil.ownerUid, 'clients', profil.muvekkilId, 'cases'),
      snapshot => {
        this.dosyalar = snapshot.docs
          .map(kayit => ({ id: kayit.id, ...kayit.data() }) as PortalDosyaKaydi)
          .sort((a, b) => (b.guncellemeTarihi || '').localeCompare(a.guncellemeTarihi || ''));
        this.cdr.detectChanges();
      },
      () => {
        this.hata = 'Dosya bilgileri alınamadı. Lütfen sayfayı yenileyin.';
        this.cdr.detectChanges();
      }
    );
  }

  private zamanAsimli<T>(islem: Promise<T>, sureMs = 12000): Promise<T> {
    return Promise.race([
      islem,
      new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('portal-timeout')), sureMs))
    ]);
  }

  private authHataMesaji(error: any) {
    const kod = String(error?.code || error?.message || '');
    if (kod.includes('email-already-in-use')) return 'Bu e-posta adresiyle daha önce hesap oluşturulmuş. Giriş yapmayı deneyin.';
    if (kod.includes('weak-password')) return 'Şifre en az 6 karakter olmalı.';
    if (kod.includes('invalid-email')) return 'Geçerli bir e-posta adresi yazın.';
    if (kod.includes('invalid-credential') || kod.includes('wrong-password') || kod.includes('user-not-found')) return 'E-posta veya şifre hatalı.';
    if (kod.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar deneyin.';
    if (kod.includes('network-request-failed')) return 'İnternet bağlantısı kurulamadı.';
    return 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.';
  }
}
