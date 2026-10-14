import React, { useState } from 'react';
import { FileImage, FileText, Upload, Check, AlertCircle } from 'lucide-react';
import { api } from './api.js';

const DAYS = { sunday:0, sun:0, monday:1, mon:1, tuesday:2, tue:2, wednesday:3, wed:3, thursday:4, thu:4, friday:5, fri:5, saturday:6, sat:6 };
function parseClock(raw) {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]), min = Number(m[2] || 0), ap = (m[3] || '').toUpperCase();
  if (h > 23 || min > 59 || (ap && (h < 1 || h > 12))) return null;
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}
function extractCandidates(text, subjects) {
  const rows=[];
  for (const line of text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)) {
    const dayMatch = line.toLowerCase().match(/\b(sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat)\b/);
    const timeMatch = line.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    if (!dayMatch || !timeMatch) continue;
    const lower=line.toLowerCase();
    const subject=subjects.slice().sort((a,b)=>b.name.length-a.name.length).find(s=>lower.includes(s.name.toLowerCase()) || (s.code && lower.includes(s.code.toLowerCase())));
    const startTime=parseClock(timeMatch[1]), endTime=parseClock(timeMatch[2]);
    if (!subject || !startTime || !endTime || startTime>=endTime) continue;
    const roomMatch=line.match(/\b(room|rm|lab)\s*[:#-]?\s*([A-Z0-9-]+)/i);
    rows.push({ key:`${rows.length}-${subject._id}-${startTime}`, subject:subject._id, subjectName:subject.name, weekday:DAYS[dayMatch[1].toLowerCase()], startTime, endTime, room:roomMatch?`${roomMatch[1]} ${roomMatch[2]}`:'' , sourceLine:line, selected:true });
  }
  return rows;
}
export default function TimetableOCRImport({ subjects, token, onImported }) {
  const [busy,setBusy]=useState(false), [progress,setProgress]=useState(''), [text,setText]=useState(''), [rows,setRows]=useState([]), [error,setError]=useState(''), [result,setResult]=useState('');
  async function scan(event) {
    const file=event.target.files?.[0]; event.target.value=''; if(!file)return;
    setError('');setResult('');setRows([]);setText('');
    if(!file.type.startsWith('image/') && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){setError('Choose a timetable image or PDF file. For spreadsheet exports, use the CSV import below.');return;}
    if(file.size>20*1024*1024){setError('File must be smaller than 20 MB.');return;}
    setBusy(true);setProgress('Loading OCR engine…');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker=await createWorker('eng', 1, { logger:m=>{ if(m.status==='recognizing text')setProgress(`Reading timetable: ${Math.round((m.progress||0)*100)}%`); } });
      try {
        let images = [file];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setProgress('Opening PDF pages…');
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
          const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
          if (pdf.numPages > 12) throw new Error('PDF has more than 12 pages. Upload a shorter timetable PDF.');
          images = [];
          for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            setProgress(`Preparing PDF page ${pageNo} of ${pdf.numPages}…`);
            const page = await pdf.getPage(pageNo);
            const viewport = page.getViewport({ scale: 1.8 });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            images.push(canvas);
          }
        }
        let extracted = '';
        for (let i = 0; i < images.length; i++) {
          setProgress(`Reading page ${i+1} of ${images.length}…`);
          const output = await worker.recognize(images[i]);
          extracted += `\n${output.data.text || ''}`;
        }
        setText(extracted);
        const candidates=extractCandidates(extracted,subjects);setRows(candidates);setProgress('');
        if(!candidates.length)setResult('Text was extracted, but no class rows could be confidently matched. Review the extracted text and use the CSV import for reliable bulk import.');
      } finally { await worker.terminate(); }
    } catch { setError('Could not read this image. Try a clearer, well-lit image with readable subject names, weekdays, and time ranges.'); }
    finally { setBusy(false);setProgress(''); }
  }
  function update(key,patch){setRows(current=>current.map(row=>row.key===key?{...row,...patch}:row));}
  async function importSelected(){setBusy(true);setError('');setResult('');let added=0;const failures=[];for(const row of rows.filter(x=>x.selected)){try{await api('/timetable',{method:'POST',token,body:{subject:row.subject,weekday:Number(row.weekday),startTime:row.startTime,endTime:row.endTime,room:row.room}});added++;}catch(e){failures.push(`${row.subjectName}: ${e.message}`);}}await onImported();setBusy(false);setResult(`${added} class slot(s) imported.${failures.length?` ${failures.length} row(s) were skipped because of validation or conflicts.`:''}`);if(failures.length)setError(failures.slice(0,3).join(' '));}
  return <section className="panel ocr-panel"><div className="panel-title"><div><h2>Import from timetable image or PDF</h2><p className="muted">OCR extracts text from an image or PDF and proposes rows. Review every suggestion before importing.</p></div><span className="panel-icon"><FileText/></span></div><label className="file-import"><FileImage size={16}/> Choose timetable image or PDF<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" onChange={scan} disabled={busy}/></label>{busy&&<p className="ocr-progress">{progress||'Working…'}</p>}{error&&<p className="ocr-message error-text"><AlertCircle size={15}/>{error}</p>}{result&&<p className="ocr-message">{result}</p>}{rows.length>0&&<><div className="ocr-table-wrap"><table><thead><tr><th>Import</th><th>Subject</th><th>Day</th><th>Start</th><th>End</th><th>Room</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td><input type="checkbox" checked={row.selected} onChange={e=>update(row.key,{selected:e.target.checked})} aria-label={`Import ${row.subjectName}`}/></td><td>{row.subjectName}</td><td><select value={row.weekday} onChange={e=>update(row.key,{weekday:Number(e.target.value)})}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i)=><option key={d} value={i}>{d}</option>)}</select></td><td><input type="time" value={row.startTime} onChange={e=>update(row.key,{startTime:e.target.value})}/></td><td><input type="time" value={row.endTime} onChange={e=>update(row.key,{endTime:e.target.value})}/></td><td><input value={row.room} onChange={e=>update(row.key,{room:e.target.value})} maxLength={50}/></td></tr>)}</tbody></table></div><p className="ocr-source">Extracted line examples: {rows.slice(0,3).map(r=>r.sourceLine).join(' | ')}</p><button className="primary" onClick={importSelected} disabled={busy||!rows.some(r=>r.selected)}><Check size={15}/> Import selected rows</button></>}{text&&!rows.length&&<details className="ocr-text"><summary>Review extracted text</summary><pre>{text}</pre></details>}<p className="muted ocr-disclaimer">OCR can misread text or times. This tool only imports rows that match an existing subject and a recognizable day/time range. Always verify the timetable after import.</p></section>;
}
