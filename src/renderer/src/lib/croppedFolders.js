export const reconcileCroppedFolderSummaries = (previousFolders, summaries) =>
    Object.fromEntries(
        summaries.map(({ folderName, imageCount, uploadedCount, contentSignature }) => {
            const previous = previousFolders[folderName]
            const unchanged = previous?.loaded && previous.contentSignature === contentSignature
            return [
                folderName,
                unchanged
                    ? { ...previous, uploadedCount: uploadedCount ?? 0, contentSignature }
                    : {
                          loaded: false,
                          uploadedCount: uploadedCount ?? 0,
                          contentSignature,
                          images: Array(imageCount).fill(null)
                      }
            ]
        })
    )
