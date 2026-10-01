-- El formulario de gastos administrativos guardaba el comprobante de pago con kind "factura".
UPDATE "RecurringCommitmentFile"
SET "kind" = 'comprobante_pago'
WHERE "kind" = 'factura';
