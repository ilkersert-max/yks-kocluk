# YKS Koçluk Portalı v7 — deneme / ödev / haftalık istatistik

ZIP içindeki index.html, app.js, scoring.js, style.css, last-five-standalone.js, alkis.mp3, README.md dosyalarını birlikte GitHub Pages deposunun köküne yükleyin. Önce yedek alın. Firebase projesi değiştirilmedi.

- Deneme kaydında sonuç zorunlu değildir; boş sonuç `pending`, kısmi sonuç `partial`, tamamı `complete`. Son 5 yalnızca tam kayıtları kullanır. Deneme geçmişinde **Sonuçları ekle / düzenle** ile aynı kayda daha sonra sonuç işlenebilir; yeni deneme oluşturulmaz.
- Ödev: veriliş ve bitiş tarihi, ders/branş, soru sayısı, hedef ve not. Öğretmen/veli/koç/Admin ödevleri günceller/siler; öğrenci sonuç girer. Eski ödevler silinmez. Biten ödevin soru sayısı değişirse yeniden sürüyor durumuna alınır.
- Haftalık sorular: Pazartesi–Pazar, ders bazında günlük `TestEntries` ve ödev sonuçları toplanır; denemeler hariç tutulur. Ödevde çözülen aynı soruyu günlük çalışma olarak ayrıca girmeyin, çift sayılır. Eski tarihli sonucu bulunmayan kayda tahmini tarih atanmaz. Kısmi ödev sonucu son durum olarak sayılır, geçmişteki her günün kümülatif çözümü ayrıca tutulmaz.
- Admin test temizleme ve v6 ödev ders görünümü korunur.
- Firestore Rules ilgili `Assignments` için öğretmen/veli/koç/Admin update/delete izni vermiyorsa uygulama `permission-denied` gösterir. İstemci rol kontrolü tek başına güvenlik kuralı değildir.
- Canlı Firebase, gerçek telefon ve tarayıcı kullanıcı testi burada yapılamadı; yerel sözdizimi ve hesaplama testleri uygulanmıştır.
