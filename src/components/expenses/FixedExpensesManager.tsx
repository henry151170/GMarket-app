import { useState, useEffect } from 'react';
import { useFixedExpenses, type FixedExpenseTemplate } from '../../hooks/useFixedExpenses';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { useExpenseConcepts } from '../../hooks/useExpenseConcepts';
import { Plus, Trash2, Save, Calendar, Tag, Settings, X, Pencil } from 'lucide-react';

interface FixedExpensesManagerProps {
    onExpensesGenerated?: () => void;
}

export default function FixedExpensesManager({ onExpensesGenerated }: FixedExpensesManagerProps) {
    const { fetchTemplates, createTemplate, deleteTemplate, generateExpensesForPeriod } = useFixedExpenses();
    const { categories, createCategory, updateCategory, deleteCategory } = useExpenseCategories();
    const { concepts, createConcept, updateConcept, deleteConcept } = useExpenseConcepts();

    const [templates, setTemplates] = useState<FixedExpenseTemplate[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Managers State
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);

    const [showConceptManager, setShowConceptManager] = useState(false);
    const [newConceptName, setNewConceptName] = useState('');
    const [editingConcept, setEditingConcept] = useState<{ id: string, name: string } | null>(null);

    // Form State
    const [newTemplate, setNewTemplate] = useState<{
        title: string;
        amount: string;
        category: string;
        day_of_month: number;
        currency: 'PEN' | 'USD';
    }>({
        title: '',
        amount: '',
        category: '',
        day_of_month: 1,
        currency: 'PEN'
    });

    const load = async () => {
        const data = await fetchTemplates();
        setTemplates(data || []);
    };

    useEffect(() => {
        load();
    }, []);

    // Set defaults
    useEffect(() => {
        if (isCreating) {
            if (categories.length > 0 && !newTemplate.category) {
                setNewTemplate(prev => ({ ...prev, category: categories[0].name }));
            }
            if (concepts.length > 0 && !newTemplate.title) {
                setNewTemplate(prev => ({ ...prev, title: concepts[0].name }));
            }
        }
    }, [categories, concepts, isCreating]);

    const handleCreate = async () => {
        if (!newTemplate.title || !newTemplate.amount) return;

        const success = await createTemplate({
            title: newTemplate.title,
            amount: Number(newTemplate.amount),
            category: newTemplate.category,
            day_of_month: newTemplate.day_of_month,
            currency: newTemplate.currency
        });

        if (success) {
            setIsCreating(false);
            setNewTemplate({ title: '', amount: '', category: '', day_of_month: 1, currency: 'PEN' });
            load();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            await deleteTemplate(id);
            load();
        }
    };

    // Category Handlers
    const handleSaveCategory = async () => {
        const name = editingCategory ? editingCategory.name : newCategoryName;
        if (!name.trim()) return;

        if (editingCategory) {
            await updateCategory(editingCategory.id, name);
            setEditingCategory(null);
        } else {
            await createCategory(name, true);
            setNewCategoryName('');
        }
    };

    const startEditCategory = (c: { id: string, name: string }) => {
        setEditingCategory(c);
        setNewCategoryName(''); // Clear create input just in case
    };

    const cancelEditCategory = () => {
        setEditingCategory(null);
    };

    // Concept Handlers
    const handleSaveConcept = async () => {
        const name = editingConcept ? editingConcept.name : newConceptName;
        if (!name.trim()) return;

        if (editingConcept) {
            await updateConcept(editingConcept.id, name);
            setEditingConcept(null);
        } else {
            await createConcept(name);
            setNewConceptName('');
        }
    };

    const startEditConcept = (c: { id: string, name: string }) => {
        setEditingConcept(c);
        setNewConceptName('');
    };

    const cancelEditConcept = () => {
        setEditingConcept(null);
    };

    return (
        <div className="bg-white rounded-lg shadow-card p-6 relative">
            {/* Category Manager Modal */}
            {showCategoryManager && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 rounded-lg flex flex-col animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800">Gestionar Categorías</h4>
                        <button onClick={() => { setShowCategoryManager(false); setEditingCategory(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <input
                            className="fiori-input w-full text-sm"
                            placeholder={editingCategory ? "Editar categoría..." : "Nueva categoría..."}
                            value={editingCategory ? editingCategory.name : newCategoryName}
                            onChange={e => editingCategory ? setEditingCategory({ ...editingCategory, name: e.target.value }) : setNewCategoryName(e.target.value)}
                        />
                        <button onClick={handleSaveCategory} className="fiori-btn fiori-btn-primary px-3">
                            {editingCategory ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                        {editingCategory && (
                            <button onClick={cancelEditCategory} className="fiori-btn fiori-btn-secondary px-3">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                        {categories.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                                <span className="text-sm text-gray-700">{c.name}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => startEditCategory(c)}
                                        className="text-blue-400 hover:text-blue-600 p-1"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`¿Eliminar categoría "${c.name}"?`)) deleteCategory(c.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Concept Manager Modal */}
            {showConceptManager && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 rounded-lg flex flex-col animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800">Gestionar Conceptos</h4>
                        <button onClick={() => { setShowConceptManager(false); setEditingConcept(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <input
                            className="fiori-input w-full text-sm"
                            placeholder={editingConcept ? "Editar concepto..." : "Nuevo concepto..."}
                            value={editingConcept ? editingConcept.name : newConceptName}
                            onChange={e => editingConcept ? setEditingConcept({ ...editingConcept, name: e.target.value }) : setNewConceptName(e.target.value)}
                        />
                        <button onClick={handleSaveConcept} className="fiori-btn fiori-btn-primary px-3">
                            {editingConcept ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                        {editingConcept && (
                            <button onClick={cancelEditConcept} className="fiori-btn fiori-btn-secondary px-3">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                        {concepts.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                                <span className="text-sm text-gray-700">{c.name}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => startEditConcept(c)}
                                        className="text-blue-400 hover:text-blue-600 p-1"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`¿Eliminar concepto "${c.name}"?`)) deleteConcept(c.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-fiori-blue" />
                        Plantillas de Gastos Fijos
                    </h3>
                    <p className="text-sm text-gray-500">Define los gastos que se repiten cada mes.</p>
                </div>
                <button
                    onClick={async () => {
                        const date = new Date();
                        const monthName = date.toLocaleString('es-ES', { month: 'long' });
                        if (confirm(`¿Generar los gastos fijos correspondientes a ${monthName.toUpperCase()} en el historial?\n\nSe crearán como pendientes con la fecha configurada en cada plantilla.`)) {
                            const { success, count } = await generateExpensesForPeriod(date.getMonth() + 1, date.getFullYear());
                            if (success) {
                                alert(`Se generaron ${count} gastos correctamente.`);
                                if (onExpensesGenerated) onExpensesGenerated();
                            } else {
                                alert('Hubo un error al generar los gastos.');
                            }
                        }
                    }}
                    className="fiori-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm mr-2"
                >
                    <Calendar className="w-4 h-4" /> Exportar al Historial
                </button>
                <button
                    onClick={() => setIsCreating(true)}
                    className="fiori-btn fiori-btn-primary flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" /> Nuevo
                </button>
            </div>

            {/* CREATE FORM */}
            {isCreating && (
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-sm text-blue-800 mb-3">Nueva Plantilla</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1 flex justify-between">
                                Concepto
                                <button onClick={() => setShowConceptManager(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    <Settings className="w-3 h-3" /> Editar lista
                                </button>
                            </label>
                            <select
                                className="fiori-input w-full text-sm"
                                value={newTemplate.title}
                                onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {concepts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Monto Aprox.</label>
                            <div className="relative">
                                <select
                                    className="absolute left-1 top-1 text-xs border-none bg-transparent font-bold text-gray-500 focus:ring-0 p-0 h-6"
                                    value={newTemplate.currency}
                                    onChange={e => setNewTemplate({ ...newTemplate, currency: e.target.value as any })}
                                >
                                    <option value="PEN">S/</option>
                                    <option value="USD">$</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="fiori-input w-full pl-12 text-sm"
                                    value={newTemplate.amount}
                                    onChange={e => setNewTemplate({ ...newTemplate, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Día de Pago</label>
                            <input
                                type="number"
                                min="1" max="31"
                                className="fiori-input w-full text-sm"
                                value={newTemplate.day_of_month}
                                onChange={e => setNewTemplate({ ...newTemplate, day_of_month: Number(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1 flex justify-between">
                                Categoría
                                <button onClick={() => setShowCategoryManager(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    <Settings className="w-3 h-3" /> Editar lista
                                </button>
                            </label>
                            <select
                                className="fiori-input w-full text-sm"
                                value={newTemplate.category}
                                onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 flex items-end gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!newTemplate.title || !newTemplate.amount}
                                className="fiori-btn fiori-btn-primary flex-1 justify-center text-sm"
                            >
                                <Save className="w-4 h-4 mr-2" /> Guardar
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="fiori-btn fiori-btn-secondary flex-1 justify-center text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST */}
            <div className="space-y-3">
                {templates.length === 0 && !isCreating ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-dashed">
                        No hay plantillas creadas.
                    </div>
                ) : (
                    templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow group">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {t.day_of_month}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{t.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Tag className="w-3 h-3" />
                                        <span>{t.category}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-gray-700 text-sm">~ {t.currency === 'USD' ? '$' : 'S/'} {Number(t.amount).toFixed(2)}</span>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar plantilla"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
