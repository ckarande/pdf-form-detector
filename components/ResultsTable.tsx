import React from 'react';
import { AnalysisStatus, PdfAnalysisResult } from '../types';
import { FileText, CheckCircle2, AlertCircle, Loader2, XCircle, FileInput } from 'lucide-react';

interface ResultsTableProps {
  results: PdfAnalysisResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Filename / URL</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-center">Fields</th>
              <th className="px-6 py-4">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 w-[50px]">
                  {result.status === AnalysisStatus.FETCHING && (
                    <div className="flex items-center text-blue-500" title="Fetching PDF...">
                       <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  {result.status === AnalysisStatus.ANALYZING && (
                    <div className="flex items-center text-purple-500" title="Analyzing with Gemini...">
                       <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  {result.status === AnalysisStatus.COMPLETED && result.isFillable && (
                    <div className="flex items-center text-green-600" title="Analysis Complete">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                   {result.status === AnalysisStatus.COMPLETED && !result.isFillable && (
                    <div className="flex items-center text-slate-500" title="Analysis Complete">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {result.status === AnalysisStatus.ERROR && (
                    <div className="flex items-center text-red-500" title="Error">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="font-medium text-slate-900 truncate" title={result.filename}>
                    {result.filename}
                  </div>
                  <div className="text-xs text-slate-400 truncate" title={result.url}>
                    {result.url}
                  </div>
                  {result.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">{result.errorMessage}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  {result.status === AnalysisStatus.COMPLETED ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.isFillable
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {result.isFillable ? (
                        <>
                          <FileInput className="w-3 h-3 mr-1" />
                          Fillable Form
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 mr-1" />
                          Read-only
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center font-mono text-slate-600">
                   {result.status === AnalysisStatus.COMPLETED ? result.fieldCount : '-'}
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-sm">
                   {result.status === AnalysisStatus.COMPLETED ? (
                       <p className="text-xs leading-relaxed">{result.summary}</p>
                   ) : (
                       <span className="text-slate-300">-</span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
