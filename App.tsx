import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FileSearch, UploadCloud, Download, AlertTriangle, Wand2, Info, FileInput, FileText, CheckCircle2 } from 'lucide-react';
import { AnalysisStatus, PdfAnalysisResult } from './types';
import { parseUrls, fetchPdfAsBase64 } from './services/fileUtils';
import { analyzePdfContent } from './services/geminiService';
import ResultsTable from './components/ResultsTable';

const App: React.FC = () => {
  const [inputUrls, setInputUrls] = useState('');
  const [results, setResults] = useState<PdfAnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const processUrls = async () => {
    const urls = parseUrls(inputUrls);
    if (urls.length === 0) {
      alert("Please enter at least one valid URL (http/https).");
      return;
    }

    setIsProcessing(true);
    setResults([]); // Clear previous results
    setProgress({ current: 0, total: urls.length });

    const newResults: PdfAnalysisResult[] = urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      url,
      filename: 'Pending...',
      status: AnalysisStatus.IDLE
    }));
    
    setResults(newResults);

    // Process sequentially to manage rate limits and browser resources better
    for (let i = 0; i < newResults.length; i++) {
        const item = newResults[i];
        
        // Update to fetching
        updateResultStatus(item.id, { status: AnalysisStatus.FETCHING });
        
        try {
            // 1. Fetch PDF
            const { base64, filename } = await fetchPdfAsBase64(item.url);
            updateResultStatus(item.id, { filename, status: AnalysisStatus.ANALYZING });

            // 2. Analyze with Gemini
            const analysis = await analyzePdfContent(base64);

            // 3. Complete
            updateResultStatus(item.id, {
                status: AnalysisStatus.COMPLETED,
                isFillable: analysis.isFillable,
                fieldCount: analysis.fieldCount,
                summary: analysis.summary
            });

        } catch (error) {
            updateResultStatus(item.id, {
                status: AnalysisStatus.ERROR,
                errorMessage: error instanceof Error ? error.message : "Unknown error"
            });
        }

        setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsProcessing(false);
  };

  const updateResultStatus = (id: string, updates: Partial<PdfAnalysisResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const downloadExcel = () => {
    if (results.length === 0) return;

    const data = results.map(r => ({
      Filename: r.filename,
      URL: r.url,
      Status: r.status === AnalysisStatus.COMPLETED ? (r.isFillable ? 'Fillable Form' : 'Read-only') : r.status,
      'Field Count': r.fieldCount || 0,
      Summary: r.summary || '',
      Error: r.errorMessage || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PDF Analysis");
    XLSX.writeFile(workbook, "PDF_Analysis_Report.xlsx");
  };

  // Compute statistics
  const stats = useMemo(() => {
    const completed = results.filter(r => r.status === AnalysisStatus.COMPLETED);
    const total = results.length;
    const fillable = completed.filter(r => r.isFillable).length;
    const readOnly = completed.filter(r => !r.isFillable).length;
    return { total, fillable, readOnly };
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSearch className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">PDF Form Detector AI</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Powered by Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
           <div className="flex flex-col md:flex-row gap-8 items-start">
             <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Analyze PDF Documents</h2>
                <p className="text-slate-600 leading-relaxed">
                  Paste a list of PDF URLs below. Our AI will download each document and strictly determine if it is an 
                  <strong> Interactive Fillable Form</strong> (digitally editable) or a <strong>Static Document</strong>.
                </p>
                <p className="text-slate-600 leading-relaxed text-sm">
                   Note: Forms designed for printing and handwriting (flat forms) will be classified as <strong>Read-only</strong>. Only files with active, clickable input fields are considered fillable.
                </p>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Note on CORS:</strong> Ensure the PDF URLs allow Cross-Origin Resource Sharing (CORS). 
                    URLs from many public websites may be blocked by the browser's security policy. 
                    Testing with your own hosted files or CORS-enabled storage is recommended.
                  </p>
                </div>
             </div>

             <div className="w-full md:w-1/2 space-y-4">
                <div className="relative">
                  <textarea
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm shadow-inner"
                    placeholder="https://example.com/interactive-form.pdf&#10;https://example.com/printable-form.pdf&#10;https://example.com/contract.pdf"
                    value={inputUrls}
                    onChange={(e) => setInputUrls(e.target.value)}
                    disabled={isProcessing}
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded">
                     One URL per line
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={processUrls}
                    disabled={isProcessing || !inputUrls.trim()}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg
                      ${isProcessing || !inputUrls.trim()
                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'}`}
                  >
                    {isProcessing ? (
                      <>
                        <Wand2 className="w-5 h-5 animate-spin" />
                        Analyzing ({progress.current}/{progress.total})...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" />
                        Start Analysis
                      </>
                    )}
                  </button>
                </div>
             </div>
           </div>
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Analysis Results</h3>
              <button
                onClick={downloadExcel}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium text-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Report (.xlsx)
              </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Files</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg text-green-600">
                  <FileInput className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Fillable Forms</p>
                  <p className="text-2xl font-bold text-green-600">{stats.fillable}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Read-only</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.readOnly}</p>
                </div>
              </div>
            </div>

            <ResultsTable results={results} />
          </section>
        )}
        
        {/* Empty State / Guidance */}
        {results.length === 0 && !isProcessing && (
           <div className="text-center py-12 opacity-40">
              <FileSearch className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500 font-medium">Ready to inspect documents</p>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;