import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { StorefrontProduct } from "@/types";

Font.register({ family: "Helvetica", fonts: [] });

const GREEN = "#2d6a4f";
const LIGHT_GREEN = "#e8f5e9";
const GRAY = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    padding: 36,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 3,
  },
  companyDesc: {
    fontSize: 9,
    color: GRAY,
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
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
    height: 80,
    objectFit: "cover",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 50,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: "7 9",
  },
  cardName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    lineHeight: 1.3,
  },
  cardMeta: {
    fontSize: 7.5,
    color: GRAY,
    marginBottom: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginBottom: 4,
    marginTop: 2,
  },
  badge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeBio: { backgroundColor: "#d1fae5", color: "#065f46" },
  badgeNew: { backgroundColor: "#dbeafe", color: "#1e40af" },
  badgePromo: { backgroundColor: "#fef3c7", color: "#92400e" },
  badgeLow: { backgroundColor: "#fee2e2", color: "#991b1b" },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 3,
  },
  price: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  unit: {
    fontSize: 7.5,
    color: GRAY,
    marginLeft: 2,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 7,
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
});

interface Props {
  company: { id: string; name: string; description?: string };
  products: StorefrontProduct[];
}

export function StorefrontPDFDocument({ company, products }: Props) {
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
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.name}</Text>
          {company.description && (
            <Text style={styles.companyDesc}>{company.description}</Text>
          )}
          <Text style={[styles.companyDesc, { marginTop: 4 }]}>
            Catalogo aggiornato al {today} · {products.length} prodotti
          </Text>
        </View>

        {/* Products */}
        <Text style={styles.sectionTitle}>Prodotti disponibili</Text>
        <View style={styles.grid}>
          {products.map((product) => {
            const stock = product.stocks[0];
            if (!stock) return null;

            return (
              <View key={product.id} style={styles.card}>
                {product.imageUrl ? (
                  <Image src={product.imageUrl} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={{ fontSize: 20 }}>
                      {product.isOrganic ? "🌿" : "📦"}
                    </Text>
                  </View>
                )}

                <View style={styles.cardBody}>
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
                    <Text style={styles.cardMeta}>{product.category}</Text>
                  )}
                  {product.producer && (
                    <Text style={styles.cardMeta}>{product.producer}</Text>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>€ {stock.price.toFixed(2)}</Text>
                    {product.unitOfMeasure && (
                      <Text style={styles.unit}>/{product.unitOfMeasure}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name} · Catalogo prodotti
          </Text>
          <Text style={styles.footerText}>{today}</Text>
        </View>
      </Page>
    </Document>
  );
}
