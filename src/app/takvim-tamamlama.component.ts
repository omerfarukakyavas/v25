import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SonrakiOturum, TakvimTamamlamaIstegi } from './takvim-oturumlari';

@Component({
  selector: 'app-takvim-tamamlama',
  standalone: true,
  imports: [FormsModule],
  template: `
    <dialog #pencere aria-labelledby="oturum-basligi" aria-describedby="oturum-aciklama" (cancel)="iptalEt($event)">
      <form (ngSubmit)="kaydet.emit(yeniTarihMi ? { tarih, saat } : null)">
        <h2 id="oturum-basligi">{{ istek.tur }} tamamlanıyor</h2>
        <p class="dosya">{{ istek.dosyaOzeti }}</p>
        <p>Tamamlanan tarih: <strong>{{ istek.tarih.split('-').reverse().join('.') }}{{ istek.saat ? ' / ' + istek.saat : '' }}</strong></p>
        <p id="oturum-aciklama">{{ istek.tur === 'Duruşma' ? 'Yeni duruşma günü girmek ister misiniz?' : 'Yeni toplantı günü girmek ister misiniz?' }}</p>
        <p class="aciklama">Mevcut tarih gerçekleşti olarak geçmişte saklanacak. Yeni tarih girerseniz ajandada yeni bir kayıt olarak izlenecek.</p>
        <fieldset [disabled]="kaydediliyor">
          <legend class="sr-only">Yeni tarih tercihi</legend>
          <div class="secenekler">
            <label><input type="radio" name="tercih" [value]="false" [(ngModel)]="yeniTarihMi"> Yeni tarih yok</label>
            <label><input type="radio" name="tercih" [value]="true" [(ngModel)]="yeniTarihMi"> Yeni tarih ekle</label>
          </div>
          @if (yeniTarihMi) {
            <div class="alanlar">
              <label>Yeni {{ istek.tur === 'Duruşma' ? 'duruşma' : 'toplantı' }} tarihi
                <input type="date" name="tarih" required [min]="istek.tarih" [(ngModel)]="tarih">
              </label>
              <label>Saat (isteğe bağlı)<input type="time" name="saat" [(ngModel)]="saat"></label>
            </div>
          }
        </fieldset>
        @if (hata) { <p class="hata" role="alert">{{ hata }}</p> }
        <footer>
          <button type="button" (click)="iptal.emit()" [disabled]="kaydediliyor" autofocus>İptal</button>
          <button type="submit" class="kaydet" [disabled]="kaydediliyor || (yeniTarihMi && !tarih)">{{ kaydediliyor ? 'Kaydediliyor…' : (yeniTarihMi ? 'Tamamla ve Yeni Tarihi Kaydet' : 'Yeni Tarih Yok, Tamamla') }}</button>
        </footer>
      </form>
    </dialog>
  `,
  styles: [`
    dialog { position: fixed; inset: 0; margin: auto; width: min(560px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); padding: 24px; overflow-y: auto; border: 1px solid #94a3b8; border-radius: 18px; background: #fff; color: #0f172a; box-shadow: 0 20px 60px #0f172a40; font-family: var(--app-font-sans, sans-serif); }
    dialog::backdrop { background: #0f172a80; }
    h2 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { font-size: 14px; line-height: 1.6; margin: 12px 0; }
    .dosya { font-weight: 600; overflow-wrap: anywhere; }
    .aciklama { color: #475569; }
    fieldset { border: 0; padding: 0; margin: 18px 0; min-width: 0; }
    .secenekler, .alanlar { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .secenekler label { border: 1px solid #94a3b8; border-radius: 10px; padding: 12px; display: flex; align-items: center; gap: 8px; }
    .secenekler label:has(input:checked) { background: #eff6ff; border-color: #2563eb; }
    label { font-size: 14px; font-weight: 600; }
    .alanlar { margin-top: 16px; }
    .alanlar input { display: block; box-sizing: border-box; width: 100%; min-width: 0; margin-top: 6px; padding: 10px; font: inherit; border: 1px solid #94a3b8; border-radius: 8px; background: #fff; }
    .hata { background: #fff1f2; color: #9f1239; padding: 12px; border-radius: 8px; }
    footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    button { padding: 12px 16px; border: 1px solid #94a3b8; border-radius: 10px; font: inherit; font-weight: 600; background: #fff; color: #0f172a; cursor: pointer; }
    button.kaydet { background: #1d4ed8; color: #fff !important; border-color: #1d4ed8; }
    button:disabled { opacity: .55; cursor: default; }
    :focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
    @media (max-width: 480px) { dialog { padding: 18px; } .alanlar { grid-template-columns: 1fr; } footer button { width: 100%; } }
  `]
})
export class TakvimTamamlamaComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) istek!: TakvimTamamlamaIstegi;
  @Input() kaydediliyor = false;
  @Input() hata = '';
  @Output() kaydet = new EventEmitter<SonrakiOturum | null>();
  @Output() iptal = new EventEmitter<void>();
  @ViewChild('pencere', { static: true }) pencere!: ElementRef<HTMLDialogElement>;
  yeniTarihMi = false;
  tarih = '';
  saat = '';
  ngAfterViewInit() { this.pencere.nativeElement.showModal(); }
  ngOnDestroy() { this.pencere.nativeElement.close(); }
  iptalEt(event: Event) {
    event.preventDefault();
    if (!this.kaydediliyor) this.iptal.emit();
  }
}
