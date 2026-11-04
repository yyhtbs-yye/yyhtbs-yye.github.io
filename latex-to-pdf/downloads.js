export function downloadName(value, extension, page = 1, pageCount = 1) {
    const stem = value.trim().replace(/\.(pdf|svg)$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/, '') || 'document';
    const suffix = extension === 'svg' && pageCount > 1 ? `-page-${page}` : '';
    return `${stem}${suffix}.${extension}`;
}

export function downloadUrl(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
}
