import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const INDUSTRIES = ['Banking', 'Healthcare', 'Retail', 'Government', 'Enterprise IT', 'Telecom'];
const USE_CASES = ['SSO', 'Workforce MFA', 'Passkeys', 'KYC / Identity Verification', 'Passwordless Login', 'Zero Trust Access', 'Customer Identity (CIAM)'];
const PERSONAS = ['CISO', 'IT/Security Architect', 'CTO', 'Business Stakeholder', 'Compliance Officer'];
const TECH_STACKS = ['1Kosmos', 'Okta', 'Ping Identity', 'Microsoft Entra', 'ForgeRock', 'Generic/Agnostic'];

const PRESETS = {
  banking: {
    industry: 'Banking',
    useCase: 'Passkeys + KYC / Identity Verification',
    persona: 'CISO',
    techStack: '1Kosmos',
    additionalContext: 'Customer wants to eliminate OTP fraud and streamline digital onboarding for retail banking customers.',
  },
  healthcare: {
    industry: 'Healthcare',
    useCase: 'Workforce MFA',
    persona: 'IT/Security Architect',
    techStack: '1Kosmos',
    additionalContext: 'Hospital with 8,000 clinical staff. EPIC EHR integration required. Need fast login for shared workstations.',
  },
  enterprise: {
    industry: 'Enterprise IT',
    useCase: 'SSO',
    persona: 'IT/Security Architect',
    techStack: '1Kosmos',
    additionalContext: 'Large enterprise migrating away from Okta. Wants unified identity with biometric MFA.',
  },
};

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy-800 border border-navy-600 text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-all"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export default function App() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [useCase, setUseCase] = useState(USE_CASES[0]);
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [techStack, setTechStack] = useState(TECH_STACKS[0]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy to Clipboard');
  const outputRef = useRef(null);
  const abortRef = useRef(null);

  const loadPreset = (key) => {
    const p = PRESETS[key];
    setIndustry(p.industry);
    setUseCase(p.useCase);
    setPersona(p.persona);
    setTechStack(p.techStack);
    setAdditionalContext(p.additionalContext);
  };

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setOutput('');
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, useCase, persona, techStack, additionalContext }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setOutput((prev) => prev + parsed.text);
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to generate demo script. Please try again.');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [industry, useCase, persona, techStack, additionalContext]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy to Clipboard'), 2000);
    } catch {
      setCopyLabel('Copy failed');
      setTimeout(() => setCopyLabel('Copy to Clipboard'), 2000);
    }
  };

  const exportPDF = async () => {
    if (!outputRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(outputRef.current, {
        scale: 2,
        backgroundColor: '#1e293b',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save('demo-script.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasOutput = output.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 border-b border-navy-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Demo<span className="text-electric-400">.AI</span>
              <span className="text-slate-400 font-normal text-lg ml-3">IAM Presales Assistant</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 italic">Turn inputs into winning demos in seconds</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            Powered by Claude
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Panel — Input Form */}
        <div className="space-y-5">
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-1">Configure Demo</h2>

            <SelectField label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES} />
            <SelectField label="Use Case" value={useCase} onChange={setUseCase} options={USE_CASES} />
            <SelectField label="Audience Persona" value={persona} onChange={setPersona} options={PERSONAS} />
            <SelectField label="Tech Stack / Product" value={techStack} onChange={setTechStack} options={TECH_STACKS} />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Additional Context</label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g. customer is migrating from legacy OTP, has 50k employees…"
                rows={3}
                className="w-full bg-navy-900 border border-navy-600 text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-all resize-none placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={generate}
              disabled={isStreaming}
              className="w-full bg-electric-500 hover:bg-electric-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all text-sm tracking-wide cursor-pointer"
            >
              {isStreaming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="streaming-dot">✦</span> Generating…
                </span>
              ) : (
                'Generate Demo Script'
              )}
            </button>
          </div>

          {/* Presets */}
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Presets</h3>
            <div className="space-y-2">
              {[
                { key: 'banking', icon: '🏦', label: 'Banking KYC + Passkeys' },
                { key: 'healthcare', icon: '🏥', label: 'Healthcare Workforce MFA' },
                { key: 'enterprise', icon: '🏢', label: 'Enterprise SSO' },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className="w-full text-left border border-navy-600 hover:border-electric-500 text-slate-300 hover:text-white rounded-lg px-4 py-2.5 transition-all text-sm cursor-pointer bg-transparent"
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Output */}
        <div className="flex flex-col min-h-0">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-4 mb-4 flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={generate}
                className="text-sm bg-red-800 hover:bg-red-700 text-red-100 px-3 py-1 rounded-md ml-4 shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!hasOutput && !isStreaming && !error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500 max-w-sm">
                <div className="text-5xl mb-4 opacity-40">✦</div>
                <p className="text-lg font-medium text-slate-400">Ready to generate</p>
                <p className="text-sm mt-1">Configure your demo parameters and click Generate, or pick a preset to get started.</p>
              </div>
            </div>
          )}

          {(hasOutput || isStreaming) && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Action Buttons */}
              {hasOutput && !isStreaming && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer"
                  >
                    📋 {copyLabel}
                  </button>
                  <button
                    onClick={exportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer"
                  >
                    📄 {isExporting ? 'Generating PDF…' : 'Export as PDF'}
                  </button>
                  <button
                    onClick={generate}
                    className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer"
                  >
                    🔄 Regenerate
                  </button>
                </div>
              )}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex items-center gap-2 text-electric-400 text-sm mb-3">
                  <span className="streaming-dot text-lg">✦</span> Generating demo script…
                </div>
              )}

              {/* Output Document */}
              <div className="bg-slate-800 rounded-xl border border-navy-700 p-6 md:p-8 overflow-y-auto flex-1">
                <div ref={outputRef} className="markdown-output">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
