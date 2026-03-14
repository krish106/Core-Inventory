import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

export default function LabelPrinter({ product, quantity = 21 }) {
  const componentRef = useRef();
  
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Labels-${product?.sku}`,
  });

  if (!product) return null;

  // A4 sheet usually holds 3x7 standard label stickers (21 total)
  const labels = Array(quantity).fill(product);

  return (
    <div>
      <button 
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <Printer size={18} />
        Print Labels
      </button>

      {/* Hidden printable area */}
      <div style={{ display: 'none' }}>
        <div ref={componentRef} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
          <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {labels.map((item, i) => (
              <div key={i} className="border border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center break-inside-avoid" style={{ width: '60mm', height: '35mm', boxSizing: 'border-box' }}>
                <p className="font-bold text-xs truncate w-full mb-1 text-center">{item.name}</p>
                <img 
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/barcode/generate?text=${encodeURIComponent(item.barcode || item.sku)}`} 
                  alt="barcode"
                  className="h-10 object-contain my-1"
                />
                <div className="flex justify-between w-full px-2 mt-1">
                  <span className="text-[10px] text-gray-600">{item.sku}</span>
                  <span className="text-[10px] font-bold">₹{item.selling_price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
