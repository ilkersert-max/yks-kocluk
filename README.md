# YKS Koçluk Portalı v8 — ödev gerçekleşmesi ve haftalık dip toplamlar

**Kurulum:** ZIP içindeki 7 dosyanın tamamını GitHub Pages deponuzun köküne yükleyin. Önce eski sürümün yedeğini alın. Firebase projesi/şeması göçü yapılmaz.

- Atanan soru sayısı hedef; çözülen soru sayısı hedefin altında, eşit veya üstünde olabilir. Doğru + yanlış <= çözülen; boş = çözülen − doğru − yanlış. Çözülmeyen ödev miktarı boş sayılmaz.
- Çözülen ≥ atanan: tamamlandı (üstündeyse hedef üstü); altındaysa eksik / devam ediyor, süre geçmişse süresi geçti / eksik. Sonuç girişinde tamamlama kutusu yoktur, durum otomatik hesaplanır. Sonuçlar daha sonra tekrar düzenlenebilir.
- Gerçekleşme yüzdesi, fark ve doğru hedefi ödev kartında gösterilir. Hedef doğru gerçekleşme durumundan bağımsızdır. Var olan kayıtlar silinmez; `remaining` sıfırın altına düşmez.
- Haftalık ders tablosuna çözülen/doğru/yanlış/boş/net için **GENEL TOPLAM** satırı eklenmiştir. Günlük çalışmalar ve ödev sonuçları dahildir; denemeler hariçtir. Ödevle aynı çalışma günlük girişte de kayıtlıysa iki kez sayılır. Bir ödevin güncellenen tek sonuç kaydı kendi sonuç tarihi haftasında sayılır; günlük artışları geçmiş haftalara dağıtmaz.
- Kullanıcıya gösterilen ödev durumları Türkçe, Firestore'da saklanan teknik durum enumları değişmez.
- Admin veri temizleme, diğer deneme/OBP/son beş ve ödev parametreleri korunmuştur. Firestore Rules ödev silme/düzenlemeye izin vermiyorsa ilgili işlem engellenir.
- Sözdizimi ve yerel örnek veri kontrolleri yapılmıştır; canlı Firebase ve gerçek cihaz testleri yapılmamıştır.


## v9 – Hesap tutarlılığı
- Ödev kartı, ana sayfa ve öğrenci analizinde tamamlanan ödevler tek `assignmentMetrics` hesabından alınır. Kaydedilmiş status değeri geride kalmışsa gösterim ve sayaç ayrışmaz.
- Sonuç girilmiş eski kayıtlarda boş alanı eksikse çözülen − doğru − yanlış üzerinden hesaplanır. Geçersiz aritmetikli kayıtlar haftalık toplama dahil edilmez.
- Eski verileri topluca değiştirmez veya silmez. Firestore üzerinde canlı test gereklidir.

## v10.1 – completed counter / cache fix
- v9 erroneously shipped app.js?v=weekly-v8, so older browsers/CDNs could keep serving v8 despite uploaded v9 code. All index assets now carry v10-1. Confirm browser tab title v10.1 and app.js?v=v10-1 on deployed page.
- Completion uses one metric for cards, home and analysis; historical completed/reviewed status is a fallback only for legacy records without usable numerical totals. Cancelled items never count.
- No Firestore records are changed, deleted or migrated. Deploy all 7 files to the *published GitHub Pages branch/folder*, and check that index.html has v10-1; if a different build is served, a new ZIP cannot fix the running site.


## v10.2 – Ödev sonuç girişinin netleştirilmesi
- Atanan soru sayısı üst sınır değildir; 8/20, 20/20, 35/20 kayıtları geçerlidir.
- Doğru/yanlış girerken bunların toplamı çözülen alanını aşarsa çözülen alanı otomatik en az bu toplama yükseltilir. Gerekirse öğrenci toplamı daha da yükselterek boşları gösterebilir.
- Kullanıcı çözülen sayısını sonradan D+Y altına indirirse sayısal örnekli açıklama gösterilir; Firebase'e çelişkili sonuç kaydedilmez.
- Atanan soru ve hedef doğru girişinin hataları ayrıştırıldı. Hedef doğru en fazla atanmış soru adedi olabilir; öğrencinin gerçek doğru sayısı atanmış soru adedini geçebilir.
- Firestore şeması, hesap göstergeleri ve geçmiş veriler değiştirilmez. Gerçek Firebase üzerinde henüz test yapılmamıştır.


## v11 – Admin rapor merkezi ve tamamlanan ödev sayacı
- Öğrenci analizindeki Tamamlanan ödev göstergesi tekrar `tamamlanan / iptal edilmemiş toplam` olarak gösterilir; ana sayfa ve kart aynı `assignmentMetrics` fonksiyonunu kullanır.
- Admin Raporlar alanında genel durum, ödev envanteri, eksik/fazla çözüm, ders bazlı sonuç, tüm çalışma dökümü, hafta dökümü, gecikmeler, doğru hedefleri, atayan rol, denemeler ve veri tutarlılığı denetimi bulunur. Tarih filtresi, CSV, PDF/Yazdır ve JSON yedek mevcuttur.
- Atanan soru miktarı hedef, gerçekleşen gerçek sonuçtur; çözülmemiş fark boş soruya eklenmez. Kayıtlar değiştirilmez.
- DİKKAT: Bir ödevin sonuç güncellemesi sadece güncel sonuç tarihine yazılır; geçmiş haftalara ait ayrı denemeler tutulmuyor. Aynı çalışma günlük çalışmaya da eklenmişse çift sayılır. Farklı raporların tarih dayanakları etiketlenmiştir. Veri denetimi her zaman bütün kayıtları kontrol eder.
- PDF tarayıcı Yazdır > PDF olarak kaydet yöntemiyle oluşturulur. Firebase'de canlı test yapılmadı.
