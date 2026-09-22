# YKS v10 — PDF, katalog ve web yayını testi

## Bilgisayarda PDF
`portal.html` → rol ve öğrenci seç → Raporlar/Gelişimim → PDF rapor türü → açılan sekmede **PDF olarak kaydet / Yazdır** → Chrome/Edge Hedef: **PDF olarak kaydet**. Türkçe karakterlerin PDF'de görünmesini tarayıcı yazdırma penceresinde kontrol edin. Pencere engellenirse bu sayfa için açılır pencereye izin verin. PDF'ler indirme paketi içinde hazır statik raporlar değildir; ilgili öğrenci kayıtlarından tarayıcıda üretilir.

## Katalog
Tüm öğrenci/öğretmen/koç/yönetici rollerinde `Kitap Kataloğu` menüsü var. Arama, Kitaplığıma ekle, Kitabımı bulamadım/Manuel ekle çalışır. Önceki tarayıcı kaydı katalogu boş bırakmışsa örnek katalog geri konur; diğer kayıtlar silinmez. Örnek yayınevi/konu/test soru sayıları doğrulanmış yayın bilgisi değildir. Gerçek kitap verisi otomatik çekilmez.

## Web'de deneme (statik demo)
Bu dizindeki `index.html` statik hosting servisine yüklenebilir. Firebase Hosting ile: Firebase CLI kur; kendi projenin içinde `firebase login`, `firebase use --add`, `firebase deploy --only hosting` komutlarını çalıştır. Dağıtımı ChatGPT yapmamıştır; size ait gerçek URL bu yüzden bu pakette yoktur. Hosting yalnız sayfayı HTTPS üzerinde erişilebilir kılar; tarayıcı localStorage kaydı farklı cihazlarla paylaşılmaz ve rol seçici güvenli giriş değildir. Gerçek öğrenci verisiyle kullanmayın.

## Gerçek çevrimiçi çok kullanıcılı sürümün kalanları
Firebase Authentication, gerçek UID→öğrenci/öğretmen/koç/veli eşleştirmesi, Firestore Security Rules emülatör testleri, Cloud Functions veri akışı, çoklu cihaz eşitleme ve eski kayıt migrasyonu kurulu değildir. `firebase_hazirlik` içindeki dosyalar entegrasyon taslağıdır; körlemesine canlıya dağıtmayın. Bu ürüne 'nihai canlı sistem' demek doğru değildir.

## Veri güvenliği
Eski demo verilerini kaybetmemek için Sıfırla kullanmayın. JSON yedeği alma yönetici demo rolündedir. Demo hesapları gerçek yetkilendirme sağlamaz.
