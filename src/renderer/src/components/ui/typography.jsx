import { cn } from "@renderer/lib/utils"

export function TGH1({ children, className, ...props }) {
    return <h1 {...props}
        className={cn("scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance", className)}
    >{children}</h1>
}

export function TGH2({ children, className, ...props }) {
    return <h2 {...props}
        className={cn("scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0", className)}
    >{children}</h2>
}

export function TGH3({ children, className, ...props }) {
    return <h3 {...props}
        className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
    >{children}</h3>
}

export function TGH4({ children, className, ...props }) {
    return <h4 {...props}
        className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
    >{children}</h4>
}

export function TGP({ children, className, ...props }) {
    return <p {...props}
        className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
    >{children}</p>
}

export function TGBlockquote({ children, className, ...props }) {
    return <blockquote {...props}
        className={cn("mt-6 border-l-2 pl-6 italic", className)}
    >{children}</blockquote>
}

// export function TGTable() {
//     return (
//         <div className="my-6 w-full overflow-y-auto">
//             <table className="w-full">
//                 <thead>
//                     <tr className="even:bg-muted m-0 border-t p-0">
//                         <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
//                             King's Treasury
//                         </th>
//                         <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
//                             People's happiness
//                         </th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     <tr className="even:bg-muted m-0 border-t p-0">
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Empty
//                         </td>
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Overflowing
//                         </td>
//                     </tr>
//                     <tr className="even:bg-muted m-0 border-t p-0">
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Modest
//                         </td>
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Satisfied
//                         </td>
//                     </tr>
//                     <tr className="even:bg-muted m-0 border-t p-0">
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Full
//                         </td>
//                         <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
//                             Ecstatic
//                         </td>
//                     </tr>
//                 </tbody>
//             </table>
//         </div>
//     )
// }

export function TGList({ children, className, ...props }) {
    return <ul {...props}
        className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
    >{children}</ul>
}

export function TGInlineCode({ children, className, ...props }) {
    return <code {...props}
        className={cn("bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold", className)}
    >{children}</code>
}

export function TGLarge({ children, className, ...props }) {
    return <div {...props}
        className={cn("text-lg font-semibold", className)}
    >{children}</div>
}

export function TGSmall({ children, className, ...props }) {
    return <small {...props}
        className={cn("text-sm leading-none font-medium", className)}
    >{children}</small>
}

export function TGMuted({ children, className, ...props }) {
    return <p {...props}
        className="text-muted-foreground text-sm"
    >{children}</p>
}

