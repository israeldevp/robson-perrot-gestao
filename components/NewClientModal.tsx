
import React, { useState } from 'react';
import { X, User, Phone, Check } from 'lucide-react';

interface NewClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, phone: string) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim(), phone.trim());
            setName('');
            setPhone('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-brand-onyx/95 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full sm:w-96 bg-brand-concrete border-t sm:border border-white/10 rounded-t-2xl sm:rounded-xl shadow-2xl transform transition-transform animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 overflow-visible flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-brand-gold"></div>
                        <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">Novo Cliente</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-md text-brand-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                            <User className="w-3 h-3" /> Nome Completo
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: João Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-brand-onyx border border-white/10 rounded-lg py-4 px-4 text-white font-sans text-lg focus:border-brand-gold focus:ring-0 transition-all placeholder-brand-muted/30"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Celular
                        </label>
                        <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-brand-onyx border border-white/10 rounded-lg py-4 px-4 text-white font-mono text-lg focus:border-brand-gold focus:ring-0 transition-all placeholder-brand-muted/20"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gold-gradient text-brand-onyx font-display font-black text-sm uppercase tracking-widest py-4 rounded-lg hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-brand-gold/10 flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" /> Cadastrar Cliente
                    </button>
                </form>
            </div>
        </div>
    );
};
