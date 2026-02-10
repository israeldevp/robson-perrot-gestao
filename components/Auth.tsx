
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                setMessage('Verifique seu email para confirmar o cadastro!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-onyx flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-brand-concreteDark border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-onyx via-brand-gold to-brand-onyx opacity-50"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
                        <Lock className="w-8 h-8 text-brand-gold" />
                    </div>
                    <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
                        Barbearia Robson
                    </h1>
                    <p className="text-brand-muted text-xs font-bold uppercase tracking-[0.2em]">
                        Acesso Restrito
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">
                            Email
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-brand-onyx border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-brand-muted/30 focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all outline-none"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">
                            Senha
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-brand-onyx border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-brand-muted/30 focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 transition-all outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-red-500 text-xs font-bold">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                            <p className="text-green-500 text-xs font-bold">{message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gold-gradient text-brand-onyx font-display font-black text-sm uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            mode === 'login' ? 'Entrar' : 'Cadastrar'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login');
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-brand-muted hover:text-brand-gold text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        {mode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}
                    </button>
                </div>
            </div>
        </div>
    );
}
