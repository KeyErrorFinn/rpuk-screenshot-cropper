export function formatFolderDate(folderName, locale = 'en-GB') {
    const match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(folderName)
    if (!match) return folderName
    const [, dayText, monthText, yearText] = match
    const day = Number(dayText)
    const month = Number(monthText)
    const year = 2000 + Number(yearText)
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
        return folderName
    return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}
