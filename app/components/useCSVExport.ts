export function arrayToCSV(rows: (string|number)[][]){
  return rows.map(r => r.map(cell=>{
    const s = String(cell).replace(/"/g,'""');
    return /[",;\n]/.test(s) ? `"${s}"` : s;
  }).join(";")).join("\n");
}
export function downloadCSV(filename:string, csv:string){
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}