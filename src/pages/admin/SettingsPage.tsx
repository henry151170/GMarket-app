
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // 1. Update Profile Name
            if (fullName !== profile?.full_name) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: fullName })
                    .eq('id', user?.id);
                if (error) throw error;
            }

            // 2. Update Password if provided
            if (password) {
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden');
                }
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
            }

            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error updating settings:', err);
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fiori-header">Configuración</h1>
                    <p className="text-fiori-text-light">Gestiona tu perfil y preferencias del sistema</p>
                </div>
            </div>

            <div className="max-w-2xl">
                <div className="bg-white rounded-lg shadow-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <User className="w-5 h-5 text-fiori-blue" />
                        <h2 className="font-semibold text-gray-800">Mi Perfil</h2>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                        {message && (
                            <div className={`p-4 rounded-md flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {message.text}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        disabled
                                        className="fiori-input w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                                        value={user?.email || ''}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        className="fiori-input w-full"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Tu nombre..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                        {profile?.role || 'usuario'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 md:pt-0 md:pl-6 md:border-l border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-gray-400" />
                                    Cambiar Contraseña
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        className="fiori-input w-full"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Dejar en blanco para mantener"
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        className="fiori-input w-full"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repetir nueva contraseña"
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-fiori-blue text-white px-6 py-2 rounded-md hover:bg-fiori-blue-dark transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Información del Sistema</h3>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>Versión: 1.0.0 (Fase Final)</p>
                        <p>ID Organización: {user?.id}</p>
                        <p>Estado: Producción</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
