# YKS Son 5 Deneme – v4

Bu ZIP tam GitHub Pages / statik sunucu paketidir. Altı uygulama dosyasını depodaki aynı klasöre yükleyin: index.html, app.js, scoring.js, style.css, alkis.mp3, last-five-standalone.js.

Mevcut portalı güncellemeyi en az değişiklikle yapmak isterseniz yalnızca last-five-standalone.js dosyasını yükleyin ve mevcut index.html içindeki app.js script etiketinden sonra şu bağımsız etiketi ekleyin:
<script type="module" src="./last-five-standalone.js?v=4"></script>

Aynı portalda eski last-five.js / last-five-view.js modülleri zaten yüklüyse çift analiz çıkmaması için önce bu eski bağlantıları kaldırın.

Admin, Öğretmen, Veli, Koç: Genel Durum kartı ve Detaylı Analiz > Son 5 Deneme Analizi · v4. Öğrenci paneline eklenmez. Firebase üzerindeki canlı çalışma testi kullanıcı tarafında yapılmalıdır.
