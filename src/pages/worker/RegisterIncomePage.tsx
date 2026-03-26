import { useState } from 'react';
import IncomeForm from '../../components/incomes/IncomeForm';

export default function RegisterIncomePage() {
    // We can use a simple counter to force re-render if needed, 
    // but if IncomeForm doesn't actually use it for fetching, we can simplify.
    // However, keeping the pattern for now but fixing the key usage.
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div className="container mx-auto max-w-4xl pt-4">
            <IncomeForm refreshTrigger={refreshTrigger} />
        </div>
    );
}
