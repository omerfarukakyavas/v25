// Isolated UI fixture. This entry is excluded from normal builds and never initializes Firebase.
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '../src/app/app.component';
import type { DavaDosyasi } from '../src/app.models';
import type { User } from 'firebase/auth';

AppComponent.prototype.ngOnInit = function () {
  this.authInitialized = true;
  this.user = { uid: 'offline-ui-test', email: 'yerel-test@example.invalid' } as User;
  this.aktifSayfa = 'davalar';
  this.davalar = [{
    id: 1001, dosyaTuru: 'sorusturma', mahkeme: 'Örnek Cumhuriyet Başsavcılığı',
    dosyaNo: 'SORUŞTURMA: 2026/123', dosyaNumaralari: [{ tur: 'SORUŞTURMA', no: '2026/123' }],
    muvekkil: 'Çağrı Şen (Örnek)', karsiTaraf: 'Şikâyetçi: Ece Işık (Örnek)', konu: 'Yalnızca arayüz testi', durum: 'Derdest',
    cezaTaraflari: [
      { id: 1, isim: 'Çağrı Şen (Örnek)', rol: 'Şüpheli', muvekkilMi: true },
      { id: 2, isim: 'Ece Işık (Örnek)', rol: 'Şikâyetçi', muvekkilMi: false }
    ], finansalIslemler: [], evraklar: [], takipTarihi: '2026-09-07'
  }];
  document.title = 'YEREL TEST - Ceza ve Soruşturma';
  const banner = document.createElement('div');
  banner.textContent = 'YEREL TEST: Örnek veriler. Firebase bağlantısı yok. Sayfa yenilenince sıfırlanır.';
  Object.assign(banner.style, { position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999', background: '#fef3c7', color: '#111827', padding: '6px', textAlign: 'center', fontSize: '12px' });
  document.body.appendChild(banner);
};
AppComponent.prototype.davaKaydetCloud = async function (dosya: DavaDosyasi) {
  const copy = structuredClone(dosya);
  this.davalar = [...this.davalar.filter(d => d.id !== copy.id), copy];
  if (this.seciliDava?.id === copy.id) this.seciliDava = copy;
  return true;
};
const tailwind = document.createElement('script');
tailwind.src = 'https://cdn.tailwindcss.com/3.4.17';
document.head.appendChild(tailwind);
bootstrapApplication(AppComponent);
