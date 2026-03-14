import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

export default function ExportButton({ endpoint, filters = {}, filename = 'report', label = 'Export' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = async (format) => {
    setLoading(true); setOpen(false);
    try {
      // Build query string from endpoint + format + filters
      const url = new URL(endpoint, 'http://placeholder');
      url.searchParams.set('format', format);
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
        });
      }
      const queryPath = `${url.pathname}${url.search}`;

      const response = await api.get(queryPath, { responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const blob = new Blob([response.data], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
        {loading ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px] z-20 animate-fadeIn">
          <button onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <FileText size={16} className="text-red-500" /> Download PDF
          </button>
          <button onClick={() => handleExport('excel')}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <Table size={16} className="text-green-500" /> Download Excel
          </button>
        </div>
      )}
    </div>
  );
}
