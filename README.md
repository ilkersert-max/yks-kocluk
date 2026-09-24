# YKS Aile Koçluk Portalı – mobil ve test temizleme güncellemesi

GitHub Pages / statik HTTP sunucusu için `index.html`, `app.js`, `scoring.js`, `style.css`, `alkis.mp3` dosyalarının **beşini birden** sitenin aynı klasörüne koyun. Eski `index.html`, `scoring.js` işlevleri korunmuştur; `app.js` ve `style.css` güncellenmiştir. Mevcut Firebase projesi kullanılmaya devam eder.

Ses: Öğrencinin Alkış ve tezahürat düğmesi doğrudan sizin yüklediğiniz `alkis.mp3` dosyasını çalar, önceki sentetik ses kaldırılmıştır. Ses mobil tarayıcı kuralı nedeniyle kullanıcı dokunuşuyla başlar.

Admin → Test kayıtları ve gerçek kullanıma geçiş: önce JSON yedeği indir, bilgisayarda gerçekten oluştuğunu doğrula, sonra onay ifadesini yaz ve son onayı ver. Yalnızca `Denemeler`, `TestEntries`, `Assignments` Firestore koleksiyonlarının tüm kayıtları temizlenir. `StudentProfile/mainStudent` (diploma/OBP), `Users`, `Settings`, kitap ve Firebase Auth hesapları korunur. Silme başarılı olunca `Settings/SystemConfig.testMode=false` olur ve toplu silme düğmesi kapanır. Kısmi hata olursa test modu açık kalır; geri yükleme aracı bu pakette yoktur. JSON yedeği tarayıcıdan indirilir ve manuel arşivleme içindir.

Bütün kayıtların tek öğrenciye ait olduğu varsayılır. Çevrimiçi Firebase/gerçek hesap testi yapılmadan canlı veride toplu silme denemeyin.
