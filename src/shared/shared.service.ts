// export function converterISOParaBR(dataISO: string): string {
//  if (!dataISO) return '';
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
//     return dataISO; // não é ISO, devolve original
//   }
//   const [ano, mes, dia] = dataISO.split('-');
//   return `${dia}/${mes}/${ano}`; // DD/MM/YYYY
// }

export function converterISOParaBR(dataISO: string): string {
  if (!dataISO) return '';

  const somenteData = dataISO.substring(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(somenteData)) {
    return dataISO;
  }

  const [ano, mes, dia] = somenteData.split('-');
  return `${dia}-${mes}-${ano}`;
}

export function formatarDataString(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  // return `${dia}-${mes}-${ano}`;
  return `${ano}-${mes}-${dia}`;
}

export function confirmarAcao(mensagem: string): boolean {
  return window.confirm(mensagem);
}
