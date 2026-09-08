import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CezaTarafKaydi, DavaDosyaTuru, Muvekkil } from '../app.models';
import { cezaTarafRolleri } from './ceza-dosyalari';

@Component({
  selector: 'app-ceza-taraf-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ceza-taraf-form.component.html',
  styles: [`
    :host { display: block; color: #0f172a; }
    h4 { font-size: 16px; font-weight: 700; }
    .party-card { margin-top: 16px; padding: 16px; border: 2px solid #cbd5e1; border-radius: 16px; background: #f8fafc; }
    .party-card.client { border-color: #059669; background: #ecfdf5; }
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
    label { display: block; font: inherit; font-size: 13px; font-weight: 700; }
    input:not([type=checkbox]), select, textarea { display: block; box-sizing: border-box; width: 100%; min-width: 0; margin-top: 5px; border: 1px solid #94a3b8; border-radius: 8px; padding: 10px; font: inherit; font-size: 14px; color: #0f172a; background: white; }
    input:focus, select:focus, textarea:focus { outline: 2px solid #2563eb; outline-offset: 2px; }
    .wide { grid-column: 1 / -1; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .check { display: flex; align-items: center; gap: 8px; min-height: 44px; }
    .check input { width: 18px; height: 18px; accent-color: #047857; }
    button { border: 1px solid #94a3b8; background: white; color: #0f172a; border-radius: 8px; padding: 10px 14px; font: inherit; font-weight: 700; font-size: 13px; }
    .remove { color: #b91c1c; border-color: #fca5a5; }
    p { font-size: 13px; line-height: 1.6; margin-top: 8px; }
    @media(max-width: 600px) { .fields { grid-template-columns: minmax(0, 1fr); } .party-card { padding: 12px; } }
  `]
})
export class CezaTarafFormComponent {
  @Input() taraflar: CezaTarafKaydi[] = [];
  @Input() dosyaTuru?: DavaDosyaTuru;
  @Input() kisiler: Muvekkil[] = [];
  @Output() kisiSecildi = new EventEmitter<{ taraf: CezaTarafKaydi; id?: number }>();
  @Output() isimDegisti = new EventEmitter<{ taraf: CezaTarafKaydi; isim: string }>();
  @Output() ekle = new EventEmitter<void>();
  aramalar: Record<number, string> = {};
  get roller() { return cezaTarafRolleri(this.dosyaTuru); }

  secenekler(taraf: CezaTarafKaydi) {
    const arama = (this.aramalar[taraf.id] || '').trim().toLocaleLowerCase('tr-TR');
    return this.kisiler.filter(k => k.id === taraf.muvekkilId || `${k.adSoyad} ${k.tcKimlik} ${k.telefon}`.toLocaleLowerCase('tr-TR').includes(arama));
  }
}
