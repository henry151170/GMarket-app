
import { Construction } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-blue-50 text-fiori-blue rounded-full flex items-center justify-center mb-6">
                <Construction className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-fiori-header mb-2">{title}</h2>
            <p className="text-gray-500 max-w-md">{description}</p>
            <div className="mt-8 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                Próximamente en la Fase 3
            </div>
        </div>
    );
}
