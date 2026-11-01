import React, { useState, useEffect } from 'react';

// Cấu trúc 1 dòng trong phiếu xuất kho (dùng chung cho trang history + trang in)
export interface RowData {
    id: string | number;
    wh: string;
    code: string;
    name: string;
    unit: string;
    qty: number;
    note: string;
}

const PreviewPrintFile: React.FC<{ rows: RowData[] }> = ({ rows }) => {
    const [currentDate, setCurrentDate] = useState<string>('');
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    useEffect(() => {
        // Ngày hiện tại cho tiêu đề phiếu
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        setCurrentDate(`Ngày ${day} tháng ${month} năm ${year}`);
    }, []);

    const zoomIn = () => {
        if (zoomLevel < 1.6) setZoomLevel(prev => prev + 0.1);
    };

    const zoomOut = () => {
        if (zoomLevel > 0.4) setZoomLevel(prev => prev - 0.1);
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 font-[Times_New_Roman,Times,serif]">

            {/* Inline CSS mapped from HTML for print rules and A4 sizing */}
            <style>{`
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm 20mm 15mm 20mm;
                    margin: 20px auto;
                    background: #ffffff;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;
                    color: #000000;
                    line-height: 1.35;
                    font-size: 13pt;
                    display: flex;
                    flex-direction: column;
                }
                .content-body { flex-grow: 1; }
                .voucher-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    margin-bottom: 8px;
                    font-size: 11pt;
                }
                .voucher-table th, .voucher-table td {
                    border: 1px solid #000000;
                    padding: 5px 4px;
                    vertical-align: middle;
                    word-wrap: break-word;
                }
                .voucher-table th {
                    font-weight: bold;
                    text-align: center;
                    background-color: #fbfbfb;
                }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                .signature-footer {
                    margin-top: 40px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                @media print {
                    html, body {
                        margin: 0; padding: 0;
                        background-color: #ffffff;
                    }
                    .no-print { display: none !important; }
                    .a4-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        min-height: 260mm !important;
                        padding: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .print-zoom-reset { transform: none !important; }
                    .signature-footer { margin-top: auto !important; padding-top: 40px; }
                    @page { size: A4 portrait; margin: 10mm 15mm; }
                }
            `}</style>

            {/* Action Bar Controls */}
            <header className="no-print w-full bg-slate-800 text-white shadow-md sticky top-0 z-50 px-4 py-3">
                <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-file-invoice-dollar text-xl text-blue-400"></i>
                        <h1 className="font-sans font-semibold text-lg tracking-wide">Quản Lý PHIẾU XUẤT KHO</h1>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-sm font-sans">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-700 rounded-lg p-1 border border-slate-600">
                            <button onClick={zoomOut} className="px-2 py-1 hover:bg-slate-600 rounded text-slate-200" title="Thu nhỏ">
                                <i className="fa-solid fa-magnifying-glass-minus"></i>
                            </button>
                            <span className="px-2 font-mono text-xs text-blue-300">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={zoomIn} className="px-2 py-1 hover:bg-slate-600 rounded text-slate-200" title="Phóng to">
                                <i className="fa-solid fa-magnifying-glass-plus"></i>
                            </button>
                        </div>

                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-md transition shadow">
                            <i className="fa-solid fa-print"></i>
                            <span>In phiếu</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Document Container */}
            <div className="w-full flex justify-center overflow-x-auto py-6 px-2">
                <div className="print-zoom-reset" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                    <main className="a4-page">

                        <div className="content-body">
                            {/* Document Header Section */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-[62%] text-left">
                                    <div className="font-bold text-[11pt] uppercase tracking-tight">CÔNG TY CỔ PHẦN NƯỚC BIWASE LONG AN</div>
                                    <div className="text-[10.5pt] leading-tight mt-0.5">Thửa đất số 771, tờ bản đồ số 60, Quốc lộ 1A, ấp Nhị Thành 1, xã Thủ Thừa, tỉnh Tây Ninh</div>
                                    <div className="text-[10.5pt] mt-0.5">MST: 1101806214</div>
                                </div>

                                <div className="w-[36%] text-center text-[9.5pt] leading-snug">
                                    <div className="font-bold">Mẫu số 2</div>
                                    <div className="italic">
                                        (Kèm theo Thông tư số 99/2025/TT-BTC<br />
                                        ngày 27 tháng 10 năm 2025 của Bộ trưởng BTC)
                                    </div>
                                </div>
                            </div>

                            {/* Document Title */}
                            <div className="text-center my-4">
                                <h2 className="font-bold text-[18pt] tracking-wide mb-1 uppercase">PHIẾU XUẤT KHO</h2>
                                <div className="italic text-[11pt]">{currentDate}</div>
                                <div className="text-[11pt] mt-1">Số: <span className="font-bold">080</span></div>
                            </div>

                            {/* Recipient Details */}
                            <div className="space-y-1 mb-3 text-[11.5pt]">
                                <div className="flex">
                                    <span className="min-w-[170px]">Họ tên người nhận hàng:</span>
                                    <span className="font-bold flex-1">............................</span>
                                </div>
                                <div className="flex">
                                    <span className="min-w-[170px]">Địa chỉ:</span>
                                    <span className="flex-1">Nhà máy</span>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table className="voucher-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '10%' }}>KHO LƯU</th>
                                        <th style={{ width: '15%' }}>MÃ VẬT TƯ</th>
                                        <th style={{ width: '35%' }}>TÊN VẬT TƯ</th>
                                        <th style={{ width: '8%' }}>ĐVT</th>
                                        <th style={{ width: '12%' }}>SỐ LƯỢNG</th>
                                        <th style={{ width: '20%' }}>NỘI DUNG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 italic">Không có dữ liệu để in</td>
                                        </tr>
                                    ) : (
                                        rows.map((row) => (
                                            <tr key={row.id}>
                                                <td className="text-center">{row.wh}</td>
                                                <td className="text-center font-mono text-[10pt]">{row.code}</td>
                                                <td className="text-left">{row.name}</td>
                                                <td className="text-center">{row.unit}</td>
                                                <td className="text-right">{Number(row.qty).toFixed(2).replace('.', ',')}</td>
                                                <td className="text-left">{row.note}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures Grid */}
                        <div className="signature-footer grid grid-cols-5 gap-1 text-center text-[10.5pt] leading-tight">
                            <div className="flex flex-col justify-between min-h-[120px]">
                                <div>
                                    <div className="font-bold uppercase">NGƯỜI LẬP BIỂU</div>
                                    <div className="italic text-[9.5pt] mt-0.5">(Ký, ghi rõ họ, tên)</div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between min-h-[120px]">
                                <div>
                                    <div className="font-bold uppercase">NGƯỜI NHẬN HÀNG</div>
                                    <div className="italic text-[9.5pt] mt-0.5">(Ký, ghi rõ họ, tên)</div>
                                </div>
                                <div className="font-bold pb-2"></div>
                            </div>
                            <div className="flex flex-col justify-between min-h-[120px]">
                                <div>
                                    <div className="font-bold uppercase">THỦ KHO</div>
                                    <div className="italic text-[9.5pt] mt-0.5">(Ký, ghi rõ họ, tên)</div>
                                </div>
                                <div className="font-bold pb-2"></div>
                            </div>
                            <div className="flex flex-col justify-between min-h-[120px]">
                                <div>
                                    <div className="font-bold uppercase">KẾ TOÁN TRƯỞNG</div>
                                    <div className="italic text-[9.5pt] mt-0.5">(Ký, ghi rõ họ, tên)</div>
                                </div>
                                <div className="font-bold pb-2"></div>
                            </div>
                            <div className="flex flex-col justify-between min-h-[120px]">
                                <div>
                                    <div className="font-bold uppercase">TỔNG GIÁM ĐỐC</div>
                                    <div className="italic text-[9.5pt] mt-0.5">(Ký, ghi rõ họ, tên)</div>
                                </div>
                                <div className="font-bold pb-2"></div>
                            </div>
                        </div>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default PreviewPrintFile;