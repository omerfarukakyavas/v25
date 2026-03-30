# Gunluk e-posta ozeti kurulumu

Bu klasor, V25 icin gun sonu dosya ozeti gonderen Firebase Functions altyapisini icerir.

## Ne yapiyor?

- Her gun saat `18:30`'da calisir.
- Geciken kayitlari toplar.
- Bugunluk kayitlari toplar.
- Secilen gun araligindaki yaklasan isleri toplar.
- Arabuluculuk sure sayaclarinda riskli dosyalari ayri blokta listeler.
- Maili Brevo uzerinden gonderir.

## Ilk kurulum

1. Firebase projesinde `Blaze` plan aktif olmali.
2. Firebase CLI ile bu klasorun bagimliliklarini kur:
   - `cd functions`
   - `npm install`
3. Brevo uzerinde gonderici e-postani dogrula.
4. Gerekli sirri gir:
   - `firebase functions:secrets:set BREVO_API_KEY`
5. Deploy sirasinda parametre olarak sunlari gir:
   - `BREVO_SENDER_EMAIL`
   - `DAILY_DIGEST_SENDER_NAME`
   - `DAILY_DIGEST_BASE_URL` (istersen varsayilan canli siteyi kullan)
6. Son olarak deploy et:
   - `firebase deploy --only functions`

## Uygulama ici ayar

Dashboard ekranindaki `Gunluk E-posta Ozeti` panelinden:

- otomatik gonderimi acip kapatabilirsin
- alici e-postalari girebilirsin
- kac gunluk yaklasan is gonderilecegini belirleyebilirsin
- `Test Maili Gonder` butonuyla aninda deneme yapabilirsin
