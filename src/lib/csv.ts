export function downloadCSV(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>): void {
  if (!rows.length) {
    const blob = new Blob(['No records'], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(blob, filename)
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join(
    '\n',
  )
  triggerDownload(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }), filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}
