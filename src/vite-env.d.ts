/// <reference types="vite/client" />

declare module 'html2pdf.js' {
    interface Html2PdfOptions {
        margin?: number | number[]
        filename?: string
        image?: { type?: string; quality?: number }
        html2canvas?: { scale?: number;[key: string]: unknown }
        jsPDF?: { unit?: string; format?: string; orientation?: string;[key: string]: unknown }
    }
    interface Html2PdfInstance {
        set(options: Html2PdfOptions): Html2PdfInstance
        from(element: HTMLElement | null): Html2PdfInstance
        save(): Promise<void>
    }
    function html2pdf(): Html2PdfInstance
    export = html2pdf
}
