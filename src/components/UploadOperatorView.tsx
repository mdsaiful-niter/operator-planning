import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  MachineRecord,
  OperatorRecord,
  ValidationReport,
} from '../types/planning';
import {
  downloadSampleOperatorTemplate,
  parseOperatorExcelFile,
} from '../utils/excelModule';
import { INITIAL_OPERATOR_DATA } from '../utils/sampleData';

interface UploadOperatorViewProps {
  operators: OperatorRecord[];
  machines: MachineRecord[];
  onUpdateOperators: (operators: OperatorRecord[]) => void;
  uploadedFileName: string | null;
  onSetUploadedFileName: (name: string | null) => void;
  validationReport: ValidationReport;
}

export const UploadOperatorView: React.FC<UploadOperatorViewProps> = ({
  operators,
  machines,
  onUpdateOperators,
  uploadedFileName,
  onSetUploadedFileName,
  validationReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Manual typing input state
  const [manualName, setManualName] = useState('');
  const [manualExp, setManualExp] = useState('');
  const [manualP1, setManualP1] = useState('');
  const [manualP2, setManualP2] = useState('');
  const [manualP3, setManualP3] = useState('');

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    setUploadSuccessMsg(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setUploadError(
        `Unsupported file format ".${ext || 'unknown'}". Please upload a valid Excel file (.xlsx or .xls).`
      );
      return;
    }

    try {
      const result = await parseOperatorExcelFile(file);
      if (result.missingColumns.length > 0) {
        setUploadError(
          `Missing required Excel column(s): ${result.missingColumns.join(
            ', '
          )}. Required columns are: Operator Name, Experience (Years), Machine Priority 1, Machine Priority 2, Machine Priority 3.`
        );
        return;
      }

      if (result.records.length === 0) {
        setUploadError('The uploaded Excel sheet contains no operator rows.');
        return;
      }

      onUpdateOperators(result.records);
      onSetUploadedFileName(file.name);
      setUploadSuccessMsg(
        `Loaded ${result.records.length} operator record(s) from "${file.name}" (Sheet: ${result.sheetName}).`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? `Failed to read Excel file: ${err.message}`
          : 'Failed to read the Excel file. Please ensure it is a valid .xlsx or .xls workbook.'
      );
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleFieldChange = (
    id: string,
    field: keyof Omit<OperatorRecord, 'id'>,
    rawValue: string
  ) => {
    const updated = operators.map((op) => {
      if (op.id !== id) return op;
      if (field === 'experience') {
        const numVal = rawValue.trim() === '' ? Number.NaN : Number(rawValue);
        return { ...op, experience: numVal };
      }
      return { ...op, [field]: rawValue };
    });
    onUpdateOperators(updated);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    const newRow: OperatorRecord = {
      id: `op-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      operatorName: manualName.trim(),
      experience: manualExp.trim() === '' ? Number.NaN : Number(manualExp),
      priority1: manualP1.trim(),
      priority2: manualP2.trim(),
      priority3: manualP3.trim(),
    };

    onUpdateOperators([...operators, newRow]);
    if (!uploadedFileName) {
      onSetUploadedFileName('Manual Input');
    }

    setManualName('');
    setManualExp('');
    setManualP1('');
    setManualP2('');
    setManualP3('');
  };

  const handleAddBlankRow = () => {
    const newRow: OperatorRecord = {
      id: `op-row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      operatorName: '',
      experience: 0,
      priority1: '',
      priority2: '',
      priority3: '',
    };
    onUpdateOperators([...operators, newRow]);
    if (!uploadedFileName) {
      onSetUploadedFileName('Manual Input');
    }
  };

  const handleDeleteRow = (id: string) => {
    const next = operators.filter((op) => op.id !== id);
    onUpdateOperators(next);
    if (next.length === 0) {
      onSetUploadedFileName(null);
    }
  };

  const handleClearData = () => {
    onUpdateOperators([]);
    onSetUploadedFileName(null);
    setUploadError(null);
    setUploadSuccessMsg(null);
  };

  const handleLoadSample = () => {
    onUpdateOperators(INITIAL_OPERATOR_DATA);
    onSetUploadedFileName('Sample_Operator_Information_Data.xlsx');
    setUploadError(null);
    setUploadSuccessMsg('Loaded sample operator dataset.');
  };

  const getRowErrors = (rowId: string) =>
    validationReport.errors.filter((e) => e.rowId === rowId);

  const rowLevelErrors = validationReport.errors.filter((e) => Boolean(e.rowId));

  const availableMachineNames = machines
    .map((m) => m.machineName.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Upload Card 2 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-blue-900">INPUT 02</span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Upload or Type Operator Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Required columns: Operator Name, Experience (Years), Machine Priority 1, Machine
              Priority 2, Machine Priority 3
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadSampleOperatorTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample Template (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load Sample Data
            </button>
            {operators.length > 0 && (
              <button
                type="button"
                onClick={handleClearData}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Data
              </button>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-5 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-700 bg-blue-50/60'
              : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload Operator Information Excel File"
          />
          <div className="mx-auto w-10 h-10 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900">
            Drag and drop your Operator Information Excel file here
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports Microsoft Excel <code className="font-mono">.xlsx</code> and{' '}
            <code className="font-mono">.xls</code> formats, or type records manually below using{' '}
            <strong className="text-slate-800">+</strong>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              {uploadedFileName ? 'Replace Excel File' : 'Browse Excel File'}
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-mono">{uploadedFileName || '-'}</span>
            </div>
          </div>
        </div>

        {/* Ranking Logic Callout */}
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900">Operator Suitability Rule:</strong> Priority 1
            always ranks above Priority 2, and Priority 2 always ranks above Priority 3. Within the
            same priority group, operators are ranked by Experience (descending). Experience never
            overrides machine priority.
          </div>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccessMsg && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Validation Status Panel (only shown when rows exist) */}
      {operators.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            validationReport.isValid
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {validationReport.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <div>
                <h3
                  className={`text-sm font-semibold ${
                    validationReport.isValid ? 'text-emerald-950' : 'text-red-950'
                  }`}
                >
                  {validationReport.isValid
                    ? `All ${operators.length} Operator Record(s) Validated Ready`
                    : `${rowLevelErrors.length} Validation Error(s) Found in Operator Data`}
                </h3>
                <p
                  className={`text-xs ${
                    validationReport.isValid ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {validationReport.isValid
                    ? 'Operator names, experience values, and machine preference columns are valid.'
                    : 'Correct the highlighted fields in the table below before generating operator rankings.'}
                </p>
              </div>
            </div>
          </div>

          {rowLevelErrors.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-red-200/80 pt-3 text-xs text-red-800">
              {rowLevelErrors.map((err) => (
                <li key={err.id} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold">•</span>
                  <span>{err.message}</span>
                </li>
              ))}
            </ul>
          )}

          {validationReport.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-amber-200/80 pt-3 text-xs text-amber-800">
              {validationReport.warnings.map((warn) => (
                <li key={warn.id} className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{warn.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Manual Data Input & Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Operator Information Data ({operators.length} rows)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Type operator preferences below and click the <strong>+</strong> button to add
              manually, or edit existing cells inline. Active machines:{' '}
              {availableMachineNames.length > 0 ? availableMachineNames.join(', ') : '-'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddBlankRow}
            aria-label="Add Blank Operator Row"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>

        <datalist id="machine-names-datalist">
          {availableMachineNames.map((mName) => (
            <option key={mName} value={mName} />
          ))}
        </datalist>

        {/* Manual Entry Form Bar with "+" Icon Button */}
        <form
          onSubmit={handleManualAddSubmit}
          className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
        >
          <div className="lg:col-span-3">
            <label
              htmlFor="manual-op-name"
              className="block text-[11px] font-semibold text-slate-700 mb-1"
            >
              Operator Name
            </label>
            <input
              id="manual-op-name"
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Rohim"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="manual-op-exp"
              className="block text-[11px] font-semibold text-slate-700 mb-1"
            >
              Experience (Years)
            </label>
            <input
              id="manual-op-exp"
              type="number"
              min={0}
              step="any"
              value={manualExp}
              onChange={(e) => setManualExp(e.target.value)}
              placeholder="e.g. 20"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="manual-op-p1"
              className="block text-[11px] font-semibold text-slate-700 mb-1"
            >
              Machine Priority 1
            </label>
            <input
              id="manual-op-p1"
              type="text"
              list="machine-names-datalist"
              value={manualP1}
              onChange={(e) => setManualP1(e.target.value)}
              placeholder="1st preference"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="manual-op-p2"
              className="block text-[11px] font-semibold text-slate-700 mb-1"
            >
              Machine Priority 2
            </label>
            <input
              id="manual-op-p2"
              type="text"
              list="machine-names-datalist"
              value={manualP2}
              onChange={(e) => setManualP2(e.target.value)}
              placeholder="2nd preference"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="manual-op-p3"
              className="block text-[11px] font-semibold text-slate-700 mb-1"
            >
              Machine Priority 3
            </label>
            <input
              id="manual-op-p3"
              type="text"
              list="machine-names-datalist"
              value={manualP3}
              onChange={(e) => setManualP3(e.target.value)}
              placeholder="3rd preference"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div className="lg:col-span-1 flex items-center justify-end">
            <button
              type="submit"
              data-testid="manual-add-operator-btn"
              aria-label="Add Operator Manually"
              title="Add Operator Record"
              className="w-full lg:w-10 h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="lg:hidden">Add Operator</span>
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4 text-right">Experience (Years)</th>
                <th className="py-3 px-4">Machine Priority 1</th>
                <th className="py-3 px-4">Machine Priority 2</th>
                <th className="py-3 px-4">Machine Priority 3</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
                <th className="py-3 px-4 text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {operators.length === 0 ? (
                <tr className="text-slate-400 font-mono">
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4 text-right">-</td>
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4 text-center">-</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={handleAddBlankRow}
                      aria-label="Add first operator row"
                      title="Add row"
                      className="inline-flex items-center justify-center p-1.5 text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ) : (
                operators.map((row, idx) => {
                  const rowErrors = getRowErrors(row.id);
                  const hasError = rowErrors.length > 0;

                  return (
                    <tr
                      key={row.id}
                      className={hasError ? 'bg-red-50/40' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          aria-label={`Row ${idx + 1} Operator Name`}
                          value={row.operatorName}
                          onChange={(e) =>
                            handleFieldChange(row.id, 'operatorName', e.target.value)
                          }
                          placeholder="Operator name"
                          className={`w-full max-w-[180px] px-2.5 py-1.5 rounded-md border text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 ${
                            rowErrors.some((e) => e.field === 'operatorName')
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={`Row ${idx + 1} Experience Years`}
                          value={Number.isNaN(row.experience) ? '' : row.experience}
                          onChange={(e) =>
                            handleFieldChange(row.id, 'experience', e.target.value)
                          }
                          className={`w-24 px-2.5 py-1.5 rounded-md border text-right text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 ${
                            rowErrors.some((e) => e.field === 'experience')
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          list="machine-names-datalist"
                          aria-label={`Row ${idx + 1} Machine Priority 1`}
                          value={row.priority1}
                          onChange={(e) =>
                            handleFieldChange(row.id, 'priority1', e.target.value)
                          }
                          placeholder="1st preference"
                          className={`w-full max-w-[160px] px-2.5 py-1.5 rounded-md border text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 ${
                            rowErrors.some((e) => e.field === 'priority1')
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          list="machine-names-datalist"
                          aria-label={`Row ${idx + 1} Machine Priority 2`}
                          value={row.priority2}
                          onChange={(e) =>
                            handleFieldChange(row.id, 'priority2', e.target.value)
                          }
                          placeholder="2nd preference"
                          className="w-full max-w-[160px] px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          list="machine-names-datalist"
                          aria-label={`Row ${idx + 1} Machine Priority 3`}
                          value={row.priority3}
                          onChange={(e) =>
                            handleFieldChange(row.id, 'priority3', e.target.value)
                          }
                          placeholder="3rd preference"
                          className="w-full max-w-[160px] px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {hasError ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Invalid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleAddBlankRow}
                            aria-label={`Add operator row after row ${idx + 1}`}
                            title="Add new row"
                            className="p-1.5 text-slate-400 hover:text-blue-900 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            aria-label={`Delete operator row ${row.operatorName || idx + 1}`}
                            title="Delete row"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
