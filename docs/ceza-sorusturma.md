# Ceza ve Soruşturma Dosyaları

## Kullanım

1. Dava ve Soruşturma > Yeni Dosya yolunu açın.
2. Hukuk davası, Ceza davası veya Savcılık soruşturması seçin.
3. Soruşturmada başsavcılık ve SORUŞTURMA numarası; ceza davasında mahkeme ve ESAS numarası girin.
4. Taraf ekleyin, rolünü seçin ve temsil ettiğiniz kişileri Müvekkilim olarak işaretleyin. Kişilerden seçim veya manuel kayıt mümkündür.
5. KARAR numarası, karar tarihi ve karar türü isteğe bağlıdır.

Dosya türü filtresi ve arama; numaralar, taraflar, kurum, konu ve karar açıklamasını kapsar. Türü olmayan eski kayıtlar otomatik sınıflandırılmaz. Eski kayıtlar düzenlenerek tür seçilebilir; bu durumda taraf rolleri kullanıcı tarafından kontrol edilmelidir.

Soruşturma detayındaki Bağlantılı Ceza Dosyası Oluştur düğmesi yeni bir taslak açar. Şüpheli rolü taslakta Sanık olur; kullanıcı değiştirebilir. Kaynak soruşturma silinmez veya kapanmaz. Finans, evrak, notlar ve portal izinleri taşınmaz. Aynı soruşturmaya birden fazla ceza dosyası bağlanabilir; mevcut bir ceza dosyası da düzenleme ekranından soruşturmaya bağlanabilir.

Görevler, ajanda, evraklar, notlar, iletişim notları, klasörler ve finans mevcut `davalar` kayıt yolu üzerinden çalışır. Soruşturma için duruşma üretilmez; tarihli işler dosyaya bağlı görev olarak eklenir. Ceza duruşmaları mevcut ajanda ve Google Takvim aktarımını kullanır. Portalda otomatik paylaşım yapılmaz; mevcut dosya, belge ve finans paylaşım izinleri geçerlidir.

Bu sürüm UYAP'tan otomatik ceza/soruşturma sınıflandırması veya hukuki süre/infaz hesabı eklemez. Yeni bir Firebase koleksiyonu, kural değişikliği veya veri göçü gerektirmez.

## Doğrulama

- `npm run test:ceza`: Node 24 üzerinde yardımcı fonksiyon ve gerçek bileşen kayıt akışı testleri. Firebase yazımları test içinde taklit edilir.
- `npm run build`: Normal uygulama derlemesi.
- `npm run preview:ceza`: Yalnızca yerel görsel test için `http://127.0.0.1:4201/`. Örnek kayıtlar bellekte saklanır, yenileyince sıfırlanır. Normal giriş noktası veya üretim derlemesi bu dosyayı kullanmaz.

Canlı Firebase teslimatı bu testlerin kapsamı dışındadır. Üretimde gerçek dosya oluşturmadan önce yayının yeni sürümü içerdiği doğrulanmalıdır.
