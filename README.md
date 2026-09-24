# YKS Koçluk Portalı v8 — ödev gerçekleşmesi ve haftalık dip toplamlar

**Kurulum:** ZIP içindeki 7 dosyanın tamamını GitHub Pages deponuzun köküne yükleyin. Önce eski sürümün yedeğini alın. Firebase projesi/şeması göçü yapılmaz.

- Atanan soru sayısı hedef; çözülen soru sayısı hedefin altında, eşit veya üstünde olabilir. Doğru + yanlış <= çözülen; boş = çözülen − doğru − yanlış. Çözülmeyen ödev miktarı boş sayılmaz.
- Çözülen ≥ atanan: tamamlandı (üstündeyse hedef üstü); altındaysa eksik / devam ediyor, süre geçmişse süresi geçti / eksik. Sonuç girişinde tamamlama kutusu yoktur, durum otomatik hesaplanır. Sonuçlar daha sonra tekrar düzenlenebilir.
- Gerçekleşme yüzdesi, fark ve doğru hedefi ödev kartında gösterilir. Hedef doğru gerçekleşme durumundan bağımsızdır. Var olan kayıtlar silinmez; `remaining` sıfırın altına düşmez.
- Haftalık ders tablosuna çözülen/doğru/yanlış/boş/net için **GENEL TOPLAM** satırı eklenmiştir. Günlük çalışmalar ve ödev sonuçları dahildir; denemeler hariçtir. Ödevle aynı çalışma günlük girişte de kayıtlıysa iki kez sayılır. Bir ödevin güncellenen tek sonuç kaydı kendi sonuç tarihi haftasında sayılır; günlük artışları geçmiş haftalara dağıtmaz.
- Kullanıcıya gösterilen ödev durumları Türkçe, Firestore'da saklanan teknik durum enumları değişmez.
- Admin veri temizleme, diğer deneme/OBP/son beş ve ödev parametreleri korunmuştur. Firestore Rules ödev silme/düzenlemeye izin vermiyorsa ilgili işlem engellenir.
- Sözdizimi ve yerel örnek veri kontrolleri yapılmıştır; canlı Firebase ve gerçek cihaz testleri yapılmamıştır.
