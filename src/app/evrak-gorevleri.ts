import { EvrakBaglantisi, EvrakGorevi } from '../app.models';

export function evrakGoreviGecerliTarih(deger?: string): string {
  if (!deger || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) return '';
  const tarih = new Date(`${deger}T12:00:00Z`);
  return Number.isFinite(tarih.getTime()) && tarih.toISOString().slice(0, 10) === deger ? deger : '';
}

export interface EvrakGoreviKaydi {
  evrak: EvrakBaglantisi;
  gorev: EvrakGorevi;
  tarih: string;
  anaEvrakIsmi: string;
}

// A task's date overrides the nearest document deadline. No synthetic date is assigned.
export function evrakGorevleriniListele(evraklar: EvrakBaglantisi[] = [], ustTarih = '', yol: string[] = []): EvrakGoreviKaydi[] {
  return evraklar.flatMap(evrak => {
    const evrakTarihi = evrakGoreviGecerliTarih(evrak.sonEylemTarihi) || ustTarih;
    const gorevler = (evrak.gorevler || []).map(gorev => ({
      evrak, gorev,
      tarih: evrakGoreviGecerliTarih(gorev.tarih) || evrakTarihi,
      anaEvrakIsmi: yol.join(' / ')
    }));
    return [...gorevler, ...evrakGorevleriniListele(evrak.ekler, evrakTarihi, [...yol, evrak.isim])];
  });
}
