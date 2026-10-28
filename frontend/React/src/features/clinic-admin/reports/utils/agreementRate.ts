interface AgreementCounts {
  vet_confirmed: number
  vet_changed: number
}

// Judged screenings only: pending reviews carry no verdict (ais_is_correct is
// null), and a reviewed row without a verdict falls in neither bucket, so the
// denominator is confirmed + changed rather than the reviewed count. Null
// means nothing has been judged yet; callers render that as "—".
// Rounded to one decimal to match how the other rate KPIs are displayed.
export function agreementRate(report: AgreementCounts): number | null {
  const judged = report.vet_confirmed + report.vet_changed
  if (judged === 0) return null
  return Math.round((report.vet_confirmed / judged) * 1000) / 10
}
