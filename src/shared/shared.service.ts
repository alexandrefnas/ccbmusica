export function converterISOParaBR(dataISO: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
    return dataISO; // não é ISO, devolve original
  }
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`; // DD/MM/YYYY
}
