import { z } from 'zod'
export { IPC_CHANNELS } from './ipcChannels.js'

const path = z.string().trim().min(1).max(32767)
const child = z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine(
        (value) => !value.includes('/') && !value.includes('\\') && value !== '.' && value !== '..',
        'Invalid path segment'
    )
const imageReference = z.object({ folder: child, name: child })
const cropInsets = z.object({
    top: z.number().nonnegative(),
    right: z.number().nonnegative(),
    bottom: z.number().nonnegative(),
    left: z.number().nonnegative(),
    referenceWidth: z.number().positive().optional(),
    referenceHeight: z.number().positive().optional()
})
const settings = z.object({
    screenshotFolderPath: path,
    destinationFolderPath: path,
    keepOriginalImage: z.boolean(),
    gyazoAccessToken: z.string().max(4096).optional(),
    gyazoAccessTokenEncrypted: z.string().max(16384).optional(),
    cropInsets,
    cropPresets: z.record(z.string(), cropInsets).optional()
})

export const ipcSchemas = Object.freeze({
    sourceRoot: z.tuple([path]),
    sourceFile: z.tuple([path, child]),
    croppedRoot: z.tuple([path]),
    croppedFolder: z.tuple([path, child]),
    croppedFile: z.tuple([path, child, child]),
    preferenceGet: z.tuple([
        z.enum([
            'walkthroughComplete',
            'cropRecoveryNotice',
            'workspacePreferences',
            'activityHistory'
        ])
    ]),
    preferenceSet: z.tuple([
        z.enum([
            'walkthroughComplete',
            'cropRecoveryNotice',
            'workspacePreferences',
            'activityHistory'
        ]),
        z.unknown()
    ]),
    settings: z.tuple([settings]),
    noArguments: z.tuple([]),
    boolean: z.tuple([z.boolean()]),
    text: z.tuple([z.string().min(1).max(1_000_000)]),
    importFiles: z.tuple([z.array(path).max(100)]),
    upload: z.tuple([path, z.string().max(4096), z.array(imageReference).max(1000)]),
    tags: z.tuple([path, child, child, z.array(z.string().trim().min(1).max(40)).max(50)]),
    images: z.tuple([path, z.array(imageReference).max(1000)]),
    batch: z.tuple([z.string().trim().min(1).max(128)]),
    crop: z.tuple([
        path,
        path,
        z.boolean(),
        z.array(child).min(1).max(1000),
        z
            .object({
                cropInsets: cropInsets.optional(),
                cropPresets: z.record(z.string(), cropInsets).optional()
            })
            .optional()
    ])
})

export function parseIpcArguments(schema, args) {
    const result = schema.safeParse(args)
    if (result.success) return result.data
    const error = new Error(result.error.issues[0]?.message || 'Invalid IPC request')
    error.code = 'INVALID_IPC_ARGUMENTS'
    throw error
}
