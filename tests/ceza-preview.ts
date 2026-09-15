// Isolated UI fixture. This entry is excluded from normal builds and never initializes Firebase.
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '../src/app/app.component';
import type { ArabuluculukDosyasi, DavaDosyasi, Muvekkil } from '../src/app.models';
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
  if (new URLSearchParams(location.search).has('evrak')) {
    this.aktifSayfa = 'ajanda';
    const tarih = this.gunBazliIsoTarih(new Date());
    this.davalar[0].evraklar = [
      { id: 20, isim: 'Örnek ara karar', url: 'https://example.invalid/karar', tarih: '',
        gorevler: [{ id: 30, metin: 'Müvekkilden bilgi iste' }, { id: 31, metin: 'İstinaf dilekçesini hazırla', tarih }],
        ekler: [{ id: 21, isim: 'Örnek bilirkişi raporu', url: 'https://example.invalid/rapor', tarih: '', sonEylemTarihi: tarih,
          gorevler: [{ id: 32, metin: 'Rapora itirazları incele' }] }]
      }
    ];
    document.title = 'YEREL TEST - Evrak Görevleri';
  }
  if (new URLSearchParams(location.search).has('iletisim')) {
    this.muvekkiller = [
      { id: 1, adSoyad: 'Çağrı Şen (Örnek)', telefon: '0500 000 00 01', eposta: 'cagri@example.invalid' },
      { id: 2, adSoyad: 'Av. Ece Işık (Örnek)', telefon: '0500 000 00 02', eposta: 'ece@example.invalid' }
    ] as Muvekkil[];
    this.arabuluculukDosyalar = [{
      id: 2001, buroNo: '2026/12', arabuluculukNo: '2026/345', buro: 'Örnek Büro', basvuruTuru: 'İhtiyari', uyusmazlikTuru: 'Ticari', durum: 'Müzakere',
      taraflar: [
        { id: 1, tip: 'Başvurucu', isim: 'Çağrı Şen (Örnek)', muvekkilId: 1, telefon: '0500 000 00 09', vekilMuvekkilId: 2, vekil: 'Av. Ece Işık (Örnek)' },
        { id: 2, tip: 'Diğer Taraf', isim: 'Örnek Şirket A.Ş.' }
      ], finansalIslemler: [], evraklar: [], iletisimNotlari: []
    }];
    this.seciliArabuluculuk = this.arabuluculukDosyalar[0];
    this.aktifSayfa = 'arabuluculukDetay';
    this.aktifDetaySekmesi = 'iletisimNotlari';
    document.title = 'YEREL TEST - İletişim Kişileri';
  }
  if (new URLSearchParams(location.search).has('takvim')) {
    const tarih = this.gunBazliIsoTarih(new Date());
    this.aktifSayfa = 'dashboard';
    this.davalar.push({
      id: 1002, dosyaTuru: 'hukuk', mahkeme: 'Örnek Hukuk Mahkemesi', dosyaNo: '2026/456', muvekkil: 'Deniz (Örnek)', karsiTaraf: 'Örnek Şirket', konu: 'Örnek duruşma', durum: 'Derdest', durusmaTarihi: tarih, durusmaSaati: '09:30',
      evraklar: [{ id: 41, isim: 'Örnek ara karar', url: '', tarih, sonEylemTarihi: tarih, gorevler: [{ id: 42, metin: 'Belgeleri hazırla', tarih }] }]
    });
    this.arabuluculukDosyalar = [{
      id: 2001, buroNo: '2026/12', arabuluculukNo: '2026/345', buro: 'Örnek Büro', basvuruTuru: 'İhtiyari', uyusmazlikTuru: 'Ticari', durum: 'Müzakere',
      taraflar: [{ id: 1, tip: 'Başvurucu', isim: 'Örnek Başvurucu' }, { id: 2, tip: 'Diğer Taraf', isim: 'Örnek Şirket' }], toplantiTarihi: tarih, toplantiSaati: '14:00'
    }];
    this.ofisGorevleri = [{ id: 301, baslik: 'Örnek ofis görevi', tarih, saat: '16:30', oncelik: 'Normal', kayitTarihi: new Date().toISOString() }];
    document.title = 'YEREL TEST - Genel Özet Takvimi';
  }
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
AppComponent.prototype.arabuluculukKaydetCloud = async function (dosya: ArabuluculukDosyasi) {
  const copy = structuredClone(dosya);
  this.arabuluculukDosyalar = [...this.arabuluculukDosyalar.filter(d => d.id !== copy.id), copy];
  if (this.seciliArabuluculuk?.id === copy.id) this.seciliArabuluculuk = copy;
  return true;
};
tailwind.src = 'https://cdn.tailwindcss.com/3.4.17';
document.head.appendChild(tailwind);
bootstrapApplication(AppComponent);
