import { useState, useEffect } from 'react';
import { toBlob } from 'html-to-image';
import { SLOTS, slotTimeFor, classLabel } from '../constants';

export default function ShareModal({ exportRef, title, deptLectures, allLectures, teachers, onClose }) {
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const slug = (title || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = 'timetable-' + slug + '.png';

  const makeImage = async () => {
    if (!exportRef.current) throw new Error('The timetable is not visible. Add a class first.');
    return toBlob(exportRef.current, {

      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter: (node) => !(node.classList && (node.classList.contains('add-hint') || node.classList.contains('tt-count'))),
    });
  };

  const buildSummary = () => {
    const source = teacherId ? allLectures : deptLectures;
    const people = teachers.filter((t) => !teacherId || t._id === teacherId);
    const heading = teacherId ? 'Timetable for ' + people[0].name : (title || 'All departments') + ' - Weekly Timetable';
    const lines = ['*' + heading + '*'];
    people.forEach((t) => {
      const mine = source.filter((l) => l.teacher._id === t._id).sort((a, b) => a.slot - b.slot);
      if (mine.length === 0) return;
      lines.push('', '*' + t.name + '* (' + mine.length + ' lectures)');
      mine.forEach((l) => {
        const slot = SLOTS.find((s) => s.no === l.slot);
        lines.push(
          '- ' + (l.day ? l.day + ' ' : '') + slotTimeFor(l.slot, l.day, l.classGroup) + ' | ' + classLabel(l.classGroup) + ' | ' +
          l.subject.name + (l.room ? ' | ' + l.room : '')
        );
      });
    });
    if (lines.length === 1) lines.push('', 'No lectures scheduled yet.');
    return lines.join('\n');
  };

  const run = async (fn) => {
    setBusy(true);
    setStatus('');
    try {
      await fn();
    } catch (err) {
      if (err.name !== 'AbortError') setStatus(err.message || 'Something went wrong.');
    }
    setBusy(false);
  };

  const download = () =>
    run(async () => {
      const blob = await makeImage();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Image downloaded.');
    });

  const copyImage = () =>
    run(async () => {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error('This browser cannot copy images. Use Download PNG instead.');
      }
      const blob = await makeImage();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus('Image copied. Open WhatsApp and paste it with Ctrl + V.');
    });

  const openWhatsApp = () => window.open('https://web.whatsapp.com/', '_blank');

  const sendText = () =>
    window.open('https://wa.me/?text=' + encodeURIComponent(buildSummary()), '_blank');

  const copyText = () =>
    run(async () => {
      await navigator.clipboard.writeText(buildSummary());
      setStatus('Text copied.');
    });

  const deviceShare = () =>
    run(async () => {
      if (!navigator.share) {
        throw new Error('Device sharing is not available in this browser. Use Download PNG or WhatsApp.');
      }
      const blob = await makeImage();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title + ' Timetable' });
      } else {
        await navigator.share({ title: title + ' Timetable', text: buildSummary() });
      }
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button type="button" title="Close" onClick={onClose} style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, border: "none", borderRadius: "50%", background: "#e2e8f0", color: "#475569", fontSize: 20, lineHeight: 1, cursor: "pointer", zIndex: 5 }}>&times;</button>
        <h3>Save and Share Timetable</h3>
        <p className="hint">The image contains the {title || 'current'} timetable shown on screen.</p>
        {status && <div className="share-status">{status}</div>}

        <div className="share-option">
          <h4>Save to this computer</h4>
          <p>Download a high-resolution PNG image.</p>
          <button className="btn" disabled={busy} onClick={download}>Download PNG</button>
        </div>

        <div className="share-option recommended">
          <h4>Share image on WhatsApp</h4>
          <p>Copy the image, open WhatsApp, then paste it into any chat.</p>
          <div className="share-row">
            <button className="btn btn-green" disabled={busy} onClick={copyImage}>1. Copy image</button>
            <button className="btn btn-secondary" onClick={openWhatsApp}>2. Open WhatsApp</button>
          </div>
        </div>

        <div className="share-option">
          <h4>WhatsApp text summary</h4>
          <p>Send a teacher-wise list of lectures as a text message.</p>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">All teachers in {title || 'this department'}</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>{t.name} (all departments)</option>
            ))}
          </select>
          <div className="share-row">
            <button className="btn btn-green" onClick={sendText}>Send on WhatsApp</button>
            <button className="btn btn-secondary" disabled={busy} onClick={copyText}>Copy text</button>
          </div>
        </div>

        <div className="share-option">
          <h4>Device share</h4>
          <p>Use the sharing menu of your phone or computer.</p>
          <button className="btn" disabled={busy} onClick={deviceShare}>Open share dialog</button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}











