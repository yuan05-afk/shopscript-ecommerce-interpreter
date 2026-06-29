import type { Theme } from "./theme-manager";

export interface ReceiptPdfData {
  user: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  coupon: string | null;
  discount: number;
  shipping: number;
  total: number;
  theme?: Theme;
}

function ascii(value: string): string {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value: string): string {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(value: number): string {
  return "$" + value.toFixed(2);
}

function clampText(value: string, maxLength: number): string {
  const clean = ascii(value).trim();
  return clean.length > maxLength ? clean.slice(0, Math.max(0, maxLength - 1)) + "..." : clean;
}

type ReceiptPalette = {
  page: string;
  sheet: string;
  sheetBorder: string;
  header: string;
  headerText: string;
  headerSoft: string;
  markBg: string;
  markInk: string;
  text: string;
  muted: string;
  subtleText: string;
  line: string;
  row: string;
  panel: string;
  panelBorder: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentBorder: string;
  danger: string;
  success: string;
  footer: string;
};

const RECEIPT_PALETTES: Record<Theme, ReceiptPalette> = {
  default: {
    page: "#F8FAFC",
    sheet: "#FFFFFF",
    sheetBorder: "#E5E7EB",
    header: "#FF6B1A",
    headerText: "#FFFFFF",
    headerSoft: "#FFF7ED",
    markBg: "#FFFFFF",
    markInk: "#FF6B1A",
    text: "#111827",
    muted: "#4B5563",
    subtleText: "#6B7280",
    line: "#E5E7EB",
    row: "#F9FAFB",
    panel: "#F9FAFB",
    panelBorder: "#E5E7EB",
    accent: "#FF6B1A",
    accentStrong: "#9A3412",
    accentSoft: "#FFF7ED",
    accentBorder: "#FDBA74",
    danger: "#DC2626",
    success: "#15803D",
    footer: "#9CA3AF",
  },
  "emerald-gold": {
    page: "#F3F1E7",
    sheet: "#FFFEFA",
    sheetBorder: "#D8C99E",
    header: "#0D3B2E",
    headerText: "#FFFDF2",
    headerSoft: "#E6D8A8",
    markBg: "#C5A059",
    markInk: "#0D3B2E",
    text: "#0D3B2E",
    muted: "#476558",
    subtleText: "#68756E",
    line: "#D8C99E",
    row: "#F8F3E4",
    panel: "#FBF8EF",
    panelBorder: "#C5A059",
    accent: "#C5A059",
    accentStrong: "#0D3B2E",
    accentSoft: "#F4ECD7",
    accentBorder: "#C5A059",
    danger: "#B91C1C",
    success: "#047857",
    footer: "#7B6F46",
  },
  midnight: {
    page: "#0B0B0D",
    sheet: "#161618",
    sheetBorder: "#3A1C24",
    header: "#C8102E",
    headerText: "#FFFFFF",
    headerSoft: "#FFD9DF",
    markBg: "#F4F4F4",
    markInk: "#C8102E",
    text: "#F4F4F4",
    muted: "#D1D5DB",
    subtleText: "#A8A8A8",
    line: "#3F3F46",
    row: "#1F1F22",
    panel: "#111113",
    panelBorder: "#6F1728",
    accent: "#FF4D64",
    accentStrong: "#FF6B81",
    accentSoft: "#2A1117",
    accentBorder: "#C8102E",
    danger: "#FB7185",
    success: "#86EFAC",
    footer: "#8B8B92",
  },
  "cyber-ochre": {
    page: "#050505",
    sheet: "#10100D",
    sheetBorder: "#4D3B07",
    header: "#FFE600",
    headerText: "#050505",
    headerSoft: "#4D3B07",
    markBg: "#050505",
    markInk: "#FFE600",
    text: "#FFF8C7",
    muted: "#F5F2D8",
    subtleText: "#BDB57A",
    line: "#514008",
    row: "#17170F",
    panel: "#0B0B08",
    panelBorder: "#B38A00",
    accent: "#FFE600",
    accentStrong: "#FFB300",
    accentSoft: "#2A2400",
    accentBorder: "#FFE600",
    danger: "#FF8A1F",
    success: "#B6FF00",
    footer: "#9C9461",
  },
};

function receiptPalette(theme: Theme | undefined): ReceiptPalette {
  return RECEIPT_PALETTES[theme ?? "default"] ?? RECEIPT_PALETTES.default;
}
interface PdfCommandWriter {
  rect: (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number, color?: string, width?: number) => void;
  text: (value: string, x: number, y: number, size: number, font?: "regular" | "bold" | "mono", color?: string) => void;
  rightText: (value: string, x: number, y: number, size: number, font?: "regular" | "bold" | "mono", color?: string) => void;
  centerText: (value: string, x: number, y: number, size: number, font?: "regular" | "bold" | "mono", color?: string) => void;
  commands: string[];
}

const FONT_MAP = {
  regular: "F1",
  bold: "F2",
  mono: "F3",
};

function rgb(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3);
}

