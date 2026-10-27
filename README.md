# Takip — beslenme ve antrenman takibi

Kişisel kullanım için PWA: günlük kilo, haftalık ortalama, beslenme planı ve uyum, antrenman/koşu, grafikler, JSON yedek ve CSV dışa aktarma.
Veriler yalnızca tarayıcının localStorage'ında tutulur; sunucuya hiçbir şey gönderilmez.

## Çalıştırma

Node 22.12+ gerekir (`.nvmrc`: 24).

```bash
nvm use            # veya Node 24'ü PATH'e ekle
npm install
npm run dev        # http://localhost:5173
npm test           # hesaplama testleri (Vitest)
npm run build      # dist/ — statik çıktı
npm run preview    # build'i yerelde dene (service worker yalnızca build'de aktif)
```

## Yayın (GitHub Pages)

`main` dalına her push'ta `.github/workflows/deploy.yml` testleri çalıştırır, build alır ve Pages'e yayınlar.
İlk seferde repo ayarlarında **Settings › Pages › Source: GitHub Actions** seçilmeli.

Telefonda: siteyi aç → Paylaş → **Ana Ekrana Ekle**. Kayıtları her zaman ana ekran ikonundan gir;
iOS'ta ana ekran uygulamasının verisi Safari sekmesinden ayrıdır.

## Yapı

| Yol | İçerik |
|---|---|
| `src/types.ts` | Veri modeli (`AppData`) |
| `src/data/seed.ts` | Başlangıç besin veri seti, haftalık plan, hedefler |
| `src/lib/nutrition.ts` | Makro hesapları, gün toplamı, hedef uyumu |
| `src/lib/weight.ts` | Ölçümler, önceki ölçüme fark, haftalık ortalama |
| `src/lib/progress.ts` | Tempo, seriler, haftalık karne, kilometre taşları |
| `src/lib/dates.ts` | Saat diliminden bağımsız tarih işlemleri |
| `src/lib/storage.ts` | Kalıcı depolama (bulut senkronu için tek değişim noktası) |
| `src/lib/io.ts` | CSV / JSON dışa-içe aktarma |
| `src/components/` | Ekranlar ve grafikler |

## Varsayımlar ve kurallar

- Besin değerleri 100 g başına **tahminidir** (USDA FoodData Central ve market etiketi ortalamaları). Ayarlar › Besinler'den düzeltilebilir; düzeltilen besin "etiketten" olarak işaretlenir.
- Tahıllar kuru, et/tavuk/hindi çiğ ağırlıktır. Somon çiğ varsayıldı. Menüde miktarı olmayan besinlere (domates, salata, domates sosu…) varsayılan gramaj verildi ve "varsayım" rozetiyle gösterilir.
- Plan ile gerçekleşen ayrıdır: bir güne ilk dokunuşta o günün öğünleri plandan kopyalanır; sonraki plan değişiklikleri geçmişi etkilemez.
- Kalori/protein uyumu yalnızca tüm öğünleri işaretli (yedim / farklı / atladım) günlerde hesaplanır. Kalori hedef aralığında, protein alt sınırın üstündeyse uyumlu. Tolerans yok.
- Haftalar pazartesi–pazar. Haftalık ortalama yalnızca girilen ölçümlerden; ölçümsüz haftanın ortalaması ve bir sonraki haftanın farkı boş kalır.
- Önceki güne fark, en son ölçüme göre hesaplanır ve kaç gün önce olduğu gösterilir.
- Bu uygulama tıbbi teşhis veya diyetisyen hizmeti sunmaz.

## Sonraya kalanlar

Koyu tema · egzersiz/set/tekrar arayüzü (veri modelinde `Workout.exercises` hazır) · backend/bulut senkronu.
