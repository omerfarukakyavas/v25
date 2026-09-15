import type { ArabuluculukDosyasi, DavaDosyasi, DavaTarafKaydi, IcraDosyasi, Muvekkil } from '../app.models';

export interface IletisimKisiSecenegi {
  anahtar: string;
  kisi: string;
  rol: string;
  telefonlar: string[];
  epostalar: string[];
}

export type IletisimKisiBilgisi = Partial<{ kisi: string; telefon: string; eposta: string }>;
const temiz = (deger?: string) => {
  const metin = (deger || '').replace(/\s+/g, ' ').trim();
  return /^(belirtilmedi|-)$/.test(metin.toLocaleLowerCase('tr-TR')) ? '' : metin;
};
const isimAnahtari = (deger?: string) => temiz(deger).toLocaleLowerCase('tr-TR');
const tekKayit = (kayitlar: Muvekkil[]) => kayitlar.length === 1 ? kayitlar[0] : undefined;

function kayitBul(taraf: Partial<DavaTarafKaydi>, kisiler: Muvekkil[]) {
  // Explicit identity wins. An ambiguous name or a stale ID must never borrow another person's details.
  if (taraf.muvekkilId != null) return tekKayit(kisiler.filter(k => k.id === taraf.muvekkilId));
  const tc = temiz(taraf.tcKimlikVergiNo);
  if (tc) return tekKayit(kisiler.filter(k => temiz(k.tcKimlik) === tc));
  const isim = isimAnahtari(taraf.isim);
  return isim ? tekKayit(kisiler.filter(k => isimAnahtari(k.adSoyad) === isim)) : undefined;
}

function benzersiz(degerler: (string | undefined)[], telefon = false) {
  const sonuc = new Map<string, string>();
  for (const deger of degerler) {
    const metin = temiz(deger);
    const anahtar = telefon ? metin.replace(/\D/g, '') : metin.toLocaleLowerCase('en-US');
    if (metin && anahtar && !sonuc.has(anahtar)) sonuc.set(anahtar, metin);
  }
  return [...sonuc.values()];
}

export function iletisimKisileriniOlustur(
  kaynak: 'dava' | 'icra' | 'arabuluculuk',
  dosya: DavaDosyasi | IcraDosyasi | ArabuluculukDosyasi,
  kisiler: Muvekkil[]
): IletisimKisiSecenegi[] {
  const sonuc: IletisimKisiSecenegi[] = [];
  const eklenenIdler = new Set<number>();
  const eklenenIsimler = new Set<string>();
  const ekle = (taraf: Partial<DavaTarafKaydi>, rol: string, anahtar: string) => {
    const kayit = kayitBul(taraf, kisiler);
    const kisi = temiz(taraf.isim) || temiz(kayit?.adSoyad);
    if (!kisi) return;
    if (kayit) eklenenIdler.add(kayit.id);
    eklenenIsimler.add(isimAnahtari(kisi));
    sonuc.push({
      anahtar: `${kaynak}:${dosya.id}:${anahtar}`, kisi, rol,
      telefonlar: benzersiz([taraf.telefon, kayit?.telefon], true),
      epostalar: benzersiz([taraf.eposta, kayit?.eposta])
    });
  };
  const eklenmisMi = (taraf: Partial<DavaTarafKaydi>) => {
    const kayit = kayitBul(taraf, kisiler);
    return kayit ? eklenenIdler.has(kayit.id) : eklenenIsimler.has(isimAnahtari(taraf.isim));
  };

  if (kaynak === 'dava') {
    const dava = dosya as DavaDosyasi;
    const ceza = dava.dosyaTuru === 'ceza' || dava.dosyaTuru === 'sorusturma';
    if (ceza && dava.cezaTaraflari?.length) {
      dava.cezaTaraflari.forEach((taraf, i) => ekle(taraf, `${taraf.rol || 'Taraf'}${taraf.muvekkilMi ? ' · Müvekkil' : ''}`, `ceza:${i}`));
    } else {
      (dava.davacilar || []).forEach((taraf, i) => ekle(taraf, 'Davacı', `davaci:${i}`));
      (dava.davalilar || []).forEach((taraf, i) => ekle(taraf, 'Davalı', `davali:${i}`));
    }
    const muvekkiller = dava.muvekkiller?.length ? dava.muvekkiller : [{ isim: dava.muvekkil, muvekkilId: dava.muvekkilId }];
    muvekkiller.forEach((taraf, i) => {
      if (!eklenmisMi(taraf)) ekle(taraf, 'Müvekkil', `muvekkil:${i}`);
    });
    if (!dava.davacilar?.length && !dava.davalilar?.length && !dava.cezaTaraflari?.length) {
      // Commas can be part of a company name; only split explicit line/semicolon separators.
      (dava.karsiTaraf || '').split(/[;\n]+/).forEach((isim, i) => {
        if (!eklenmisMi({ isim })) ekle({ isim }, 'Karşı taraf', `karsi:${i}`);
      });
    }
  } else if (kaynak === 'icra') {
    const icra = dosya as IcraDosyasi;
    for (const [rol, isim] of [['Alacaklı', icra.alacakli], ['Borçlu', icra.borclu]]) {
      const muvekkilMi = icra.muvekkilRolu ? icra.muvekkilRolu === rol : !!isimAnahtari(isim) && isimAnahtari(isim) === isimAnahtari(icra.muvekkil);
      ekle({ isim, muvekkilId: muvekkilMi ? icra.muvekkilId : undefined }, rol, rol);
    }
    const muvekkil = { isim: icra.muvekkil, muvekkilId: icra.muvekkilId };
    if (!eklenmisMi(muvekkil)) ekle(muvekkil, 'Müvekkil', 'muvekkil');
  }

  (dosya.taraflar || []).forEach((taraf, i) => {
    ekle({ ...taraf, tcKimlikVergiNo: taraf.tcVergiNo }, taraf.tip || 'Taraf', `taraf:${i}`);
    ekle({
      isim: taraf.vekil, muvekkilId: taraf.vekilMuvekkilId, tcKimlikVergiNo: taraf.vekilTckn,
      telefon: taraf.vekilTelefon, eposta: taraf.vekilEposta
    }, `${taraf.tip || 'Taraf'} vekili · ${temiz(taraf.isim)}`, `vekil:${i}`);
  });
  if (kaynak === 'arabuluculuk' && dosya.muvekkilId != null && !eklenenIdler.has(dosya.muvekkilId)) {
    const kayit = kisiler.find(k => k.id === dosya.muvekkilId);
    if (kayit && !eklenenIsimler.has(isimAnahtari(kayit.adSoyad))) ekle({ muvekkilId: kayit.id }, 'Hesap muhatabı', 'muhatap');
  }
  return sonuc;
}
