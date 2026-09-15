import { Component, EventEmitter, Input, Output, type OnChanges, type SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IletisimKisiBilgisi, IletisimKisiSecenegi } from './iletisim-kisileri';

@Component({
  selector: 'app-iletisim-kisi-secici',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section aria-label="İletişim kişisi seçimi">
      <div class="modes" role="group" aria-label="Kişi giriş yöntemi">
        <button type="button" [attr.aria-pressed]="mod === 'dosya'" (click)="modDegistir('dosya')">Dosyadan seç</button>
        <button type="button" [attr.aria-pressed]="mod === 'manuel'" (click)="modDegistir('manuel')">Manuel giriş</button>
      </div>
      @if (mod === 'dosya') {
        @if (secenekler.length) {
          <div class="fields">
            <label>Taraf veya vekil ara
              <input type="search" [(ngModel)]="arama" placeholder="Ad, unvan, telefon veya e-posta">
            </label>
            <label>Dosyadaki taraf / vekil
              <select [ngModel]="seciliAnahtar" (ngModelChange)="sec($event)">
                <option value="" disabled>Kişi seçin</option>
                @for (kisi of filtrelenmisSecenekler; track kisi.anahtar) {
                  <option [value]="kisi.anahtar">{{ kisi.rol }}: {{ kisi.kisi }}</option>
                }
              </select>
            </label>
          </div>
          @if (!eslesenSayisi) { <p role="status">Aramanıza uygun kişi bulunamadı. Manuel giriş yapabilirsiniz.</p> }
          @if (seciliKisi; as kisi) {
            <div class="fields">
              @if (kisi.telefonlar.length > 1) {
                <label>Kayıtlı telefon seçenekleri
                  <select [ngModel]="telefon" (ngModelChange)="iletisimSec('telefon', $event)">
                    @for (deger of kisi.telefonlar; track deger) { <option [value]="deger">{{ deger }}</option> }
                  </select>
                </label>
              }
              @if (kisi.epostalar.length > 1) {
                <label>Kayıtlı e-posta seçenekleri
                  <select [ngModel]="eposta" (ngModelChange)="iletisimSec('eposta', $event)">
                    @for (deger of kisi.epostalar; track deger) { <option [value]="deger">{{ deger }}</option> }
                  </select>
                </label>
              }
            </div>
            <p role="status">Bilgiler forma aktarıldı. Eksik bilgileri tamamlayabilir, aşağıdaki alanları düzenleyebilirsiniz. Kişinin ana kaydı değişmez.</p>
          } @else {
            <p>Yalnızca bu dosyanın tarafları ve kayıtlı vekilleri listelenir. Seçimle ad, telefon ve e-posta doldurulur.</p>
          }
        } @else {
          <p role="status">Bu dosyada seçilebilecek kişi bulunamadı. Manuel giriş ile devam edebilirsiniz.</p>
        }
      } @else {
        <p>Kişi adı ve iletişim bilgilerini aşağıdaki alanlara kendiniz yazabilirsiniz.</p>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    section { padding: 14px; border: 1px solid #67b7c5; border-radius: 12px; background: #f0fbfd; color: #0f172a; }
    .modes { display: flex; flex-wrap: wrap; gap: 8px; }
    button { min-height: 42px; padding: 9px 16px; border: 1px solid #6a94a0; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 700; background: white; color: #164e63; }
    button[aria-pressed=true] { background: #155e75; border-color: #155e75; color: white; }
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    label { display: block; min-width: 0; margin-top: 12px; font: inherit; font-size: 13px; font-weight: 700; }
    input, select { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; margin-top: 6px; padding: 10px; border: 1px solid #94a3b8; border-radius: 8px; background: white; color: #0f172a; font: inherit; font-weight: 400; font-size: 14px; }
    input::placeholder { color: #526476; }
    button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }
    p { margin: 10px 0 0; font-size: 13px; line-height: 1.6; color: #334155; }
    @media(max-width: 600px) { .fields { grid-template-columns: minmax(0, 1fr); } input, select { font-size: 16px; } }
  `]
})
export class IletisimKisiSeciciComponent implements OnChanges {
  @Input() secenekler: IletisimKisiSecenegi[] = [];
  @Input() sifirlamaAnahtari = 0;
  @Input() manuelBasla = false;
  @Output() kisiSecildi = new EventEmitter<IletisimKisiBilgisi>();
  mod: 'dosya' | 'manuel' = 'dosya';
  arama = '';
  seciliAnahtar = '';
  telefon = '';
  eposta = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sifirlamaAnahtari'] || changes['manuelBasla'] || changes['secenekler']?.firstChange) {
      this.mod = this.manuelBasla || !this.secenekler.length ? 'manuel' : 'dosya';
      this.seciliAnahtar = ''; this.arama = ''; this.telefon = ''; this.eposta = '';
    }
  }
  get seciliKisi() { return this.secenekler.find(k => k.anahtar === this.seciliAnahtar); }
  private eslesir(kisi: IletisimKisiSecenegi) {
    return `${kisi.rol} ${kisi.kisi} ${kisi.telefonlar.join(' ')} ${kisi.epostalar.join(' ')}`.toLocaleLowerCase('tr-TR').includes(this.arama.trim().toLocaleLowerCase('tr-TR'));
  }
  get filtrelenmisSecenekler() { return this.secenekler.filter(k => k.anahtar === this.seciliAnahtar || this.eslesir(k)); }
  get eslesenSayisi() { return this.secenekler.filter(k => this.eslesir(k)).length; }
  modDegistir(mod: 'dosya' | 'manuel') {
    this.mod = mod;
    this.seciliAnahtar = '';
    this.arama = '';
    // Switching modes leaves the draft intact; only an explicit person selection replaces contacts.
  }
  sec(anahtar: string) {
    const kisi = this.secenekler.find(k => k.anahtar === anahtar);
    if (!kisi) return;
    this.seciliAnahtar = anahtar;
    this.telefon = kisi.telefonlar[0] || '';
    this.eposta = kisi.epostalar[0] || '';
    this.kisiSecildi.emit({ kisi: kisi.kisi, telefon: this.telefon, eposta: this.eposta });
  }
  iletisimSec(alan: 'telefon' | 'eposta', deger: string) {
    const secenekler = alan === 'telefon' ? this.seciliKisi?.telefonlar : this.seciliKisi?.epostalar;
    if (!secenekler?.includes(deger)) return;
    this[alan] = deger;
    this.kisiSecildi.emit({ [alan]: deger });
  }
}
