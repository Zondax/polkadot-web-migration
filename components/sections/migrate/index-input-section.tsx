import { Minus, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RangeField, ScanType } from '@/lib/types/scan'
import { RangeFieldEnum, SCAN_LIMITS, ScanTypeEnum } from '@/lib/types/scan'
import { adjustIndexValue, getIndexCount, getPluralForm, isRangeExceedsLimit } from '@/lib/utils/scan-indices'

interface IndexInputSectionProps {
  title: string
  helpText: string
  scanType: ScanType
  singleValue: string
  rangeStart: string
  rangeEnd: string
  onScanTypeChange: (type: ScanType) => void
  onSingleChange: (value: string) => void
  onRangeChange: (field: RangeField, value: string) => void
  testIdPrefix: string
  unitSingular?: string
  unitPlural?: string
}

export function IndexInputSection({
  title,
  helpText,
  scanType,
  singleValue,
  rangeStart,
  rangeEnd,
  onScanTypeChange,
  onSingleChange,
  onRangeChange,
  testIdPrefix,
  unitSingular = 'index',
  unitPlural,
}: IndexInputSectionProps) {
  const indexCount = getIndexCount(scanType, rangeStart, rangeEnd)
  const exceedsLimit = scanType === ScanTypeEnum.RANGE && isRangeExceedsLimit(rangeStart, rangeEnd)

  const handleAdjust = (field: 'single' | RangeField, increment: number) => {
    if (field === 'single') {
      onSingleChange(adjustIndexValue(singleValue, increment))
    } else {
      const currentValue = field === RangeFieldEnum.START ? rangeStart : rangeEnd
      const min =
        field === RangeFieldEnum.END ? Math.max(Number.parseInt(rangeStart, 10) || 0, SCAN_LIMITS.MIN_INDEX) : SCAN_LIMITS.MIN_INDEX
      onRangeChange(field, adjustIndexValue(currentValue, increment, min))
    }
  }

  const getSingleMinValue = () => SCAN_LIMITS.MIN_INDEX

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">{title}</div>
        <Tabs value={scanType} onValueChange={value => onScanTypeChange(value as ScanType)} data-testid={`${testIdPrefix}-tabs`}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={ScanTypeEnum.SINGLE} data-testid={`${testIdPrefix}-single-tab`}>
              Single {title.split(' ')[0]}
            </TabsTrigger>
            <TabsTrigger value={ScanTypeEnum.RANGE} data-testid={`${testIdPrefix}-range-tab`}>
              {title.split(' ')[0]} Range
            </TabsTrigger>
          </TabsList>

          <TabsContent value={ScanTypeEnum.SINGLE} className="space-y-2 mt-4">
            <label htmlFor={`${testIdPrefix}-index`} className="sr-only">
              {title}
            </label>
            <div className="flex items-center justify-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAdjust('single', -1)}
                disabled={Number.parseInt(singleValue, 10) <= getSingleMinValue()}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id={`${testIdPrefix}-index`}
                type="number"
                min={getSingleMinValue()}
                value={singleValue}
                onChange={e => onSingleChange(e.target.value)}
                className="text-center"
                placeholder={SCAN_LIMITS.DEFAULT_SINGLE.toString()}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAdjust('single', 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{helpText}</p>
          </TabsContent>

          <TabsContent value={ScanTypeEnum.RANGE} className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor={`${testIdPrefix}-start-index`} className="text-sm font-medium">
                  Start Index
                </label>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjust(RangeFieldEnum.START, -1)}
                    disabled={Number.parseInt(rangeStart, 10) <= SCAN_LIMITS.MIN_INDEX}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id={`${testIdPrefix}-start-index`}
                    type="number"
                    min={SCAN_LIMITS.MIN_INDEX}
                    value={rangeStart}
                    onChange={e => onRangeChange(RangeFieldEnum.START, e.target.value)}
                    className="text-center"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAdjust(RangeFieldEnum.START, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${testIdPrefix}-end-index`} className="text-sm font-medium">
                  End Index
                </label>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjust(RangeFieldEnum.END, -1)}
                    disabled={Number.parseInt(rangeEnd, 10) <= Number.parseInt(rangeStart, 10)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id={`${testIdPrefix}-end-index`}
                    type="number"
                    min={rangeStart}
                    value={rangeEnd}
                    onChange={e => onRangeChange(RangeFieldEnum.END, e.target.value)}
                    className="text-center"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAdjust(RangeFieldEnum.END, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scanning {indexCount} {getPluralForm(indexCount, unitSingular, unitPlural)}
              {scanType === ScanTypeEnum.RANGE && unitSingular === 'address' && ' per account'}
            </p>

            {exceedsLimit && (
              <Alert>
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  Large {unitSingular} ranges may take a long time to scan. Consider smaller ranges for better performance.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
