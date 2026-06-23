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

export function createReceiptPdf(data: ReceiptPdfData): Blob {
  const lines = [
    { text: "ShopScript", size: 20 },
    { text: "E-commerce Simulation Receipt", size: 11 },
    { text: "", size: 10 },
    { text: "Thank you, " + data.user + "!", size: 12 },
    { text: "Order ID: " + data.orderId, size: 10 },
    { text: "Date: " + new Date().toLocaleString(), size: 10 },
    { text: "", size: 10 },
    { text: "ITEMS", size: 11 },
    ...data.items.map(item => ({ text: item.name + "  x" + item.quantity + "    $" + (item.price * item.quantity).toFixed(2), size: 10 })),
    { text: "", size: 10 },
    { text: "Subtotal: $" + data.subtotal.toFixed(2), size: 10 },
    ...(data.coupon ? [{ text: "Coupon " + data.coupon + ": -$" + data.discount.toFixed(2), size: 10 }] : []),
    { text: "Shipping: $" + data.shipping.toFixed(2), size: 10 },
    { text: "TOTAL PAID: $" + data.total.toFixed(2), size: 14 },
    { text: "", size: 10 },
    { text: "Educational simulation only - no real payment was processed.", size: 9 },
  ];

  let y = 750;
  const commands = ["BT", "72 750 Td"];
  for (const line of lines) {
    commands.push("/F1 " + line.size + " Tf");
    commands.push("0 " + (y === 750 ? 0 : -18) + " Td");
    commands.push("(" + escapePdfText(line.text) + ") Tj");
    y -= 18;
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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
