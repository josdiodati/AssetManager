export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

export default async function AssetLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assetType: { select: { name: true } },
      brand: { select: { name: true } },
      model: { select: { name: true } },
    },
  })

  if (!asset) notFound()

  const qrText = asset.assetTag + (asset.serialNumber ? '\nS/N: ' + asset.serialNumber : '')
  const qrDataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 2, errorCorrectionLevel: 'M' })

  const brandModel = [asset.brand?.name, asset.model?.name].filter(Boolean).join(' / ')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          color: black;
        }
        .label {
          width: 100%;
          max-width: 400px;
          margin: 40px auto;
          padding: 24px;
          border: 2px solid #000;
          border-radius: 8px;
          text-align: center;
        }
        .label img {
          display: block;
          margin: 0 auto 16px;
          width: 200px;
          height: 200px;
        }
        .asset-tag {
          font-family: monospace;
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .serial {
          font-size: 14px;
          color: #444;
          margin-bottom: 4px;
        }
        .meta {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
          .label {
            border: 2px solid #000;
            margin: 20px auto;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="label">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR Code" />
        <div className="asset-tag">{asset.assetTag}</div>
        {asset.serialNumber && (
          <div className="serial">S/N: {asset.serialNumber}</div>
        )}
        {asset.assetType?.name && (
          <div className="meta">{asset.assetType.name}</div>
        )}
        {brandModel && (
          <div className="meta">{brandModel}</div>
        )}
      </div>
    </>
  )
}
