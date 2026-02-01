import React, { useEffect, useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Banknote, Coins, X } from 'lucide-react';

interface CashCountInputProps {
    onTotalChange: (total: number) => void;
}

const BILLS = [
    { value: 200, label: 'S/ 200', color: 'text-pink-400' },
    { value: 100, label: 'S/ 100', color: 'text-blue-400' },
    { value: 50, label: 'S/ 50', color: 'text-orange-400' },
    { value: 20, label: 'S/ 20', color: 'text-yellow-400' },
    { value: 10, label: 'S/ 10', color: 'text-green-400' },
];

const COINS = [
    { value: 5, label: 'S/ 5' },
    { value: 2, label: 'S/ 2' },
    { value: 1, label: 'S/ 1' },
    { value: 0.50, label: '0.50' },
    { value: 0.20, label: '0.20' },
    { value: 0.10, label: '0.10' },
];

export default function CashCountInput({ onTotalChange }: CashCountInputProps) {
    const [counts, setCounts] = useState<Record<number, number>>({});
    const [isOpen, setIsOpen] = useState(false);
    const [total, setTotal] = useState(0);

    const isMounted = React.useRef(false);

    useEffect(() => {
        // Skip the first run to prevent overwriting existing form data with 0
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        let t = 0;
        Object.entries(counts).forEach(([val, count]) => {
            t += Number(val) * (count || 0);
        });
        setTotal(t);
        onTotalChange(Number(t.toFixed(2)));
    }, [counts, onTotalChange]);

    const handleCountChange = (value: number, inputValue: string) => {
        const count = inputValue === '' ? 0 : parseInt(inputValue);
        if (isNaN(count)) return;
        setCounts(prev => ({ ...prev, [value]: count }));
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCounts({});
    };

    return (
        <div className="mt-4 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
            {/* Header / Toggle Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isOpen ? 'bg-slate-900/95 text-white border-b border-slate-700' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${isOpen ? 'bg-fiori-blue text-white' : 'bg-gray-100 text-gray-500'} transition-colors`}>
                        <Calculator className="w-4 h-4" />
                    </div>
                    <div className="text-left leading-tight">
                        <p className={`font-semibold text-sm ${isOpen ? 'text-white' : 'text-gray-800'}`}>Asistente de Arqueo</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {total > 0 && !isOpen && (
                        <span className="font-mono font-bold text-fiori-blue bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                            S/ {total.toFixed(2)}
                        </span>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            {/* Dark Panel Content */}
            {isOpen && (
                <div className="p-4 bg-slate-900 text-white animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Add local style to hide spinners */}
                    <style>{`
                        .no-spinner::-webkit-inner-spin-button, 
                        .no-spinner::-webkit-outer-spin-button { 
                            -webkit-appearance: none; 
                            margin: 0; 
                        }
                        .no-spinner { 
                            -moz-appearance: textfield; 
                        }
                    `}</style>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Billetes Area */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-1">
                                <Banknote className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billetes</h4>
                            </div>
                            {/* Changed to grid-cols-3 to widen cards */}
                            <div className="grid grid-cols-3 gap-3">
                                {BILLS.map((item) => (
                                    <div key={item.value} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center hover:border-slate-500 transition-colors">
                                        <span className={`text-[10px] font-bold mb-1 ${item.color}`}>{item.label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={counts[item.value] === 0 ? '' : counts[item.value]}
                                            placeholder="-"
                                            className="no-spinner w-full text-center text-xl font-bold text-white bg-transparent border-none p-0 focus:ring-0 placeholder-slate-600 outline-none"
                                            onChange={(e) => handleCountChange(item.value, e.target.value)}
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Monedas Area */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-1">
                                <Coins className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monedas</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {COINS.map((item) => (
                                    <div key={item.value} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center hover:border-slate-500 transition-colors">
                                        <span className="text-slate-400 text-[10px] font-medium mb-1">{item.label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={counts[item.value] === 0 ? '' : counts[item.value]}
                                            placeholder="-"
                                            className="no-spinner w-full text-center text-xl font-bold text-white bg-transparent border-none p-0 focus:ring-0 placeholder-slate-600 outline-none"
                                            onChange={(e) => handleCountChange(item.value, e.target.value)}
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Total */}
                    <div className="mt-5 pt-3 border-t border-slate-700 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Limpiar
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none mb-1">Total</span>
                                <span className="text-xl font-black text-green-400 tracking-tight block leading-none">S/ {total.toFixed(2)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="bg-fiori-blue hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-900/20"
                            >
                                OK
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