function createWriter(): PdfCommandWriter {
  const commands: string[] = [];
  const setFill = (hex: string) => rgb(hex) + " rg";
  const setStroke = (hex: string) => rgb(hex) + " RG";

  return {
    commands,
    rect(x, y, w, h, fill, stroke) {
      commands.push("q");
      commands.push(setFill(fill));
      if (stroke) commands.push(setStroke(stroke));
      commands.push(x + " " + y + " " + w + " " + h + " re " + (stroke ? "B" : "f"));
      commands.push("Q");
    },
    line(x1, y1, x2, y2, color = "#E5E7EB", width = 1) {
      commands.push("q");
      commands.push(setStroke(color));
      commands.push(width + " w");
      commands.push(x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
      commands.push("Q");
    },
    text(value, x, y, size, font = "regular", color = "#111827") {
      commands.push("BT");
      commands.push("/" + FONT_MAP[font] + " " + size + " Tf");
      commands.push(setFill(color));
      commands.push(x + " " + y + " Td");
      commands.push("(" + escapePdfText(value) + ") Tj");
      commands.push("ET");
    },
    rightText(value, x, y, size, font = "regular", color = "#111827") {
      const estimatedWidth = ascii(value).length * size * 0.52;
      this.text(value, x - estimatedWidth, y, size, font, color);
    },
    centerText(value, x, y, size, font = "regular", color = "#111827") {
      const estimatedWidth = ascii(value).length * size * 0.52;
      this.text(value, x - estimatedWidth / 2, y, size, font, color);
    },
  };
}

function pdfPath(writer: PdfCommandWriter, path: string, fill: string, stroke?: string, width = 1): void {
  writer.commands.push("q");
  writer.commands.push(rgb(fill) + " rg");
  if (stroke) {
    writer.commands.push(rgb(stroke) + " RG");
    writer.commands.push(width + " w");
  }
  writer.commands.push(path + " " + (stroke ? "B" : "f"));
  writer.commands.push("Q");
}

function pdfStrokePath(writer: PdfCommandWriter, path: string, color: string, width: number): void {
  writer.commands.push("q");
  writer.commands.push(rgb(color) + " RG");
  writer.commands.push(width + " w");
  writer.commands.push("1 J 1 j");
  writer.commands.push(path + " S");
  writer.commands.push("Q");
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const c = r * 0.55228475;
  return [
    `${x + r} ${y} m`,
    `${x + w - r} ${y} l`,
    `${x + w - r + c} ${y} ${x + w} ${y + r - c} ${x + w} ${y + r} c`,
    `${x + w} ${y + h - r} l`,
    `${x + w} ${y + h - r + c} ${x + w - r + c} ${y + h} ${x + w - r} ${y + h} c`,
    `${x + r} ${y + h} l`,
    `${x + r - c} ${y + h} ${x} ${y + h - r + c} ${x} ${y + h - r} c`,
    `${x} ${y + r} l`,
    `${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c`,
    "h",
  ].join(" ");
}

function circlePath(cx: number, cy: number, r: number): string {
  const c = r * 0.55228475;
  return [
    `${cx + r} ${cy} m`,
    `${cx + r} ${cy + c} ${cx + c} ${cy + r} ${cx} ${cy + r} c`,
    `${cx - c} ${cy + r} ${cx - r} ${cy + c} ${cx - r} ${cy} c`,
    `${cx - r} ${cy - c} ${cx - c} ${cy - r} ${cx} ${cy - r} c`,
    `${cx + c} ${cy - r} ${cx + r} ${cy - c} ${cx + r} ${cy} c`,
    "h",
  ].join(" ");
}

function drawReceiptLogo(writer: PdfCommandWriter, x: number, y: number, size: number, palette: ReceiptPalette): void {
  const sx = (value: number) => x + (value / 180) * size;
  const sy = (value: number) => y + size - (value / 180) * size;
  const strokeScale = size / 180;
  const tile = palette.markBg;
  const bag = palette.header;
  const ink = palette.markInk;
  const code = palette.headerText;

  pdfPath(writer, roundedRectPath(x, y, size, size, size * 0.21), tile);
  pdfPath(writer, [
    `${sx(58)} ${sy(75)} m`,
    `${sx(122)} ${sy(75)} l`,
    `${sx(115.2)} ${sy(126.5)} l`,
    `${sx(101.4)} ${sy(139)} l`,
    `${sx(78.6)} ${sy(139)} l`,
    `${sx(64.8)} ${sy(126.5)} l`,
    "h",
  ].join(" "), bag);
  pdfStrokePath(writer, `${sx(68)} ${sy(75)} m ${sx(68)} ${sy(53)} ${sx(78.5)} ${sy(39)} ${sx(90)} ${sy(39)} c ${sx(101.5)} ${sy(39)} ${sx(112)} ${sy(53)} ${sx(112)} ${sy(75)} c`, ink, 12 * strokeScale);
  pdfStrokePath(writer, `${sx(82)} ${sy(96)} m ${sx(66)} ${sy(110)} l ${sx(82)} ${sy(124)} l`, code, 11 * strokeScale);
  pdfStrokePath(writer, `${sx(98)} ${sy(96)} m ${sx(114)} ${sy(110)} l ${sx(98)} ${sy(124)} l`, code, 11 * strokeScale);
  pdfPath(writer, circlePath(sx(128), sy(52), 11 * strokeScale), ink);
  pdfStrokePath(writer, `${sx(128)} ${sy(47)} m ${sx(128)} ${sy(57)} l ${sx(123)} ${sy(52)} m ${sx(133)} ${sy(52)} l`, tile, 4 * strokeScale);
}

export function createReceiptPdf(data: ReceiptPdfData): Blob {
  const writer = createWriter();
  const issuedAt = new Date();
  const orderDate = issuedAt.toLocaleDateString();
  const orderTime = issuedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const itemCount = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const palette = receiptPalette(data.theme);

  // Page background and outer receipt sheet.
  writer.rect(0, 0, 612, 792, palette.page);
  writer.rect(48, 44, 516, 704, palette.sheet, palette.sheetBorder);

  // Branded header.
  writer.rect(48, 668, 516, 80, palette.header);
  drawReceiptLogo(writer, 72, 696, 40, palette);
  writer.text("ShopScript", 122, 716, 25, "bold", palette.headerText);
  writer.text("E-commerce simulation receipt", 123, 698, 10, "regular", palette.headerSoft);
  writer.rect(458, 702, 72, 24, palette.markBg);
  writer.centerText("PAID", 494, 711, 10, "bold", palette.markInk);

  // Receipt summary banner.
  writer.text("Receipt", 72, 628, 22, "bold", palette.text);
  writer.text("Thank you, " + clampText(data.user || "Guest", 24) + ". Order validated successfully.", 72, 606, 10, "regular", palette.muted);
  writer.rect(72, 548, 214, 48, palette.panel, palette.panelBorder);
  writer.text("Customer", 88, 578, 8, "bold", palette.subtleText);
  writer.text(clampText(data.user || "Guest", 24), 88, 562, 12, "bold", palette.text);
  writer.rect(304, 548, 214, 48, palette.accentSoft, palette.accentBorder);
  writer.text("Order ID", 320, 578, 8, "bold", palette.accentStrong);
  writer.text(clampText(data.orderId, 22), 320, 562, 10, "mono", palette.text);
  writer.text("Issued " + orderDate + " " + orderTime, 320, 552, 7, "regular", palette.muted);

  // Item table.
  writer.text("Order items", 72, 520, 13, "bold", palette.text);
  writer.text(String(itemCount) + " item" + (itemCount === 1 ? "" : "s"), 150, 520, 9, "regular", palette.subtleText);
  writer.line(72, 506, 540, 506, palette.line, 1);
  writer.text("Item", 72, 490, 8, "bold", palette.subtleText);
  writer.rightText("Qty", 360, 490, 8, "bold", palette.subtleText);
  writer.rightText("Unit", 444, 490, 8, "bold", palette.subtleText);
  writer.rightText("Amount", 540, 490, 8, "bold", palette.subtleText);
  writer.line(72, 480, 540, 480, palette.line, 1);

  let y = 460;
  const visibleItems = data.items.slice(0, 10);
  visibleItems.forEach((item, index) => {
    if (index % 2 === 1) writer.rect(72, y - 8, 468, 24, palette.row);
    writer.text(clampText(item.name, 34), 82, y, 10, "regular", palette.text);
    writer.rightText(String(item.quantity), 360, y, 10, "regular", palette.muted);
    writer.rightText(money(item.price), 444, y, 10, "regular", palette.muted);
    writer.rightText(money(item.price * item.quantity), 540, y, 10, "bold", palette.text);
    y -= 25;
  });

  if (data.items.length > visibleItems.length) {
    writer.text("+ " + (data.items.length - visibleItems.length) + " more item(s)", 82, y, 9, "regular", palette.subtleText);
    y -= 20;
  }

  writer.line(72, y + 8, 540, y + 8, palette.line, 1);

  // Details and totals panels.
  const panelsTop = Math.min(y - 34, 292);
  writer.rect(72, panelsTop - 126, 220, 126, palette.panel, palette.panelBorder);
  writer.text("Transaction details", 92, panelsTop - 24, 12, "bold", palette.text);
  writer.text("Status", 92, panelsTop - 50, 9, "bold", palette.subtleText);
  writer.text("Order confirmed", 160, panelsTop - 50, 9, "regular", palette.success);
  writer.text("Items", 92, panelsTop - 70, 9, "bold", palette.subtleText);
  writer.text(String(itemCount), 160, panelsTop - 70, 9, "regular", palette.muted);
  writer.text("Payment", 92, panelsTop - 90, 9, "bold", palette.subtleText);
  writer.text("Not processed", 160, panelsTop - 90, 9, "regular", palette.muted);
  writer.text("Method", 92, panelsTop - 110, 9, "bold", palette.subtleText);
  writer.text("ShopScript checkout", 160, panelsTop - 110, 9, "regular", palette.muted);

  writer.rect(320, panelsTop - 142, 220, 142, palette.accentSoft, palette.accentBorder);
  writer.text("Payment summary", 340, panelsTop - 24, 12, "bold", palette.accentStrong);
  writer.text("Subtotal", 340, panelsTop - 52, 10, "regular", palette.muted);
  writer.rightText(money(data.subtotal), 516, panelsTop - 52, 10, "regular", palette.text);
  writer.text(data.coupon ? "Coupon " + clampText(data.coupon, 12) : "Discount", 340, panelsTop - 74, 10, "regular", palette.muted);
  writer.rightText("-" + money(data.discount), 516, panelsTop - 74, 10, "regular", palette.danger);
  writer.text("Shipping", 340, panelsTop - 96, 10, "regular", palette.muted);
  writer.rightText(money(data.shipping), 516, panelsTop - 96, 10, "regular", palette.text);
  writer.line(340, panelsTop - 110, 516, panelsTop - 110, palette.accentBorder, 1);
  writer.text("Total paid", 340, panelsTop - 132, 13, "bold", palette.text);
  writer.rightText(money(data.total), 516, panelsTop - 132, 16, "bold", palette.accent);

  // Footer.
  writer.line(72, 100, 540, 100, palette.line, 1);
  writer.centerText("Educational simulation only - no real payment was processed.", 306, 78, 9, "regular", palette.subtleText);
  writer.centerText("Generated by ShopScript v0.3.0", 306, 64, 8, "regular", palette.footer);
  const stream = writer.commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += index + 1 + " 0 obj\n" + object + "\nendobj\n";
  });
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index++) pdf += offsets[index].toString().padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return new Blob([new TextEncoder().encode(pdf)], { type: "application/pdf" });
}

export function downloadReceiptPdf(data: ReceiptPdfData): void {
  const url = URL.createObjectURL(createReceiptPdf(data));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ShopScript-Receipt-" + ascii(data.orderId).replace(/[^A-Za-z0-9-]/g, "") + ".pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}