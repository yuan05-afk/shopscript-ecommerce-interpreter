export interface ReceiptPdfData {
  user: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  coupon: string | null;
  discount: number;
  shipping: number;
  total: number;
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

export function createReceiptPdf(data: ReceiptPdfData): Blob {
  const writer = createWriter();
  const issuedAt = new Date();
  const orderDate = issuedAt.toLocaleDateString();
  const orderTime = issuedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const itemCount = data.items.reduce((sum, item) => sum + item.quantity, 0);

  // Page background and outer receipt sheet.
  writer.rect(0, 0, 612, 792, "#F8FAFC");
  writer.rect(54, 48, 504, 696, "#FFFFFF", "#E5E7EB");

  // Branded header.
  writer.rect(54, 664, 504, 80, "#FF6B1A");
  writer.rect(78, 692, 34, 34, "#FFFFFF");
  writer.text("</>", 86, 704, 13, "bold", "#FF6B1A");
  writer.text("ShopScript", 126, 712, 24, "bold", "#FFFFFF");
  writer.text("E-commerce Simulation Receipt", 127, 694, 11, "regular", "#FFF7ED");
  writer.text("PAID", 480, 710, 12, "bold", "#FFFFFF");
  writer.text("Simulated", 463, 693, 9, "regular", "#FFF7ED");

  // Customer and order metadata.
  writer.text("Receipt", 78, 624, 18, "bold", "#111827");
  writer.text("Thank you, " + clampText(data.user || "Guest", 28) + ".", 78, 604, 11, "regular", "#4B5563");

  writer.rect(352, 584, 170, 54, "#FFF7ED", "#FED7AA");
  writer.text("Order ID", 366, 620, 8, "bold", "#9A3412");
  writer.text(clampText(data.orderId, 24), 366, 606, 10, "mono", "#111827");
  writer.text("Issued", 366, 592, 8, "bold", "#9A3412");
  writer.text(orderDate + "  " + orderTime, 407, 592, 8, "regular", "#374151");

  writer.line(78, 566, 522, 566, "#E5E7EB", 1);

  // Item table.
  writer.text("Item", 78, 542, 9, "bold", "#6B7280");
  writer.rightText("Qty", 344, 542, 9, "bold", "#6B7280");
  writer.rightText("Unit", 428, 542, 9, "bold", "#6B7280");
  writer.rightText("Amount", 522, 542, 9, "bold", "#6B7280");
  writer.line(78, 532, 522, 532, "#D1D5DB", 1);

  let y = 512;
  const visibleItems = data.items.slice(0, 12);
  visibleItems.forEach((item, index) => {
    if (index % 2 === 1) writer.rect(78, y - 7, 444, 22, "#F9FAFB");
    writer.text(clampText(item.name, 30), 78, y, 10, "regular", "#111827");
    writer.rightText(String(item.quantity), 344, y, 10, "regular", "#374151");
    writer.rightText(money(item.price), 428, y, 10, "regular", "#374151");
    writer.rightText(money(item.price * item.quantity), 522, y, 10, "bold", "#111827");
    y -= 24;
  });

  if (data.items.length > visibleItems.length) {
    writer.text("+ " + (data.items.length - visibleItems.length) + " more item(s)", 78, y, 9, "regular", "#6B7280");
    y -= 20;
  }

  writer.line(78, y + 8, 522, y + 8, "#E5E7EB", 1);

  // Totals panel.
  const totalsTop = Math.min(y - 24, 300);
  writer.rect(330, totalsTop - 126, 192, 126, "#FFF7ED", "#FDBA74");
  writer.text("Summary", 350, totalsTop - 24, 11, "bold", "#9A3412");
  writer.text("Subtotal", 350, totalsTop - 46, 10, "regular", "#4B5563");
  writer.rightText(money(data.subtotal), 502, totalsTop - 46, 10, "regular", "#111827");
  writer.text(data.coupon ? "Coupon " + clampText(data.coupon, 12) : "Discount", 350, totalsTop - 66, 10, "regular", "#4B5563");
  writer.rightText("-" + money(data.discount), 502, totalsTop - 66, 10, "regular", "#DC2626");
  writer.text("Shipping", 350, totalsTop - 86, 10, "regular", "#4B5563");
  writer.rightText(money(data.shipping), 502, totalsTop - 86, 10, "regular", "#111827");
  writer.line(350, totalsTop - 98, 502, totalsTop - 98, "#FDBA74", 1);
  writer.text("Total paid", 350, totalsTop - 118, 12, "bold", "#111827");
  writer.rightText(money(data.total), 502, totalsTop - 118, 14, "bold", "#FF6B1A");

  // Small details panel.
  writer.rect(78, totalsTop - 126, 220, 126, "#F9FAFB", "#E5E7EB");
  writer.text("Transaction details", 96, totalsTop - 24, 11, "bold", "#111827");
  writer.text("Status", 96, totalsTop - 48, 9, "bold", "#6B7280");
  writer.text("Order confirmed", 150, totalsTop - 48, 9, "regular", "#15803D");
  writer.text("Items", 96, totalsTop - 68, 9, "bold", "#6B7280");
  writer.text(String(itemCount), 150, totalsTop - 68, 9, "regular", "#374151");
  writer.text("Payment", 96, totalsTop - 88, 9, "bold", "#6B7280");
  writer.text("Simulation only", 150, totalsTop - 88, 9, "regular", "#374151");
  writer.text("Method", 96, totalsTop - 108, 9, "bold", "#6B7280");
  writer.text("ShopScript checkout", 150, totalsTop - 108, 9, "regular", "#374151");

  // Footer.
  writer.line(78, 96, 522, 96, "#E5E7EB", 1);
  writer.centerText("Educational simulation only - no real payment was processed.", 306, 76, 9, "regular", "#6B7280");
  writer.centerText("Generated by ShopScript v0.2.0", 306, 62, 8, "regular", "#9CA3AF");

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