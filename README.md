# YKS Tek Öğrenci Portalı

## Kurulum

Bu klasördeki `index.html`, `app.js`, `scoring.js`, `style.css` dosyalarını aynı dizine koyun. GitHub Pages için depoya yükleyip Settings → Pages → Deploy from a branch üzerinden yayımlayın. Başka statik HTTP sunucusunda da çalışır; `file://` ile çift tıklayarak açmak yerine HTTP(S) kullanın. Firebase Auth yetkilendirilmiş alan adlarına GitHub Pages alan adınızı ekleyin. Firebase proje ayarları, gönderdiğiniz özgün `app(1).js` dosyasından devralındı. Firebase Auth hesapları ve `Users/<uid>` kayıtlarında `Rol` ve `AdSoyad` alanları mevcut olmalıdır. Bu paket Firebase kullanıcı hesabı oluşturmaz.

## Kullanım

Admin → Giriş parametreleri: yalnızca NET / yalnızca D-Y / ikisi ve varsayılanı. Deneme girişinde TYT, SAY, EA, SÖZ ve DİL; dört kaynak seçimi; ondalıklı net girişi (`23,75` veya `23.75`); eksik alanlar `null` olarak tutulur. Profil → Diploma notu: bilinmiyor / tahmini / kesin, kırık OBP tercihi. Her deneme kaydında o tarihteki OBP anlık görüntüsü saklanır. Yeni, ayrı bir kullanıcı verisi katmanı gerektirmeden mevcut Firestore `Denemeler`, `Assignments`, `TestEntries`, `Users`, `Settings` koleksiyonlarıyla çalışır; ayrıca `StudentProfile/mainStudent` kullanır.

## Önemli sınırlar

Bu sürüm gerçek ÖSYM puanı **hesaplamaz**. Yalnızca net ve tamamlanmış sınavlar için açıkça etiketlenmiş *net başarı göstergesi* hesaplar. Kurumun açıkladığı puan manuel girilebilir. OBP katkısı ayrı tutulur; gerçek sınav puanı olmadığı için sayısal yerleştirme puanı uydurulmaz. Diploma/OBP güncellenince eski sınav sonuçları değiştirilmez. Eski kayıtlar listelenir fakat önceki sabit katsayılı puanları yeni resmî puan gibi gösterilmez.

Ödevler tek öğrenciye aittir. Öğretmen, veli, koç ve admin ödev verebilir, sonuç girilebilir, değerlendirme yazılabilir. Eski ödevlerde soru sayısı bulunmadığı için geçmiş ödevlerden sahte sonuç üretilmez.

Canlı Firebase hesabı veya Firestore kuralları olmadan gerçek hesapla uçtan uca giriş/yazma testi yapılmadı. GitHub Pages yayımlaması/izinler için kendi Firebase projenizde kontrol edilmelidir.

## Bu sürümde eklenenler
- Öğrenci girişinde her oturumda değişen kısa motivasyon sözü; sonraki söz düğmesi. Alkış ve tezahürat harici MP3 olmadan tarayıcı içinde üretilir. Tarayıcıların otomatik ses çalmayı kısıtlaması nedeniyle yalnızca **Alkış ve tezahürat** düğmesiyle başlar. Admin panelinden ses düğmesi devre dışı bırakılabilir.
- Öğrenci ile veli/öğretmen/koç/Admin için farklı menü ve ana ekran. Diğer roller Denemeler bölümünden + Sonuç Ekle yoluyla çocuk adına deneme girebilir.
- Günlük test ve ödev kaynak seçiminde ÜçDörtBeş (345) All Star, ÜçDörtBeş diğer seriler ve başka yayın seçenekleri; özgül kitap/ders adı için zorunlu kısa ek alan.
- Dosyalar statiktir; `index.html`, `app.js`, `scoring.js`, `style.css` aynı klasörde GitHub Pages veya HTTP sunucusunda çalışır.
