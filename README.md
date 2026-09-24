# YKS Portal – TYT net düzeltmesi / Son 5 v5

Bu paket önceki Son 5 v4 sürümünü temel alır. Esas portal işlevleri (öğrenci ekranı, Firebase, roller, diploma/OBP, ödev, kitap ve ses) değiştirilmez.

## Kurulum
GitHub Pages deponuzun ana dizinine paket içindeki **yedi dosyanın tamamını** yükleyin: index.html, app.js, scoring.js, style.css, alkis.mp3, last-five-standalone.js, README.md. Çalışan sürümün yedeğini alın. Önceki ayrı Son 5 modülleri varsa aynı anda çağırmayın.

## Düzeltme
- TYT seçildiğinde dört TYT testi artık iki kez listelenip toplanmaz.
- TYT 30,75 + 15,50 + 25,25 + 14,00 = 85,50; alan neti 0.
- Geçmişte kaydedilmiş 171,00 toplamlı TYT kaydı, ders netleri eksiksizse uygulamanın özet / geçmiş / rapor / basit analiz / Son 5 görünümünde 85,50 olarak hesaplanır; mevcut Firebase kaydı otomatik değiştirilmez.
- Admin > Detaylı Analiz > Son 5 Deneme > TYT ekranında yalnızca toplamı ders netlerinin tam iki katı olduğu doğrulanmış geçmiş TYT kayıtları için isteğe bağlı **Eski TYT toplamını Firebase'de düzelt (Admin)** düğmesi görünür. Onay sonrasında yalnızca tytNet, fieldNet, toplamNet ve correctedDoubleTYT alanları güncellenir. Önce yedek alın; diğer kayıtlar ve OBP değişmez.
- Kısmi testler tam deneme analizine eklenmez. Eksik dersleri sistem kendi kendine doldurmaz.

## Test
1) Yeni TYT denemesi: Türkçe 30,75; Sosyal 15,50; Matematik 25,25; Fen 14,00. Beklenen toplam 85,50.
2) Deneme geçmişi ve Son 5 TYT'de 85,50 görünmeli.
3) Eski TEST-TYT-01 kaydında dört net varsa analizde otomatik 85,50 görünmeli. Kalıcı Firebase düzeltmesini yalnızca test verisi için, yedek sonrası Admin onayıyla uygulayın.
4) DİL, OBP, ödev, ses ve mobil görünümün önceki davranışını kontrol edin.

Not: Firebase üzerinde canlı oturum testi yapılmamıştır; JavaScript sözdizimi ve yerel hesaplama testleri çalıştırılmıştır.
