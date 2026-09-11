import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function exportGapAnalysisPdf(course, analysis) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Gap Analysis Report', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text('IndustryPulse — Curriculum-Job Market Alignment Platform', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, y, { align: 'center' })
  y += 12

  doc.setDrawColor(79, 70, 229)
  doc.setLineWidth(0.5)
  doc.line(14, y, pageWidth - 14, y)
  y += 10

  doc.setTextColor(0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(course.name, 14, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`${course.institution_type} · ${course.duration}`, 14, y)
  y += 12

  const score = analysis.relevance_score
  const scoreColor = score >= 50 ? [22, 163, 74] : score >= 25 ? [217, 119, 6] : [220, 38, 38]

  doc.setFillColor(...scoreColor)
  doc.roundedRect(14, y, pageWidth - 28, 24, 3, 3, 'F')
  doc.setTextColor(255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Market Relevance: ${Math.round(score)}%`, 20, y + 10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${analysis.covered_skills.length} skills aligned · ${analysis.skill_gaps.length} gaps · ${analysis.low_demand_skills.length} low demand`,
    20, y + 18
  )
  y += 34

  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, y)
  y += 7

  doc.autoTable({
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Curriculum Skills', String(analysis.curriculum_skills.length)],
      ['In-Demand & Covered', String(analysis.covered_skills.length)],
      ['Skill Gaps (Missing)', String(analysis.skill_gaps.length)],
      ['Low Market Demand Skills', String(analysis.low_demand_skills.length)],
      ['Market Relevance Score', `${Math.round(score)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 12

  if (analysis.skill_gaps.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text('Skill Gaps — Missing from Curriculum', 14, y)
    y += 2

    const gapRows = analysis.skill_gaps.map(g => [
      g.skill_name,
      g.priority?.toUpperCase() || 'N/A',
      String(g.posting_count || g.demand_frequency || 0),
      g.category || '-',
    ])

    doc.autoTable({
      startY: y + 4,
      head: [['Skill', 'Priority', 'Job Postings', 'Category']],
      body: gapRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: {
          cellWidth: 22,
          fontStyle: 'bold',
        },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = data.cell.raw
          if (val === 'HIGH') data.cell.styles.textColor = [220, 38, 38]
          else if (val === 'MEDIUM') data.cell.styles.textColor = [217, 119, 6]
          else data.cell.styles.textColor = [100, 100, 100]
        }
      },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 12
  }

  if (analysis.covered_skills.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text('Covered Skills — Curriculum Meets Market Demand', 14, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 163, 74)
    const coveredText = analysis.covered_skills.join('  ·  ')
    const lines = doc.splitTextToSize(coveredText, pageWidth - 28)
    doc.text(lines, 14, y)
    y += lines.length * 4 + 8
  }

  if (analysis.low_demand_skills.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text('Low Market Demand — Consider Reviewing', 14, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(217, 119, 6)
    const lowText = analysis.low_demand_skills.join('  ·  ')
    const lowLines = doc.splitTextToSize(lowText, pageWidth - 28)
    doc.text(lowLines, 14, y)
    y += lowLines.length * 4 + 8
  }

  if (analysis.demanded_skills?.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text('Top Employer-Demanded Skills', 14, y)
    y += 2

    const demandRows = analysis.demanded_skills.slice(0, 20).map(s => [
      s.skill,
      String(s.count),
      analysis.covered_skills.some(c => c.toLowerCase() === s.skill.toLowerCase()) ? 'Covered' : 'Gap',
    ])

    doc.autoTable({
      startY: y + 4,
      head: [['Skill', 'Job Postings', 'Status']],
      body: demandRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'Covered') data.cell.styles.textColor = [22, 163, 74]
          else data.cell.styles.textColor = [220, 38, 38]
        }
      },
      margin: { left: 14, right: 14 },
    })
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `IndustryPulse · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  const filename = `Gap_Analysis_${course.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(filename)
}
