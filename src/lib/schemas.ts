import { z } from 'zod';

export const incomeSchema = z.object({
    fecha: z.string().min(1, "La fecha es requerida"),
    totalFacturas: z.coerce.number().min(0),
    totalBoletas: z.coerce.number().min(0),
    totalNotas: z.coerce.number().min(0),
    totalCosto: z.coerce.number().min(0).default(0),
    pagos: z.object({
        efectivo: z.coerce.number().min(0),
        efectivoUbicacion: z.enum(['hand', 'bank']).optional(),
        yape: z.coerce.number().min(0),
        tarjeta: z.coerce.number().min(0),
        transferencia: z.coerce.number().min(0),
    }),
    totalGastos: z.number().default(0), // New field for validation
    observaciones: z.string().optional(),
    // Tolerance Fields
    differenceAmount: z.number().default(0),
    differenceReason: z.string().optional(),
    differenceNote: z.string().optional(),
    responsible_person: z.string().min(1, "Debe seleccionar un responsable").optional(),
}).refine((data) => {
    const totalDia = data.totalFacturas + data.totalBoletas + data.totalNotas;
    const totalPagos = data.pagos.efectivo + data.pagos.yape + data.pagos.tarjeta + data.pagos.transferencia + (data.totalGastos || 0); // Include expenses
    const diff = Math.abs(totalDia - totalPagos);

    // 1. Exact Match (diff < 0.01) -> Valid
    if (diff < 0.01) return true;

    // 2. Tolerance (diff <= 3.00) -> Valid (Warning handled in UI)
    if (diff <= 3.00) return true;

    // 3. Major Difference (diff > 3.00) -> Requires Reason
    if (diff > 3.00) {
        return !!data.differenceReason && data.differenceReason.length > 0;
    }

    return false;
}, {
    message: "Para diferencias mayores a S/ 3.00, debe ingresar un motivo de diferencia.",
    path: ["differenceReason"], // Attach error to reason field
}).refine((data) => {
    if (data.pagos.efectivo > 0 && !data.pagos.efectivoUbicacion) {
        return false;
    }
    return true;
}, {
    message: "Debe seleccionar la ubicación del Efectivo (Mano o Banco)",
    path: ["pagos.efectivoUbicacion"],
});

export type IncomeFormData = z.infer<typeof incomeSchema>;
