import { useQuery } from '@tanstack/react-query'

import { reportService } from '../services/report.service'

import type { AccuracyReportParams, DiseaseReportParams } from '../types/report.types'

export function useAccuracyReport(params?: AccuracyReportParams) {
  return useQuery({
    queryKey: ['super-admin-accuracy-report', params],
    queryFn: () => reportService.getAccuracy(params),
    staleTime: 60_000,
  })
}

export function useDiseaseReport(params?: DiseaseReportParams) {
  return useQuery({
    queryKey: ['super-admin-disease-report', params],
    queryFn: () => reportService.getDiseases(params),
    staleTime: 60_000,
  })
}
