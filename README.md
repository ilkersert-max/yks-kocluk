# YKS Tek Öğrenci Portalı — Ödev Sadeleştirme + Tekrarlanabilir Test Temizliği (v6)

## Kurulum
Yedi dosyanın **tamamını** GitHub Pages deposunun köküne veya basit web sunucusunda aynı klasöre koyun: `index.html`, `app.js`, `scoring.js`, `style.css`, `last-five-standalone.js`, `alkis.mp3`, `README.md`. Önce çalışan sürümünüzü yedekleyin. Eski `last-five.js` / `last-five-view.js` modüllerini ayrıca çağırmayın. Firebase projesi değiştirilmedi.

## Ödev ekranı
- Admin > **Ödev ders görünümü**: Sade (varsayılan) veya Ayrıntılı (TYT/AYT) seçilebilir.
- Sade sıra: **DİL, Matematik, Türkçe, Tarih, Coğrafya, Felsefe, Din, Fizik, Kimya, Biyoloji**.
- Yeni ödev oluştururken **kitap/yayın ve konu alanı sorulmaz**. Ders, soru sayısı, isteğe bağlı hedef doğru, son tarih ve açıklama bulunur.
- Geçmiş ödev kayıtlarının asıl Firestore verileri değiştirilmez. Eski kitap/konu varsa geçmiş kartında korunabilir. Ödev görüntüleme için eski TYT/AYT, Tarih-1/2, Coğrafya-1/2 isimleri sadeleştirilir. Deneme ve günlük çalışma testleri/hesaplama motoru değişmedi.

## Admin > Test verilerini temizle
- Bu düğme **tekrar kullanılabilir**; silme işleminden sonra test modu kapatılmaz veya gerçek kullanım moduna zorlanmaz.
- `Denemeler`, `TestEntries`, `Assignments` koleksiyonlarının **tamamını** kapsar. Test ve gerçek kayıtları ayırt etmez; dikkatli kullanın.
- JSON yedeği indirilebilir. İndirildiğini ve açıldığını onay kutusunda doğrulayın, **TEST VERİLERİNİ SİL** ifadesini yazın, kalıcı silmeyi kabul edin; ardından son tarayıcı onayı istenir.
- Kullanıcılar/roller, `StudentProfile` içindeki diploma/OBP, `Settings` ve kitap kataloğu silinmez.
- Yeni yayımlanmış Firestore Rules, yalnızca Admin rolünün bu üç koleksiyonu silmesine izin vermelidir.

## Hızlı test
1. Admin > Ödev ders görünümü = Sade → Ödev yönetimi > Yeni ödev: 10 ders listesi doğru sırada; kitap ve konu yok.
2. Bir Matematik ödevi oluşturun. Öğrenci hesabında sonucu girin; öğretmen/veli/koç sonucu görsün.
3. Admin > Ayrıntılı → yeni ödevde TYT/AYT seçenekleri gelir; daha önce atanan ödevler kaybolmaz. Tekrar Sade seçin.
4. Admin > Test verilerini temizle: yedek ve tüm onaylar olmadan kalıcı silme etkinleşmez. **Gerçekten silmek istemiyorsanız son onayı vermeyin.**
5. TYT 30,75 + 15,50 + 25,25 + 14,00 = 85,50; Son 5, OBP ve alkışın önceki davranışı korunur.

Yerel JS sözdizimi ve hesaplama/sürüm kontrolleri yapılmıştır; Firebase hesabında canlı test yapılmamıştır.
