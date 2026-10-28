import { jsPDF } from 'jspdf';

type CardInput = { eventName: string; section: string; itemName: string; options: string[] };
const WIDTH = 1240;
const HEIGHT = 1754;
const NAVY = '#122638';
const GOLD = '#bfa15c';

async function loadLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const logo = new Image();
    logo.onload = () => resolve(logo);
    logo.onerror = () => reject(new Error('The company logo could not be loaded. Please try again.'));
    logo.src = new URL('resources/company-logo.png', document.baseURI).href;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of Array.from(text)) {
    if (character === '\n') { lines.push(line.trim()); line = ''; continue; }
    if (ctx.measureText(line + character).width > maxWidth && line) {
      const space = line.lastIndexOf(' ');
      if (space > line.length / 2) {
        lines.push(line.slice(0, space).trim());
        line = line.slice(space + 1) + character;
      } else { lines.push(line.trim()); line = character; }
    } else line += character;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export async function downloadMenuCard(input: CardInput): Promise<void> {
  if (!input.options.length) throw new Error('Select at least one menu option before downloading a card.');
  const logo = await loadLogo();
  await document.fonts.ready;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });
  let page = 0;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let y = 0;
  const newPage = () => {
    canvas = document.createElement('canvas');
    canvas.width = WIDTH; canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create the menu card.');
    ctx = context;
    ctx.fillStyle = '#fcfaf3'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, WIDTH - 88, HEIGHT - 88);
    ctx.fillStyle = NAVY; ctx.fillRect(62, 62, WIDTH - 124, 340);
    // Screen compositing keeps the original white logo exact while removing black on the navy header.
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const size = 280;
    ctx.drawImage(logo, (WIDTH - size) / 2, 78, size, size);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = '#e3cf96'; ctx.font = '600 15px Arial, sans-serif';
    ctx.fillText('ROYAL CONCEPT EVENT', WIDTH / 2, 380);
    ctx.fillStyle = '#73827c'; ctx.font = '600 19px Arial, sans-serif';
    ctx.fillText(input.section.toUpperCase(), WIDTH / 2, 458);
    y = 510;
    ctx.fillStyle = NAVY; ctx.font = '500 39px Georgia, serif';
    for (const line of wrap(ctx, input.eventName, 940)) { ctx.fillText(line, WIDTH / 2, y); y += 49; }
    y += 18;
    ctx.fillStyle = '#8f7133'; ctx.font = 'italic 36px Georgia, serif';
    for (const line of wrap(ctx, input.itemName, 940)) { ctx.fillText(line, WIDTH / 2, y); y += 46; }
    y += 27;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(490, y); ctx.lineTo(750, y); ctx.stroke();
    y += 57;
    ctx.fillStyle = NAVY; ctx.font = '600 23px Arial, sans-serif';
    ctx.fillText(input.section === 'Food & Beverage' ? 'MENU' : 'SELECTED OPTIONS', WIDTH / 2, y);
    y += 62;
    ctx.fillStyle = '#7b826e'; ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Thoughtfully prepared for your event', WIDTH / 2, HEIGHT - 105);
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('ROYAL CONCEPT', WIDTH / 2, HEIGHT - 78);
  };
  const commitPage = () => {
    if (page > 0) pdf.addPage('a5', 'portrait');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 148, 210);
    page += 1;
  };
  newPage();
  for (const option of input.options) {
    ctx!.font = '29px Georgia, serif';
    const lines = wrap(ctx!, option, 900);
    const height = lines.length * 40 + 25;
    if (y + height > HEIGHT - 180) { commitPage(); newPage(); }
    ctx!.fillStyle = '#2f4845'; ctx!.font = '29px Georgia, serif';
    for (const line of lines) { ctx!.fillText(line, WIDTH / 2, y); y += 40; }
    y += 25;
  }
  commitPage();
  const filename = input.itemName.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'prepared';
  pdf.save('royal-concept-' + filename + '-menu-card.pdf');
}
