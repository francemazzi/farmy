import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { StorefrontProduct } from "@/types";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#e8f5e9";
const ORANGE = "#e07c00";
const BLUE = "#1565c0";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    padding: 36,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 4,
  },
  companyDesc: {
    fontSize: 9,
    color: GRAY,
    lineHeight: 1.5,
  },
  qrBlock: {
    alignItems: "center",
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrCaption: {
    fontSize: 7,
    color: GRAY,
    marginTop: 4,
    textAlign: "center",
  },

  // Store URL banner
  urlBanner: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 6,
    padding: "8 12",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urlLabel: {
    fontSize: 9,
    color: GREEN,
    fontFamily: "Helvetica-Bold",
    marginRight: 6,
  },
  urlLink: {
    fontSize: 9,
    color: BLUE,
    textDecoration: "underline",
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  // Products grid (2 columns)
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    width: "48%",
    border: `1 solid ${BORDER}`,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  cardImage: {
    width: "100%",
    height: 90,
    objectFit: "cover",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 60,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImagePlaceholderText: {
    fontSize: 24,
  },
  cardBody: {
    padding: "8 10",
  },
  cardName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    lineHeight: 1.3,
  },
  cardMeta: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginBottom: 5,
    marginTop: 2,
  },
  badge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeBio: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  badgeNew: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  badgePromo: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgeLow: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  price: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  unit: {
    fontSize: 8,
    color: GRAY,
    marginLeft: 2,
  },
  orderLink: {
    marginTop: 5,
    fontSize: 7,
    color: BLUE,
    textDecoration: "underline",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
  footerLink: {
    fontSize: 7,
    color: BLUE,
    textDecoration: "underline",
  },
});

interface Props {
  company: { id: string; name: string; description?: string };
  products: StorefrontProduct[];
  storeUrl: string;
  qrDataUrl: string;
}

export function StorefrontPDFDocument({ company, products, storeUrl, qrDataUrl }: Props) {
  const today = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Catalogo ${company.name}`}
      author={company.name}
      subject="Catalogo prodotti"
      keywords="farmy, prodotti, biologico"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.description && (
              <Text style={styles.companyDesc}>{company.description}</Text>
            )}
            <Text style={[styles.companyDesc, { marginTop: 6 }]}>
              Catalogo aggiornato al {today} · {products.length} prodotti disponibili
            </Text>
          </View>
          <View style={styles.qrBlock}>
            <Image src={qrDataUrl} style={styles.qrImage} />
            <Text style={styles.qrCaption}>Scansiona per{"\n"}ordinare online</Text>
          </View>
        </View>

        {/* URL Banner */}
        <View style={styles.urlBanner}>
          <Text style={styles.urlLabel}>Ordina online →</Text>
          <Link src={storeUrl} style={styles.urlLink}>
            {storeUrl}
          </Link>
        </View>

        {/* Products */}
        <Text style={styles.sectionTitle}>Prodotti disponibili</Text>
        <View style={styles.grid}>
          {products.map((product) => {
            const stock = product.stocks[0];
            if (!stock) return null;
            const productUrl = `${storeUrl}/product/${product.id}`;

            return (
              <View key={product.id} style={styles.card}>
                {product.imageUrl ? (
                  <Image src={product.imageUrl} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={styles.cardImagePlaceholderText}>
                      {product.isOrganic ? "🌿" : "📦"}
                    </Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Badges */}
                  <View style={styles.badgeRow}>
                    {product.isOrganic && (
                      <Text style={[styles.badge, styles.badgeBio]}>BIO</Text>
                    )}
                    {stock.isNew && (
                      <Text style={[styles.badge, styles.badgeNew]}>NOVITÀ</Text>
                    )}
                    {stock.isPromotional && (
                      <Text style={[styles.badge, styles.badgePromo]}>PROMO</Text>
                    )}
                    {stock.lowStock && (
                      <Text style={[styles.badge, styles.badgeLow]}>ULTIME SCORTE</Text>
                    )}
                  </View>

                  <Text style={styles.cardName}>{product.name}</Text>

                  {product.category && (
                    <Text style={styles.cardMeta}>Categoria: {product.category}</Text>
                  )}
                  {product.producer && (
                    <Text style={styles.cardMeta}>Produttore: {product.producer}</Text>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>€ {stock.price.toFixed(2)}</Text>
                    {product.unitOfMeasure && (
                      <Text style={styles.unit}>/{product.unitOfMeasure}</Text>
                    )}
                  </View>

                  <Link src={productUrl} style={styles.orderLink}>
                    Vedi dettaglio e ordina →
                  </Link>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name} · Catalogo prodotti {today}
          </Text>
          <Link src={storeUrl} style={styles.footerLink}>
            {storeUrl}
          </Link>
        </View>
      </Page>
    </Document>
  );
}
