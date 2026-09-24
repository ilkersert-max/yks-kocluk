# YKS Tek Öğrenci Portalı — Son 5 Deneme Güncellemesi

## Kurulum
Bu klasördeki **7 dosyayı birlikte** GitHub Pages deponuzun ana dizinine veya bir statik web sunucusunun yayın dizinine yerleştirin:
`index.html`, `app.js`, `scoring.js`, `style.css`, `last-five.js`, `last-five-view.js`, `alkis.mp3`.
Mevcut dosyaları değiştirmeden önce GitHub üzerinden çalışan sürümün yedeğini/commit'ini alın. Firebase proje bilgileri mevcut projeye işaret eder; yeni proje açılmaz.

## Son 5 deneme
- Öğretmen, veli, koç ve Admin ekranlarında Genel Durum -> Son 5 Deneme Analizini Aç ve Detaylı Analiz -> Son 5 Deneme Analizi.
- TYT, SAY, EA, SÖZ ve DİL ayrı seçilir. Her türün son en fazla 5 tam denemesi alınır.
- Son net, ortalama, en yüksek net, ilk/son farkı, çizgi grafik, tarih/kaynak tablosu ve ders bazında değişim.
- Eksik/kısmi denemeler ve ders net ayrıntısı bulunmayan eski kayıtlar ilgili karşılaştırmaya alınmaz; kayıt sayısı açıklanır.
- Öğrencinin ana ekranında ayrıntılı son 5 paneli bulunmaz.
- Sonuçlar yalnızca kaydedilmiş Firestore verilerinden üretilir; yeni bir puan/sıralama tahmini yapılmaz.

## Mevcut işlevler
Deneme, günlük çalışma, ödevler, diploma/OBP, ÜçDörtBeş All Star kitap seçimi, ses kaydı ve Admin test verisi yedekleme/temizleme korunur. Deneme Kaydet'e basıldıktan sonra öğrenci için alkış sesi, Firebase yanıtından önce başlatılmayı dener (tarayıcının ses kısıtlaması hâlâ geçerlidir); kayıt başarı mesajı yalnızca kayıt gerçekleşince verilir.

## Dikkat
Admin'deki gerçek kullanıma geçiş / toplu silme işlemini test tamamlanmadan çalıştırmayın. Firebase gerçek hesap ve tarayıcı uçtan uca testleri bu ortamda yapılmadı; JavaScript sözdizimi ve son 5 analizi testleri yerel olarak kontrol edildi. ÖSYM puanı ile uygulamanın net başarı göstergesi aynı değildir.
